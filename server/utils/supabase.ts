/**
 * Supabase Database Utilities for Nuxt/TypeScript
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database'

let supabase: SupabaseClient<Database> | null = null

/**
 * Get or create Supabase client instance (singleton pattern)
 * Uses server-side service role key for full database access
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabase) {
    const config = useRuntimeConfig()
    
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error(
        'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
      )
    }

    supabase = createClient<Database>(
      config.supabaseUrl,
      config.supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: {
          schema: 'public'
        }
      }
    )
  }
  
  return supabase
}

/**
 * Helper: Get games with team names (common query)
 */
export async function getGamesWithTeams(filters: {
  leagueKey?: string
  status?: string
  startDate?: string
  endDate?: string
  limit?: number
} = {}) {
  const supabase = getSupabase()
  
  let query = supabase
    .from('games')
    .select(`
      *,
      home_team:teams!home_team_id(id, name, league_key),
      away_team:teams!away_team_id(id, name, league_key)
    `)
  
  if (filters.leagueKey) {
    query = query.eq('league_key', filters.leagueKey)
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.startDate) {
    query = query.gte('date', filters.startDate)
  }
  
  if (filters.endDate) {
    query = query.lte('date', filters.endDate)
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit)
  }
  
  query = query.order('date', { ascending: true })
  
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`)
  }
  
  return data
}

/**
 * Helper: Get predictions with game details
 */
export async function getPredictionsWithGames(filters: {
  leagueKey?: string
  modelVersion?: string
  minConfidence?: number
  upcoming?: boolean
  limit?: number
} = {}) {
  const supabase = getSupabase()
  
  let query = supabase
    .from('predictions')
    .select(`
      *,
      game:games(
        *,
        home_team:teams!home_team_id(id, name, league_key),
        away_team:teams!away_team_id(id, name, league_key)
      )
    `)
  
  if (filters.modelVersion) {
    query = query.eq('model_version', filters.modelVersion)
  }
  
  if (filters.minConfidence) {
    query = query.gte('confidence', filters.minConfidence)
  }
  
  if (filters.upcoming) {
    // Filter for upcoming games only
    query = query
      .filter('game.status', 'eq', 'scheduled')
      .filter('game.date', 'gte', new Date().toISOString())
  }
  
  if (filters.leagueKey) {
    query = query.filter('game.league_key', 'eq', filters.leagueKey)
  }
  
  if (filters.limit) {
    query = query.limit(filters.limit)
  }
  
  query = query.order('created_at', { ascending: false })
  
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Failed to fetch predictions: ${error.message}`)
  }
  
  return data
}

/**
 * Helper: Get wallet with statistics
 */
export async function getWalletWithStats(walletId: number = 1) {
  const supabase = getSupabase()

  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('id', walletId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch wallet: ${error.message}`)
  }

  const [{ count: totalBets }, { count: pendingBets }] = await Promise.all([
    supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId),
    supabase.from('bets').select('*', { count: 'exact', head: true }).eq('wallet_id', walletId).eq('status', 'pending'),
  ])

  return { ...wallet, totalBets: totalBets || 0, pendingBets: pendingBets || 0 }
}

/**
 * Helper: Create or update prediction
 */
export async function upsertPrediction(prediction: {
  game_id: number
  model_version: string
  prediction: string
  confidence: number
  home_win_prob?: number
  draw_prob?: number
  away_win_prob?: number
  over25_prob?: number
  under25_prob?: number
  odds_home?: number
  odds_draw?: number
  odds_away?: number
  expected_value?: number
  kelly_percentage?: number
  model_details?: any
}) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('predictions')
    .upsert(prediction, {
      onConflict: 'game_id,model_version'
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to upsert prediction: ${error.message}`)
  }
  
  return data
}

/**
 * Helper: Place a bet
 */
export async function placeBet(bet: {
  wallet_id: number
  game_id: number
  prediction_id?: number
  bet_type: string
  stake: number
  odds: number
  predicted_prob?: number
  expected_value?: number
  kelly_percentage?: number
  notes?: string
}) {
  const supabase = getSupabase()

  // Optimistic-lock pattern: SELECT current balance, then UPDATE with an equality guard.
  // If another concurrent bet deducted the balance between our SELECT and UPDATE,
  // the .eq('balance', snapshot) predicate will match zero rows and we reject.
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, balance')
    .eq('id', bet.wallet_id)
    .gte('balance', bet.stake) // pre-check: fail fast if clearly insufficient
    .maybeSingle()

  if (!wallet) {
    throw new Error('Insufficient balance or wallet not found')
  }

  // Attempt atomic deduction: only succeeds if balance is still exactly what we read
  const { data: updateRows, error: updateError } = await supabase
    .from('wallets')
    .update({ balance: wallet.balance - bet.stake })
    .eq('id', bet.wallet_id)
    .eq('balance', wallet.balance) // optimistic lock — rejects on concurrent modification
    .select('id')

  if (updateError || !updateRows?.length) {
    throw new Error('Insufficient balance or concurrent modification — please retry')
  }

  // Insert bet record now that balance is safely deducted
  const { data, error } = await supabase
    .from('bets')
    .insert({
      ...bet,
      status: 'pending',
      placed_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    // Compensate: restore balance if bet insert fails
    await supabase
      .from('wallets')
      .update({ balance: wallet.balance })
      .eq('id', bet.wallet_id)
    throw new Error(`Failed to place bet: ${error.message}`)
  }

  return data
}

/**
 * Helper: Settle a bet
 */
export async function settleBet(
  betId: number,
  status: 'won' | 'lost' | 'void',
  profit: number
) {
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('bets')
    .update({
      status,
      profit,
      settled_at: new Date().toISOString()
    })
    .eq('id', betId)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to settle bet: ${error.message}`)
  }
  
  // Wallet stats are updated automatically via trigger
  return data
}

/**
 * Type exports for database schema
 */
export type { Database } from '~/types/database'
