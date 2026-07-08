import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
import { getSupabase } from '~/server/utils/supabase'
import { signUserToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Email and password are required' })
  }

  const supabase = getSupabase()

  try {
    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .maybeSingle()

    if (error || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
    }

    // Verify password — support both bcrypt and legacy SHA256
    let isValid = false
    if (user.password_hash.startsWith('$2')) {
      // bcrypt hash
      isValid = await bcrypt.compare(password, user.password_hash)
    } else {
      // Legacy SHA256 hash
      const sha256Hash = createHash('sha256').update(password).digest('hex')
      isValid = user.password_hash === sha256Hash

      // Auto-upgrade to bcrypt on successful legacy login
      if (isValid) {
        const newHash = await bcrypt.hash(password, 10)
        await supabase.from('users').update({ password_hash: newHash }).eq('id', user.id)
      }
    }

    if (!isValid) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid email or password' })
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Create session
    const sessionToken = generateSessionId()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    await supabase
      .from('sessions')
      .insert({
        token: sessionToken,
        user_id: user.id,
        expires_at: expiresAt.toISOString()
      })

    // Set session cookie (legacy path — used by SSR + same-origin requests)
    setCookie(event, 'session_id', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    })

    // Issue Supabase-compatible JWT (HS256) so direct supabase-js calls from
    // the browser / Capacitor APK pass RLS via `Authorization: Bearer <token>`.
    const supabaseToken = signUserToken(user.id)

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        display_name: user.display_name,
        role: user.role,
        onboarding_completed: user.onboarding_completed ?? false,
        preferred_sports: user.preferred_sports ?? [],
        preferred_wallet_id: user.preferred_wallet_id,
        timezone: user.timezone
      },
      access_token: supabaseToken
    }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Login error:', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})

function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  for (const b of bytes) id += chars[b % chars.length]
  return id + '_' + Date.now().toString(36)
}
