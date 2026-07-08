/**
 * GET /api/sports
 * Returns available sports with their leagues, grouped by country.
 * Used by the onboarding wizard and leagues page for dynamic rendering.
 */
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async () => {
  const supabase = getSupabase()

  // Fetch active sports
  const { data: sports, error: sErr } = await supabase
    .from('sports')
    .select('key, name, is_active')
    .eq('is_active', true)
    .order('name')

  if (sErr) {
    throw createError({ statusCode: 500, statusMessage: sErr.message })
  }

  // Fetch all leagues — only those that have games in the last 2 seasons
  const { data: leagues, error: lErr } = await supabase
    .from('leagues')
    .select('key, name, sport, country, flag')
    .order('country')
    .order('name')

  if (lErr) {
    throw createError({ statusCode: 500, statusMessage: lErr.message })
  }

  // Fetch available wallets (admin wallets users can follow)
  const { data: wallets, error: wErr } = await supabase
    .from('wallets')
    .select('id, name, balance, initial_balance, total_bets, win_rate, is_active')
    .eq('is_active', true)
    .order('name')

  // Group leagues by sport, then by country
  const sportLeagues: Record<string, Record<string, any[]>> = {}
  for (const s of (sports || [])) {
    sportLeagues[s.key] = {}
  }

  for (const l of (leagues || [])) {
    const sport = l.sport || 'football'
    if (!sportLeagues[sport]) sportLeagues[sport] = {}
    const country = l.country || 'Other'
    if (!sportLeagues[sport][country]) sportLeagues[sport][country] = []
    sportLeagues[sport][country].push({
      key: l.key,
      name: l.name,
      flag: l.flag || null
    })
  }

  return {
    sports: (sports || [])
      .map(s => ({
        key: s.key,
        name: s.name,
        icon: s.key === 'football' ? '⚽' : s.key === 'basketball' ? '🏀' : '🏅',
        leagues: sportLeagues[s.key] || {}
      }))
      .filter(s => Object.keys(s.leagues).length > 0),  // only sports with active leagues
    wallets: (wallets || []).map(w => ({
      id: w.id,
      name: w.name,
      roi: w.initial_balance > 0 ? Math.round(((w.balance - w.initial_balance) / w.initial_balance) * 10000) / 100 : 0,
      win_rate: w.win_rate,
      total_bets: w.total_bets,
      is_active: w.is_active
    }))
  }
})
