import bcrypt from 'bcryptjs'
import { getSupabase } from '~/server/utils/supabase'
import { initializeUserCredits } from '~/server/utils/credits'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, password, name } = body

  // --- Validation ---
  if (!email || !password || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Email, password, and name are required' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email format' })
  }

  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters long' })
  }

  if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw createError({ statusCode: 400, statusMessage: 'Password must contain at least one uppercase letter and one number' })
  }

  if (name.trim().length < 2 || name.trim().length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Name must be between 2 and 50 characters' })
  }

  const supabase = getSupabase()

  try {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      throw createError({ statusCode: 409, statusMessage: 'Email already registered' })
    }

    // Hash password with bcrypt (10 rounds)
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert new user
    const { data: user, error: insertErr } = await supabase
      .from('users')
      .insert({
        username: email.toLowerCase().trim().split('@')[0],
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        name: name.trim(),
        display_name: name.trim(),
        role: 'user',
        is_active: true,
        onboarding_completed: false,
        preferred_sports: [],
        notification_prefs: { picks: true, results: true, news: false }
      })
      .select('id, email, name, display_name, role, onboarding_completed, preferred_sports, preferred_wallet_id, timezone, created_at')
      .single()

    if (insertErr || !user) {
      console.error('User insert error:', JSON.stringify(insertErr, null, 2))
      throw createError({ statusCode: 500, statusMessage: `Failed to create account: ${insertErr?.message || 'unknown error'}` })
    }

    // Create session
    const sessionId = generateSessionId()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30-day session

    await supabase
      .from('sessions')
      .insert({
        token: sessionId,
        user_id: user.id,
        expires_at: expiresAt.toISOString()
      })

    // Set session cookie
    setCookie(event, 'session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/'
    })

    // Auto-create a default wallet for the new user
    try {
      const { data: wallet } = await supabase
        .from('wallets')
        .insert({
          name: `${name.trim()}'s Wallet`,
          balance: 1000.00,
          initial_balance: 1000.00,
          user_id: user.id,
          is_active: true
        })
        .select('id')
        .single()

      if (wallet) {
        await supabase
          .from('users')
          .update({ preferred_wallet_id: wallet.id })
          .eq('id', user.id)
        user.preferred_wallet_id = wallet.id
      }
    } catch (walletErr) {
      console.error('Failed to create user wallet (non-fatal):', walletErr)
    }

    // Initialize credit balance with signup bonus
    try {
      const signupBonus = await initializeUserCredits(user.id)
      console.log(`Awarded ${signupBonus} signup credits to user ${user.id}`)
    } catch (creditErr) {
      console.error('Failed to initialize credits (non-fatal):', creditErr)
    }

    return { user }
  } catch (error: any) {
    if (error.statusCode) throw error

    console.error('Registration error:', error)
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
