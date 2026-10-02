import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { APIRequestContext, Page } from '@playwright/test'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readEnv(): Record<string, string> {
  const text = readFileSync(join(ROOT, '.env'), 'utf8')
  return Object.fromEntries(
    text.split('\n')
      .filter(l => /^[A-Z_]+=/.test(l))
      .map(l => [l.split('=')[0], l.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')]),
  )
}

const b64 = (x: string | Buffer) => Buffer.from(x).toString('base64')
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

/** The HS256 token the app itself issues (iss 'protero'), signed with the local secret. */
export function mintToken(): string {
  const secret = readEnv().SUPABASE_JWT_SECRET
  if (!secret) throw new Error('SUPABASE_JWT_SECRET missing from protero-frontend/.env')
  const now = Math.floor(Date.now() / 1000)
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64(JSON.stringify({ iss: 'protero', sub: '1', role: 'authenticated', user_id: 1, iat: now, exp: now + 3600 }))
  const sig = b64(createHmac('sha256', secret).update(`${head}.${body}`).digest())
  return `${head}.${body}.${sig}`
}

/**
 * Sign in the way the app really does: a Bearer JWT in localStorage and NO cookie. A
 * DB-injected `session_id` cookie passes on pages whose endpoints read the cookie and hides
 * a 401 on the ones that send the Bearer header.
 */
export async function signIn(page: Page): Promise<void> {
  const token = mintToken()
  await page.addInitScript(t => localStorage.setItem('protero.access_token', t), token)
}

/** A request that is a data read: Nitro `/api`, PostgREST `/rest/v1`, or an Edge Function `/functions/v1`. */
export const isDataRequest = (url: string) => /\/api\/|\/rest\/v1\/|\/functions\/v1\//.test(url)

/** Calls an Edge Function the way the browser does: the app's own Bearer token plus the project's public key. */
export async function edgeCall(request: APIRequestContext, name: string, body: Record<string, unknown> = {}, token = mintToken()) {
  const env = readEnv()
  return request.post(`${env.SUPABASE_URL}/functions/v1/${name}`, {
    headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY },
    data: body,
  })
}
