/**
 * Supabase-compatible HS256 JWT signing & verification.
 *
 * We sign tokens with the project's `SUPABASE_JWT_SECRET` so they pass
 * Supabase RLS verification when sent as `Authorization: Bearer <token>`.
 *
 * Implemented with Node's built-in `crypto` (no extra deps).
 *
 * Token claims:
 *   {
 *     iss: 'protero',
 *     sub: '<user_id as string>',
 *     role: 'authenticated',
 *     user_id: <int>,        // consumed by public.auth_user_id() in RLS
 *     iat: <unix>,
 *     exp: <unix>
 *   }
 */

import { createHmac, timingSafeEqual } from 'crypto'

const ISSUER = 'protero'
const ALG = 'HS256'
const TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface AuthClaims {
  iss: string
  sub: string
  role: 'authenticated' | 'service_role'
  user_id: number
  iat: number
  exp: number
}

function getSecret(): string {
  const config = useRuntimeConfig()
  const secret = config.supabaseJwtSecret as string | undefined
  if (!secret) {
    throw new Error(
      'SUPABASE_JWT_SECRET is not configured. Set it in your .env file.'
    )
  }
  return secret
}

function base64urlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  const b64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64')
}

/**
 * Sign a JWT for the given user. Returns the compact-serialised token.
 */
export function signUserToken(userId: number, ttlSeconds: number = TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000)
  const claims: AuthClaims = {
    iss: ISSUER,
    sub: String(userId),
    role: 'authenticated',
    user_id: userId,
    iat: now,
    exp: now + ttlSeconds,
  }

  const header = { alg: ALG, typ: 'JWT' }
  const headerB64 = base64urlEncode(JSON.stringify(header))
  const payloadB64 = base64urlEncode(JSON.stringify(claims))
  const signingInput = `${headerB64}.${payloadB64}`
  const signature = createHmac('sha256', getSecret()).update(signingInput).digest()
  const sigB64 = base64urlEncode(signature)
  return `${signingInput}.${sigB64}`
}

/**
 * Verify a JWT and return its claims. Throws on invalid signature, expired
 * token, wrong issuer, or malformed input.
 */
export function verifyUserToken(token: string): AuthClaims {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Malformed JWT')
  }
  const [headerB64, payloadB64, sigB64] = parts

  const expectedSig = createHmac('sha256', getSecret())
    .update(`${headerB64}.${payloadB64}`)
    .digest()
  const providedSig = base64urlDecode(sigB64)

  if (
    expectedSig.length !== providedSig.length ||
    !timingSafeEqual(expectedSig, providedSig)
  ) {
    throw new Error('Invalid JWT signature')
  }

  const header = JSON.parse(base64urlDecode(headerB64).toString('utf8'))
  if (header.alg !== ALG) {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`)
  }

  const claims = JSON.parse(base64urlDecode(payloadB64).toString('utf8')) as AuthClaims
  const now = Math.floor(Date.now() / 1000)
  if (claims.exp && claims.exp < now) {
    throw new Error('JWT expired')
  }
  if (claims.iss !== ISSUER) {
    throw new Error(`Unexpected JWT issuer: ${claims.iss}`)
  }
  if (typeof claims.user_id !== 'number') {
    throw new Error('JWT missing user_id claim')
  }

  return claims
}

/**
 * Extract a Bearer token from an H3 event's Authorization header.
 * Returns null when the header is absent or malformed.
 */
export function extractBearerToken(authHeader: string | undefined | null): string | null {
  if (!authHeader) return null
  const m = /^Bearer\s+(.+)$/i.exec(authHeader)
  return m ? m[1].trim() : null
}
