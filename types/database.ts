/**
 * Supabase Database Types
 * 
 * Auto-generated TypeScript types for database schema
 * Update with: npx supabase gen types typescript --project-id <project-id>
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: number
          name: string
          league_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          league_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          league_key?: string
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: number
          home_team_id: number
          away_team_id: number
          league_key: string
          season: string
          round: number | null
          date: string
          status: string
          home_goals: number | null
          away_goals: number | null
          home_xg: number | null
          away_xg: number | null
          home_possession: number | null
          away_possession: number | null
          home_lineup_strength: number | null
          away_lineup_strength: number | null
          home_lineup_consistency: number | null
          away_lineup_consistency: number | null
          external_id: string | null
          source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          home_team_id: number
          away_team_id: number
          league_key: string
          season: string
          round?: number | null
          date: string
          status?: string
          home_goals?: number | null
          away_goals?: number | null
          home_xg?: number | null
          away_xg?: number | null
          home_possession?: number | null
          away_possession?: number | null
          home_lineup_strength?: number | null
          away_lineup_strength?: number | null
          home_lineup_consistency?: number | null
          away_lineup_consistency?: number | null
          external_id?: string | null
          source?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          home_team_id?: number
          away_team_id?: number
          league_key?: string
          season?: string
          round?: number | null
          date?: string
          status?: string
          home_goals?: number | null
          away_goals?: number | null
          home_xg?: number | null
          away_xg?: number | null
          home_possession?: number | null
          away_possession?: number | null
          home_lineup_strength?: number | null
          away_lineup_strength?: number | null
          home_lineup_consistency?: number | null
          away_lineup_consistency?: number | null
          external_id?: string | null
          source?: string
          created_at?: string
          updated_at?: string
        }
      }
      lineups: {
        Row: {
          id: number
          game_id: number
          team_id: number
          player_name: string
          position: string | null
          minutes_played: number | null
          goals: number
          assists: number
          yellow_cards: number
          red_cards: number
          created_at: string
        }
        Insert: {
          id?: number
          game_id: number
          team_id: number
          player_name: string
          position?: string | null
          minutes_played?: number | null
          goals?: number
          assists?: number
          yellow_cards?: number
          red_cards?: number
          created_at?: string
        }
        Update: {
          id?: number
          game_id?: number
          team_id?: number
          player_name?: string
          position?: string | null
          minutes_played?: number | null
          goals?: number
          assists?: number
          yellow_cards?: number
          red_cards?: number
          created_at?: string
        }
      }
      model_versions: {
        Row: {
          id: number
          version: string
          name: string
          description: string | null
          features_used: Json | null
          ensemble_weights: Json | null
          accuracy: number | null
          home_accuracy: number | null
          draw_accuracy: number | null
          away_accuracy: number | null
          over25_accuracy: number | null
          btts_accuracy: number | null
          brier_score: number | null
          log_loss: number | null
          roi: number | null
          win_rate: number | null
          avg_odds: number | null
          total_bets: number
          profitable_bets: number
          trained_on: string | null
          tested_on: string | null
          training_date: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          version: string
          name: string
          description?: string | null
          features_used?: Json | null
          ensemble_weights?: Json | null
          accuracy?: number | null
          home_accuracy?: number | null
          draw_accuracy?: number | null
          away_accuracy?: number | null
          over25_accuracy?: number | null
          btts_accuracy?: number | null
          brier_score?: number | null
          log_loss?: number | null
          roi?: number | null
          win_rate?: number | null
          avg_odds?: number | null
          total_bets?: number
          profitable_bets?: number
          trained_on?: string | null
          tested_on?: string | null
          training_date?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          version?: string
          name?: string
          description?: string | null
          features_used?: Json | null
          ensemble_weights?: Json | null
          accuracy?: number | null
          home_accuracy?: number | null
          draw_accuracy?: number | null
          away_accuracy?: number | null
          over25_accuracy?: number | null
          btts_accuracy?: number | null
          brier_score?: number | null
          log_loss?: number | null
          roi?: number | null
          win_rate?: number | null
          avg_odds?: number | null
          total_bets?: number
          profitable_bets?: number
          trained_on?: string | null
          tested_on?: string | null
          training_date?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      predictions: {
        Row: {
          id: number
          game_id: number
          model_version: string
          prediction: string
          confidence: number
          home_win_prob: number | null
          draw_prob: number | null
          away_win_prob: number | null
          over25_prob: number | null
          under25_prob: number | null
          btts_prob: number | null
          odds_home: number | null
          odds_draw: number | null
          odds_away: number | null
          odds_over25: number | null
          odds_under25: number | null
          expected_value: number | null
          kelly_percentage: number | null
          result_correct: boolean | null
          brier_score: number | null
          model_details: Json | null
          created_at: string
          validated_at: string | null
        }
        Insert: {
          id?: number
          game_id: number
          model_version?: string
          prediction: string
          confidence: number
          home_win_prob?: number | null
          draw_prob?: number | null
          away_win_prob?: number | null
          over25_prob?: number | null
          under25_prob?: number | null
          btts_prob?: number | null
          odds_home?: number | null
          odds_draw?: number | null
          odds_away?: number | null
          odds_over25?: number | null
          odds_under25?: number | null
          expected_value?: number | null
          kelly_percentage?: number | null
          result_correct?: boolean | null
          brier_score?: number | null
          model_details?: Json | null
          created_at?: string
          validated_at?: string | null
        }
        Update: {
          id?: number
          game_id?: number
          model_version?: string
          prediction?: string
          confidence?: number
          home_win_prob?: number | null
          draw_prob?: number | null
          away_win_prob?: number | null
          over25_prob?: number | null
          under25_prob?: number | null
          btts_prob?: number | null
          odds_home?: number | null
          odds_draw?: number | null
          odds_away?: number | null
          odds_over25?: number | null
          odds_under25?: number | null
          expected_value?: number | null
          kelly_percentage?: number | null
          result_correct?: boolean | null
          brier_score?: number | null
          model_details?: Json | null
          created_at?: string
          validated_at?: string | null
        }
      }
      wallets: {
        Row: {
          id: number
          name: string
          balance: number
          initial_balance: number
          total_profit: number
          roi: number
          total_bets: number
          total_won: number
          total_lost: number
          win_rate: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name?: string
          balance?: number
          initial_balance?: number
          total_profit?: number
          roi?: number
          total_bets?: number
          total_won?: number
          total_lost?: number
          win_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          balance?: number
          initial_balance?: number
          total_profit?: number
          roi?: number
          total_bets?: number
          total_won?: number
          total_lost?: number
          win_rate?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      bets: {
        Row: {
          id: number
          wallet_id: number
          game_id: number
          prediction_id: number | null
          bet_type: string
          stake: number
          odds: number
          predicted_prob: number | null
          expected_value: number | null
          kelly_percentage: number | null
          status: string
          profit: number | null
          notes: string | null
          placed_at: string
          settled_at: string | null
        }
        Insert: {
          id?: number
          wallet_id: number
          game_id: number
          prediction_id?: number | null
          bet_type: string
          stake: number
          odds: number
          predicted_prob?: number | null
          expected_value?: number | null
          kelly_percentage?: number | null
          status?: string
          profit?: number | null
          notes?: string | null
          placed_at?: string
          settled_at?: string | null
        }
        Update: {
          id?: number
          wallet_id?: number
          game_id?: number
          prediction_id?: number | null
          bet_type?: string
          stake?: number
          odds?: number
          predicted_prob?: number | null
          expected_value?: number | null
          kelly_percentage?: number | null
          status?: string
          profit?: number | null
          notes?: string | null
          placed_at?: string
          settled_at?: string | null
        }
      }
      strategy_performance: {
        Row: {
          id: number
          wallet_id: number
          period_start: string
          period_end: string
          period_type: string
          total_bets: number
          won_bets: number
          lost_bets: number
          void_bets: number
          win_rate: number | null
          total_staked: number
          total_profit: number
          roi: number | null
          avg_odds: number | null
          singles_count: number
          parlays_count: number
          avg_stake: number | null
          max_stake: number | null
          created_at: string
        }
        Insert: {
          id?: number
          wallet_id: number
          period_start: string
          period_end: string
          period_type: string
          total_bets?: number
          won_bets?: number
          lost_bets?: number
          void_bets?: number
          win_rate?: number | null
          total_staked?: number
          total_profit?: number
          roi?: number | null
          avg_odds?: number | null
          singles_count?: number
          parlays_count?: number
          avg_stake?: number | null
          max_stake?: number | null
          created_at?: string
        }
        Update: {
          id?: number
          wallet_id?: number
          period_start?: string
          period_end?: string
          period_type?: string
          total_bets?: number
          won_bets?: number
          lost_bets?: number
          void_bets?: number
          win_rate?: number | null
          total_staked?: number
          total_profit?: number
          roi?: number | null
          avg_odds?: number | null
          singles_count?: number
          parlays_count?: number
          avg_stake?: number | null
          max_stake?: number | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: number
          username: string
          password_hash: string
          email: string | null
          role: string
          is_active: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          username: string
          password_hash: string
          email?: string | null
          role?: string
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          username?: string
          password_hash?: string
          email?: string | null
          role?: string
          is_active?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      sessions: {
        Row: {
          id: number
          user_id: number
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: number
          user_id: number
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: number
          token?: string
          expires_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      v_active_predictions: {
        Row: {
          id: number | null
          game_id: number | null
          game_date: string | null
          league_key: string | null
          home_team: string | null
          away_team: string | null
          prediction: string | null
          confidence: number | null
          home_win_prob: number | null
          draw_prob: number | null
          away_win_prob: number | null
          expected_value: number | null
          kelly_percentage: number | null
          model_version: string | null
          created_at: string | null
        }
      }
      v_model_comparison: {
        Row: {
          version: string | null
          name: string | null
          accuracy: number | null
          roi: number | null
          win_rate: number | null
          brier_score: number | null
          total_bets: number | null
          is_active: boolean | null
          predictions_made: number | null
          correct_predictions: number | null
          avg_confidence: number | null
          actual_brier_score: number | null
        }
      }
      v_wallet_performance: {
        Row: {
          id: number | null
          name: string | null
          balance: number | null
          initial_balance: number | null
          total_profit: number | null
          roi: number | null
          total_bets: number | null
          total_won: number | null
          total_lost: number | null
          win_rate: number | null
          pending_bets: number | null
          pending_amount: number | null
        }
      }
      v_recent_bets: {
        Row: {
          id: number | null
          wallet_id: number | null
          bet_type: string | null
          stake: number | null
          odds: number | null
          status: string | null
          profit: number | null
          placed_at: string | null
          settled_at: string | null
          game_date: string | null
          league_key: string | null
          home_team: string | null
          away_team: string | null
          home_goals: number | null
          away_goals: number | null
          confidence: number | null
          model_version: string | null
        }
      }
    }
    Functions: {
      execute_sql: {
        Args: { query: string; params: Json }
        Returns: Json
      }
      execute_transaction: {
        Args: { statements: Json }
        Returns: Json
      }
    }
  }
}
