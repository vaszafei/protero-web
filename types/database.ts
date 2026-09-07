Connecting to 127.0.0.1 54322
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      basketball_player_games: {
        Row: {
          assists: number | null
          blocks: number | null
          external_id: string | null
          field_goals_attempted: number | null
          field_goals_made: number | null
          free_throws_attempted: number | null
          free_throws_made: number | null
          full_name: string | null
          game_id: number
          is_starter: boolean | null
          minutes: number | null
          personal_fouls: number | null
          player_id: string
          player_name: string
          plus_minus: number | null
          points: number | null
          position: string | null
          rebounds: number | null
          steals: number | null
          team_id: number
          three_pointers_attempted: number | null
          three_pointers_made: number | null
          turnovers: number | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          external_id?: string | null
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          full_name?: string | null
          game_id: number
          is_starter?: boolean | null
          minutes?: number | null
          personal_fouls?: number | null
          player_id: string
          player_name: string
          plus_minus?: number | null
          points?: number | null
          position?: string | null
          rebounds?: number | null
          steals?: number | null
          team_id: number
          three_pointers_attempted?: number | null
          three_pointers_made?: number | null
          turnovers?: number | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          external_id?: string | null
          field_goals_attempted?: number | null
          field_goals_made?: number | null
          free_throws_attempted?: number | null
          free_throws_made?: number | null
          full_name?: string | null
          game_id?: number
          is_starter?: boolean | null
          minutes?: number | null
          personal_fouls?: number | null
          player_id?: string
          player_name?: string
          plus_minus?: number | null
          points?: number | null
          position?: string | null
          rebounds?: number | null
          steals?: number | null
          team_id?: number
          three_pointers_attempted?: number | null
          three_pointers_made?: number | null
          turnovers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "basketball_player_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basketball_player_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "basketball_player_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "basketball_player_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basketball_player_games_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      basketball_player_ids: {
        Row: {
          created_at: string
          external_id: string
          n_matches: number
          player_id: string | null
          player_name: string | null
          resolved: string | null
          source: string
        }
        Insert: {
          created_at?: string
          external_id: string
          n_matches?: number
          player_id?: string | null
          player_name?: string | null
          resolved?: string | null
          source: string
        }
        Update: {
          created_at?: string
          external_id?: string
          n_matches?: number
          player_id?: string | null
          player_name?: string | null
          resolved?: string | null
          source?: string
        }
        Relationships: []
      }
      basketball_shots: {
        Row: {
          action_type: string | null
          clock_seconds: number | null
          coord_system: string
          created_at: string
          fastbreak: boolean | null
          game_id: number
          id: number
          league_key: string
          loc_x: number
          loc_y: number
          made: boolean
          off_turnover: boolean | null
          period: number | null
          player_id: string | null
          player_name: string
          second_chance: boolean | null
          shot_type: string
          source_event_id: number
          team_id: number | null
          team_name: string | null
          zone: string | null
        }
        Insert: {
          action_type?: string | null
          clock_seconds?: number | null
          coord_system: string
          created_at?: string
          fastbreak?: boolean | null
          game_id: number
          id?: number
          league_key: string
          loc_x: number
          loc_y: number
          made: boolean
          off_turnover?: boolean | null
          period?: number | null
          player_id?: string | null
          player_name: string
          second_chance?: boolean | null
          shot_type: string
          source_event_id: number
          team_id?: number | null
          team_name?: string | null
          zone?: string | null
        }
        Update: {
          action_type?: string | null
          clock_seconds?: number | null
          coord_system?: string
          created_at?: string
          fastbreak?: boolean | null
          game_id?: number
          id?: number
          league_key?: string
          loc_x?: number
          loc_y?: number
          made?: boolean
          off_turnover?: boolean | null
          period?: number | null
          player_id?: string | null
          player_name?: string
          second_chance?: boolean | null
          shot_type?: string
          source_event_id?: number
          team_id?: number | null
          team_name?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "basketball_shots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basketball_shots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "basketball_shots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "basketball_shots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "basketball_shots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          belief_score: number | null
          bet_type: string
          calibrated_prob: number | null
          expected_value: number | null
          game_id: number
          id: number
          kelly_percentage: number | null
          line: number | null
          line_source: string | null
          notes: string | null
          odds: number
          parlay_aif: number | null
          parlay_corr_avg: number | null
          placed_at: string | null
          predicted_prob: number | null
          prediction_id: number | null
          profit: number | null
          settled_at: string | null
          settled_by: string | null
          sport: string
          stake: number
          stake_multiplier: number | null
          status: string | null
          strategy: string
          wallet_id: number
        }
        Insert: {
          belief_score?: number | null
          bet_type: string
          calibrated_prob?: number | null
          expected_value?: number | null
          game_id: number
          id?: number
          kelly_percentage?: number | null
          line?: number | null
          line_source?: string | null
          notes?: string | null
          odds: number
          parlay_aif?: number | null
          parlay_corr_avg?: number | null
          placed_at?: string | null
          predicted_prob?: number | null
          prediction_id?: number | null
          profit?: number | null
          settled_at?: string | null
          settled_by?: string | null
          sport?: string
          stake: number
          stake_multiplier?: number | null
          status?: string | null
          strategy: string
          wallet_id: number
        }
        Update: {
          belief_score?: number | null
          bet_type?: string
          calibrated_prob?: number | null
          expected_value?: number | null
          game_id?: number
          id?: number
          kelly_percentage?: number | null
          line?: number | null
          line_source?: string | null
          notes?: string | null
          odds?: number
          parlay_aif?: number | null
          parlay_corr_avg?: number | null
          placed_at?: string | null
          predicted_prob?: number | null
          prediction_id?: number | null
          profit?: number | null
          settled_at?: string | null
          settled_by?: string | null
          sport?: string
          stake?: number
          stake_multiplier?: number | null
          status?: string | null
          strategy?: string
          wallet_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      closing_odds: {
        Row: {
          ahc_line: number | null
          avgc_a: number | null
          avgc_d: number | null
          avgc_h: number | null
          avgc_o25: number | null
          avgc_u25: number | null
          away_raw: string
          bfec_a: number | null
          bfec_d: number | null
          bfec_h: number | null
          created_at: string
          div: string
          ftag: number | null
          fthg: number | null
          game_id: number | null
          home_raw: string
          id: number
          league_key: string | null
          match_conf: number | null
          match_date: string
          maxc_a: number | null
          maxc_d: number | null
          maxc_h: number | null
          maxc_o25: number | null
          maxc_u25: number | null
          p_o25: number | null
          p_u25: number | null
          pc_ah_a: number | null
          pc_ah_h: number | null
          pc_o25: number | null
          pc_u25: number | null
          ps_a: number | null
          ps_d: number | null
          ps_h: number | null
          psc_a: number | null
          psc_d: number | null
          psc_h: number | null
          raw: Json | null
          season: string
          source: string
        }
        Insert: {
          ahc_line?: number | null
          avgc_a?: number | null
          avgc_d?: number | null
          avgc_h?: number | null
          avgc_o25?: number | null
          avgc_u25?: number | null
          away_raw: string
          bfec_a?: number | null
          bfec_d?: number | null
          bfec_h?: number | null
          created_at?: string
          div: string
          ftag?: number | null
          fthg?: number | null
          game_id?: number | null
          home_raw: string
          id?: number
          league_key?: string | null
          match_conf?: number | null
          match_date: string
          maxc_a?: number | null
          maxc_d?: number | null
          maxc_h?: number | null
          maxc_o25?: number | null
          maxc_u25?: number | null
          p_o25?: number | null
          p_u25?: number | null
          pc_ah_a?: number | null
          pc_ah_h?: number | null
          pc_o25?: number | null
          pc_u25?: number | null
          ps_a?: number | null
          ps_d?: number | null
          ps_h?: number | null
          psc_a?: number | null
          psc_d?: number | null
          psc_h?: number | null
          raw?: Json | null
          season: string
          source?: string
        }
        Update: {
          ahc_line?: number | null
          avgc_a?: number | null
          avgc_d?: number | null
          avgc_h?: number | null
          avgc_o25?: number | null
          avgc_u25?: number | null
          away_raw?: string
          bfec_a?: number | null
          bfec_d?: number | null
          bfec_h?: number | null
          created_at?: string
          div?: string
          ftag?: number | null
          fthg?: number | null
          game_id?: number | null
          home_raw?: string
          id?: number
          league_key?: string | null
          match_conf?: number | null
          match_date?: string
          maxc_a?: number | null
          maxc_d?: number | null
          maxc_h?: number | null
          maxc_o25?: number | null
          maxc_u25?: number | null
          p_o25?: number | null
          p_u25?: number | null
          pc_ah_a?: number | null
          pc_ah_h?: number | null
          pc_o25?: number | null
          pc_u25?: number | null
          ps_a?: number | null
          ps_d?: number | null
          ps_h?: number | null
          psc_a?: number | null
          psc_d?: number | null
          psc_h?: number | null
          raw?: Json | null
          season?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_balances: {
        Row: {
          balance: number
          total_earned: number
          total_spent: number
          updated_at: string
          user_id: number
        }
        Insert: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id: number
        }
        Update: {
          balance?: number
          total_earned?: number
          total_spent?: number
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: number
          reference_id: string | null
          type: string
          user_id: number
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: number
          reference_id?: string | null
          type: string
          user_id: number
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: number
          reference_id?: string | null
          type?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      fantasy_entries: {
        Row: {
          created_at: string
          id: number
          lineup: Json
          name: string | null
          p_in_money: number | null
          projected_score: number | null
          slate_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          lineup: Json
          name?: string | null
          p_in_money?: number | null
          projected_score?: number | null
          slate_id: number
        }
        Update: {
          created_at?: string
          id?: number
          lineup?: Json
          name?: string | null
          p_in_money?: number | null
          projected_score?: number | null
          slate_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_entries_slate_id_fkey"
            columns: ["slate_id"]
            isOneToOne: false
            referencedRelation: "fantasy_slates"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_entry_results: {
        Row: {
          actual_rank: number | null
          entry_id: number
          field_size: number | null
          id: number
          notes: string | null
          own_score: number | null
          recorded_at: string
          winning_score: number | null
        }
        Insert: {
          actual_rank?: number | null
          entry_id: number
          field_size?: number | null
          id?: number
          notes?: string | null
          own_score?: number | null
          recorded_at?: string
          winning_score?: number | null
        }
        Update: {
          actual_rank?: number | null
          entry_id?: number
          field_size?: number | null
          id?: number
          notes?: string | null
          own_score?: number | null
          recorded_at?: string
          winning_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_entry_results_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "fantasy_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_lineups: {
        Row: {
          actual_total_score: number | null
          created_at: string | null
          id: number
          league_key: string
          lineup_number: number
          model_details: Json | null
          model_version: string
          n_players: number | null
          players: Json
          salary_cap: number | null
          score_error: number | null
          scoring_type: string
          settled_at: string | null
          sport: string
          target_date: string
          total_projected_score: number | null
          total_salary: number | null
        }
        Insert: {
          actual_total_score?: number | null
          created_at?: string | null
          id?: number
          league_key: string
          lineup_number?: number
          model_details?: Json | null
          model_version: string
          n_players?: number | null
          players: Json
          salary_cap?: number | null
          score_error?: number | null
          scoring_type?: string
          settled_at?: string | null
          sport?: string
          target_date: string
          total_projected_score?: number | null
          total_salary?: number | null
        }
        Update: {
          actual_total_score?: number | null
          created_at?: string | null
          id?: number
          league_key?: string
          lineup_number?: number
          model_details?: Json | null
          model_version?: string
          n_players?: number | null
          players?: Json
          salary_cap?: number | null
          score_error?: number | null
          scoring_type?: string
          settled_at?: string | null
          sport?: string
          target_date?: string
          total_projected_score?: number | null
          total_salary?: number | null
        }
        Relationships: []
      }
      fantasy_player_map: {
        Row: {
          confidence: number
          created_at: string
          id: number
          method: string
          player_id: string
          source: string
          source_player_id: string
          team_id: number
        }
        Insert: {
          confidence: number
          created_at?: string
          id?: number
          method: string
          player_id: string
          source: string
          source_player_id: string
          team_id: number
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: number
          method?: string
          player_id?: string
          source?: string
          source_player_id?: string
          team_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_player_map_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_projections: {
        Row: {
          actual_minutes: number | null
          actual_score: number | null
          confidence: number | null
          created_at: string | null
          game_id: number
          id: number
          league_key: string
          model_details: Json | null
          model_version: string
          opponent_team_id: number | null
          opponent_team_name: string | null
          player_id: string
          player_name: string
          projected_ast: number | null
          projected_blk: number | null
          projected_fg3m: number | null
          projected_minutes: number | null
          projected_pts: number | null
          projected_reb: number | null
          projected_score: number | null
          projected_stl: number | null
          projected_tov: number | null
          score_error: number | null
          scoring_type: string
          settled_at: string | null
          sport: string
          target_date: string
          team_id: number
          team_name: string
        }
        Insert: {
          actual_minutes?: number | null
          actual_score?: number | null
          confidence?: number | null
          created_at?: string | null
          game_id: number
          id?: number
          league_key: string
          model_details?: Json | null
          model_version: string
          opponent_team_id?: number | null
          opponent_team_name?: string | null
          player_id: string
          player_name: string
          projected_ast?: number | null
          projected_blk?: number | null
          projected_fg3m?: number | null
          projected_minutes?: number | null
          projected_pts?: number | null
          projected_reb?: number | null
          projected_score?: number | null
          projected_stl?: number | null
          projected_tov?: number | null
          score_error?: number | null
          scoring_type?: string
          settled_at?: string | null
          sport?: string
          target_date: string
          team_id: number
          team_name: string
        }
        Update: {
          actual_minutes?: number | null
          actual_score?: number | null
          confidence?: number | null
          created_at?: string | null
          game_id?: number
          id?: number
          league_key?: string
          model_details?: Json | null
          model_version?: string
          opponent_team_id?: number | null
          opponent_team_name?: string | null
          player_id?: string
          player_name?: string
          projected_ast?: number | null
          projected_blk?: number | null
          projected_fg3m?: number | null
          projected_minutes?: number | null
          projected_pts?: number | null
          projected_reb?: number | null
          projected_score?: number | null
          projected_stl?: number | null
          projected_tov?: number | null
          score_error?: number | null
          scoring_type?: string
          settled_at?: string | null
          sport?: string
          target_date?: string
          team_id?: number
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_projections_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_projections_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "fantasy_projections_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "fantasy_projections_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_slate_players: {
        Row: {
          club_code: string
          club_team_id: number | null
          fname: string | null
          id: number
          lineup_status: string
          map_confidence: number | null
          mapped_player_id: string | null
          name: string
          position: string
          price: number
          slate_id: number
          source_player_id: string
        }
        Insert: {
          club_code: string
          club_team_id?: number | null
          fname?: string | null
          id?: number
          lineup_status: string
          map_confidence?: number | null
          mapped_player_id?: string | null
          name: string
          position: string
          price: number
          slate_id: number
          source_player_id: string
        }
        Update: {
          club_code?: string
          club_team_id?: number | null
          fname?: string | null
          id?: number
          lineup_status?: string
          map_confidence?: number | null
          mapped_player_id?: string | null
          name?: string
          position?: string
          price?: number
          slate_id?: number
          source_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fantasy_slate_players_club_team_id_fkey"
            columns: ["club_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fantasy_slate_players_slate_id_fkey"
            columns: ["slate_id"]
            isOneToOne: false
            referencedRelation: "fantasy_slates"
            referencedColumns: ["id"]
          },
        ]
      }
      fantasy_slates: {
        Row: {
          contest_name: string | null
          created_at: string
          field_size: number | null
          formation: string | null
          id: number
          lineup_size: number | null
          prize_pool: string | null
          salary_cap: number | null
          salary_cap_unit: string | null
          source_player_csv: string | null
          tournament: string
        }
        Insert: {
          contest_name?: string | null
          created_at?: string
          field_size?: number | null
          formation?: string | null
          id?: number
          lineup_size?: number | null
          prize_pool?: string | null
          salary_cap?: number | null
          salary_cap_unit?: string | null
          source_player_csv?: string | null
          tournament: string
        }
        Update: {
          contest_name?: string | null
          created_at?: string
          field_size?: number | null
          formation?: string | null
          id?: number
          lineup_size?: number | null
          prize_pool?: string | null
          salary_cap?: number | null
          salary_cap_unit?: string | null
          source_player_csv?: string | null
          tournament?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          away_aerials_total: number | null
          away_aerials_won: number | null
          away_aerials_won_1h: number | null
          away_aerials_won_2h: number | null
          away_big_chances: number | null
          away_big_chances_1h: number | null
          away_big_chances_2h: number | null
          away_blocked_shots: number | null
          away_blocked_shots_1h: number | null
          away_blocked_shots_2h: number | null
          away_clearances: number | null
          away_clearances_1h: number | null
          away_clearances_2h: number | null
          away_coach: string | null
          away_coach_id: string | null
          away_corners: number | null
          away_corners_1h: number | null
          away_corners_2h: number | null
          away_formation: string | null
          away_fouls: number | null
          away_fouls_1h: number | null
          away_fouls_2h: number | null
          away_free_kicks: number | null
          away_free_kicks_1h: number | null
          away_free_kicks_2h: number | null
          away_goals: number | null
          away_goals_1h: number | null
          away_goals_2h: number | null
          away_goals_ht: number | null
          away_interceptions: number | null
          away_interceptions_1h: number | null
          away_interceptions_2h: number | null
          away_offsides: number | null
          away_offsides_1h: number | null
          away_offsides_2h: number | null
          away_passes_attempted: number | null
          away_passes_attempted_1h: number | null
          away_passes_attempted_2h: number | null
          away_passes_completed: number | null
          away_passes_completed_1h: number | null
          away_passes_completed_2h: number | null
          away_possession_pct: number | null
          away_possession_pct_1h: number | null
          away_possession_pct_2h: number | null
          away_red_cards: number | null
          away_red_cards_1h: number | null
          away_red_cards_2h: number | null
          away_saves: number | null
          away_saves_1h: number | null
          away_saves_2h: number | null
          away_shots: number | null
          away_shots_1h: number | null
          away_shots_2h: number | null
          away_shots_off_target: number | null
          away_shots_off_target_1h: number | null
          away_shots_off_target_2h: number | null
          away_shots_on_target: number | null
          away_shots_on_target_1h: number | null
          away_shots_on_target_2h: number | null
          away_tackles_total: number | null
          away_tackles_total_1h: number | null
          away_tackles_total_2h: number | null
          away_tackles_won: number | null
          away_tackles_won_1h: number | null
          away_tackles_won_2h: number | null
          away_team_id: number
          away_through_passes: number | null
          away_through_passes_1h: number | null
          away_through_passes_2h: number | null
          away_xg: number | null
          away_xg_1h: number | null
          away_xg_2h: number | null
          away_yellow_cards: number | null
          away_yellow_cards_1h: number | null
          away_yellow_cards_2h: number | null
          created_at: string | null
          date: string
          external_id: string | null
          flashscore_url: string | null
          goal_minutes: Json | null
          home_aerials_total: number | null
          home_aerials_won: number | null
          home_aerials_won_1h: number | null
          home_aerials_won_2h: number | null
          home_big_chances: number | null
          home_big_chances_1h: number | null
          home_big_chances_2h: number | null
          home_blocked_shots: number | null
          home_blocked_shots_1h: number | null
          home_blocked_shots_2h: number | null
          home_clearances: number | null
          home_clearances_1h: number | null
          home_clearances_2h: number | null
          home_coach: string | null
          home_coach_id: string | null
          home_corners: number | null
          home_corners_1h: number | null
          home_corners_2h: number | null
          home_formation: string | null
          home_fouls: number | null
          home_fouls_1h: number | null
          home_fouls_2h: number | null
          home_free_kicks: number | null
          home_free_kicks_1h: number | null
          home_free_kicks_2h: number | null
          home_goals: number | null
          home_goals_1h: number | null
          home_goals_2h: number | null
          home_goals_ht: number | null
          home_interceptions: number | null
          home_interceptions_1h: number | null
          home_interceptions_2h: number | null
          home_offsides: number | null
          home_offsides_1h: number | null
          home_offsides_2h: number | null
          home_passes_attempted: number | null
          home_passes_attempted_1h: number | null
          home_passes_attempted_2h: number | null
          home_passes_completed: number | null
          home_passes_completed_1h: number | null
          home_passes_completed_2h: number | null
          home_possession_pct: number | null
          home_possession_pct_1h: number | null
          home_possession_pct_2h: number | null
          home_red_cards: number | null
          home_red_cards_1h: number | null
          home_red_cards_2h: number | null
          home_saves: number | null
          home_saves_1h: number | null
          home_saves_2h: number | null
          home_shots: number | null
          home_shots_1h: number | null
          home_shots_2h: number | null
          home_shots_off_target: number | null
          home_shots_off_target_1h: number | null
          home_shots_off_target_2h: number | null
          home_shots_on_target: number | null
          home_shots_on_target_1h: number | null
          home_shots_on_target_2h: number | null
          home_tackles_total: number | null
          home_tackles_total_1h: number | null
          home_tackles_total_2h: number | null
          home_tackles_won: number | null
          home_tackles_won_1h: number | null
          home_tackles_won_2h: number | null
          home_team_id: number
          home_through_passes: number | null
          home_through_passes_1h: number | null
          home_through_passes_2h: number | null
          home_xg: number | null
          home_xg_1h: number | null
          home_xg_2h: number | null
          home_yellow_cards: number | null
          home_yellow_cards_1h: number | null
          home_yellow_cards_2h: number | null
          id: number
          league_key: string
          match_events: string | null
          odds_away: number | null
          odds_btts_no: number | null
          odds_btts_yes: number | null
          odds_dc_12: number | null
          odds_dc_1x: number | null
          odds_dc_x2: number | null
          odds_draw: number | null
          odds_home: number | null
          odds_over_15: number | null
          odds_over_25: number | null
          odds_over_35: number | null
          odds_raw: Json | null
          odds_under_15: number | null
          odds_under_25: number | null
          odds_under_35: number | null
          referee_name: string | null
          round: number | null
          season: string
          source: string | null
          sport: string
          sport_stats: Json | null
          stage: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          away_aerials_total?: number | null
          away_aerials_won?: number | null
          away_aerials_won_1h?: number | null
          away_aerials_won_2h?: number | null
          away_big_chances?: number | null
          away_big_chances_1h?: number | null
          away_big_chances_2h?: number | null
          away_blocked_shots?: number | null
          away_blocked_shots_1h?: number | null
          away_blocked_shots_2h?: number | null
          away_clearances?: number | null
          away_clearances_1h?: number | null
          away_clearances_2h?: number | null
          away_coach?: string | null
          away_coach_id?: string | null
          away_corners?: number | null
          away_corners_1h?: number | null
          away_corners_2h?: number | null
          away_formation?: string | null
          away_fouls?: number | null
          away_fouls_1h?: number | null
          away_fouls_2h?: number | null
          away_free_kicks?: number | null
          away_free_kicks_1h?: number | null
          away_free_kicks_2h?: number | null
          away_goals?: number | null
          away_goals_1h?: number | null
          away_goals_2h?: number | null
          away_goals_ht?: number | null
          away_interceptions?: number | null
          away_interceptions_1h?: number | null
          away_interceptions_2h?: number | null
          away_offsides?: number | null
          away_offsides_1h?: number | null
          away_offsides_2h?: number | null
          away_passes_attempted?: number | null
          away_passes_attempted_1h?: number | null
          away_passes_attempted_2h?: number | null
          away_passes_completed?: number | null
          away_passes_completed_1h?: number | null
          away_passes_completed_2h?: number | null
          away_possession_pct?: number | null
          away_possession_pct_1h?: number | null
          away_possession_pct_2h?: number | null
          away_red_cards?: number | null
          away_red_cards_1h?: number | null
          away_red_cards_2h?: number | null
          away_saves?: number | null
          away_saves_1h?: number | null
          away_saves_2h?: number | null
          away_shots?: number | null
          away_shots_1h?: number | null
          away_shots_2h?: number | null
          away_shots_off_target?: number | null
          away_shots_off_target_1h?: number | null
          away_shots_off_target_2h?: number | null
          away_shots_on_target?: number | null
          away_shots_on_target_1h?: number | null
          away_shots_on_target_2h?: number | null
          away_tackles_total?: number | null
          away_tackles_total_1h?: number | null
          away_tackles_total_2h?: number | null
          away_tackles_won?: number | null
          away_tackles_won_1h?: number | null
          away_tackles_won_2h?: number | null
          away_team_id: number
          away_through_passes?: number | null
          away_through_passes_1h?: number | null
          away_through_passes_2h?: number | null
          away_xg?: number | null
          away_xg_1h?: number | null
          away_xg_2h?: number | null
          away_yellow_cards?: number | null
          away_yellow_cards_1h?: number | null
          away_yellow_cards_2h?: number | null
          created_at?: string | null
          date: string
          external_id?: string | null
          flashscore_url?: string | null
          goal_minutes?: Json | null
          home_aerials_total?: number | null
          home_aerials_won?: number | null
          home_aerials_won_1h?: number | null
          home_aerials_won_2h?: number | null
          home_big_chances?: number | null
          home_big_chances_1h?: number | null
          home_big_chances_2h?: number | null
          home_blocked_shots?: number | null
          home_blocked_shots_1h?: number | null
          home_blocked_shots_2h?: number | null
          home_clearances?: number | null
          home_clearances_1h?: number | null
          home_clearances_2h?: number | null
          home_coach?: string | null
          home_coach_id?: string | null
          home_corners?: number | null
          home_corners_1h?: number | null
          home_corners_2h?: number | null
          home_formation?: string | null
          home_fouls?: number | null
          home_fouls_1h?: number | null
          home_fouls_2h?: number | null
          home_free_kicks?: number | null
          home_free_kicks_1h?: number | null
          home_free_kicks_2h?: number | null
          home_goals?: number | null
          home_goals_1h?: number | null
          home_goals_2h?: number | null
          home_goals_ht?: number | null
          home_interceptions?: number | null
          home_interceptions_1h?: number | null
          home_interceptions_2h?: number | null
          home_offsides?: number | null
          home_offsides_1h?: number | null
          home_offsides_2h?: number | null
          home_passes_attempted?: number | null
          home_passes_attempted_1h?: number | null
          home_passes_attempted_2h?: number | null
          home_passes_completed?: number | null
          home_passes_completed_1h?: number | null
          home_passes_completed_2h?: number | null
          home_possession_pct?: number | null
          home_possession_pct_1h?: number | null
          home_possession_pct_2h?: number | null
          home_red_cards?: number | null
          home_red_cards_1h?: number | null
          home_red_cards_2h?: number | null
          home_saves?: number | null
          home_saves_1h?: number | null
          home_saves_2h?: number | null
          home_shots?: number | null
          home_shots_1h?: number | null
          home_shots_2h?: number | null
          home_shots_off_target?: number | null
          home_shots_off_target_1h?: number | null
          home_shots_off_target_2h?: number | null
          home_shots_on_target?: number | null
          home_shots_on_target_1h?: number | null
          home_shots_on_target_2h?: number | null
          home_tackles_total?: number | null
          home_tackles_total_1h?: number | null
          home_tackles_total_2h?: number | null
          home_tackles_won?: number | null
          home_tackles_won_1h?: number | null
          home_tackles_won_2h?: number | null
          home_team_id: number
          home_through_passes?: number | null
          home_through_passes_1h?: number | null
          home_through_passes_2h?: number | null
          home_xg?: number | null
          home_xg_1h?: number | null
          home_xg_2h?: number | null
          home_yellow_cards?: number | null
          home_yellow_cards_1h?: number | null
          home_yellow_cards_2h?: number | null
          id?: number
          league_key: string
          match_events?: string | null
          odds_away?: number | null
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_dc_12?: number | null
          odds_dc_1x?: number | null
          odds_dc_x2?: number | null
          odds_draw?: number | null
          odds_home?: number | null
          odds_over_15?: number | null
          odds_over_25?: number | null
          odds_over_35?: number | null
          odds_raw?: Json | null
          odds_under_15?: number | null
          odds_under_25?: number | null
          odds_under_35?: number | null
          referee_name?: string | null
          round?: number | null
          season: string
          source?: string | null
          sport?: string
          sport_stats?: Json | null
          stage?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          away_aerials_total?: number | null
          away_aerials_won?: number | null
          away_aerials_won_1h?: number | null
          away_aerials_won_2h?: number | null
          away_big_chances?: number | null
          away_big_chances_1h?: number | null
          away_big_chances_2h?: number | null
          away_blocked_shots?: number | null
          away_blocked_shots_1h?: number | null
          away_blocked_shots_2h?: number | null
          away_clearances?: number | null
          away_clearances_1h?: number | null
          away_clearances_2h?: number | null
          away_coach?: string | null
          away_coach_id?: string | null
          away_corners?: number | null
          away_corners_1h?: number | null
          away_corners_2h?: number | null
          away_formation?: string | null
          away_fouls?: number | null
          away_fouls_1h?: number | null
          away_fouls_2h?: number | null
          away_free_kicks?: number | null
          away_free_kicks_1h?: number | null
          away_free_kicks_2h?: number | null
          away_goals?: number | null
          away_goals_1h?: number | null
          away_goals_2h?: number | null
          away_goals_ht?: number | null
          away_interceptions?: number | null
          away_interceptions_1h?: number | null
          away_interceptions_2h?: number | null
          away_offsides?: number | null
          away_offsides_1h?: number | null
          away_offsides_2h?: number | null
          away_passes_attempted?: number | null
          away_passes_attempted_1h?: number | null
          away_passes_attempted_2h?: number | null
          away_passes_completed?: number | null
          away_passes_completed_1h?: number | null
          away_passes_completed_2h?: number | null
          away_possession_pct?: number | null
          away_possession_pct_1h?: number | null
          away_possession_pct_2h?: number | null
          away_red_cards?: number | null
          away_red_cards_1h?: number | null
          away_red_cards_2h?: number | null
          away_saves?: number | null
          away_saves_1h?: number | null
          away_saves_2h?: number | null
          away_shots?: number | null
          away_shots_1h?: number | null
          away_shots_2h?: number | null
          away_shots_off_target?: number | null
          away_shots_off_target_1h?: number | null
          away_shots_off_target_2h?: number | null
          away_shots_on_target?: number | null
          away_shots_on_target_1h?: number | null
          away_shots_on_target_2h?: number | null
          away_tackles_total?: number | null
          away_tackles_total_1h?: number | null
          away_tackles_total_2h?: number | null
          away_tackles_won?: number | null
          away_tackles_won_1h?: number | null
          away_tackles_won_2h?: number | null
          away_team_id?: number
          away_through_passes?: number | null
          away_through_passes_1h?: number | null
          away_through_passes_2h?: number | null
          away_xg?: number | null
          away_xg_1h?: number | null
          away_xg_2h?: number | null
          away_yellow_cards?: number | null
          away_yellow_cards_1h?: number | null
          away_yellow_cards_2h?: number | null
          created_at?: string | null
          date?: string
          external_id?: string | null
          flashscore_url?: string | null
          goal_minutes?: Json | null
          home_aerials_total?: number | null
          home_aerials_won?: number | null
          home_aerials_won_1h?: number | null
          home_aerials_won_2h?: number | null
          home_big_chances?: number | null
          home_big_chances_1h?: number | null
          home_big_chances_2h?: number | null
          home_blocked_shots?: number | null
          home_blocked_shots_1h?: number | null
          home_blocked_shots_2h?: number | null
          home_clearances?: number | null
          home_clearances_1h?: number | null
          home_clearances_2h?: number | null
          home_coach?: string | null
          home_coach_id?: string | null
          home_corners?: number | null
          home_corners_1h?: number | null
          home_corners_2h?: number | null
          home_formation?: string | null
          home_fouls?: number | null
          home_fouls_1h?: number | null
          home_fouls_2h?: number | null
          home_free_kicks?: number | null
          home_free_kicks_1h?: number | null
          home_free_kicks_2h?: number | null
          home_goals?: number | null
          home_goals_1h?: number | null
          home_goals_2h?: number | null
          home_goals_ht?: number | null
          home_interceptions?: number | null
          home_interceptions_1h?: number | null
          home_interceptions_2h?: number | null
          home_offsides?: number | null
          home_offsides_1h?: number | null
          home_offsides_2h?: number | null
          home_passes_attempted?: number | null
          home_passes_attempted_1h?: number | null
          home_passes_attempted_2h?: number | null
          home_passes_completed?: number | null
          home_passes_completed_1h?: number | null
          home_passes_completed_2h?: number | null
          home_possession_pct?: number | null
          home_possession_pct_1h?: number | null
          home_possession_pct_2h?: number | null
          home_red_cards?: number | null
          home_red_cards_1h?: number | null
          home_red_cards_2h?: number | null
          home_saves?: number | null
          home_saves_1h?: number | null
          home_saves_2h?: number | null
          home_shots?: number | null
          home_shots_1h?: number | null
          home_shots_2h?: number | null
          home_shots_off_target?: number | null
          home_shots_off_target_1h?: number | null
          home_shots_off_target_2h?: number | null
          home_shots_on_target?: number | null
          home_shots_on_target_1h?: number | null
          home_shots_on_target_2h?: number | null
          home_tackles_total?: number | null
          home_tackles_total_1h?: number | null
          home_tackles_total_2h?: number | null
          home_tackles_won?: number | null
          home_tackles_won_1h?: number | null
          home_tackles_won_2h?: number | null
          home_team_id?: number
          home_through_passes?: number | null
          home_through_passes_1h?: number | null
          home_through_passes_2h?: number | null
          home_xg?: number | null
          home_xg_1h?: number | null
          home_xg_2h?: number | null
          home_yellow_cards?: number | null
          home_yellow_cards_1h?: number | null
          home_yellow_cards_2h?: number | null
          id?: number
          league_key?: string
          match_events?: string | null
          odds_away?: number | null
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_dc_12?: number | null
          odds_dc_1x?: number | null
          odds_dc_x2?: number | null
          odds_draw?: number | null
          odds_home?: number | null
          odds_over_15?: number | null
          odds_over_25?: number | null
          odds_over_35?: number | null
          odds_raw?: Json | null
          odds_under_15?: number | null
          odds_under_25?: number | null
          odds_under_35?: number | null
          referee_name?: string | null
          round?: number | null
          season?: string
          source?: string | null
          sport?: string
          sport_stats?: Json | null
          stage?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["key"]
          },
        ]
      }
      gamma_state: {
        Row: {
          brier_ema: number
          created_at: string
          gamma: number
          last_brier: number | null
          last_n_bets: number | null
          league_key: string
          n_updates: number
          surprise_ema: number
          updated_at: string
        }
        Insert: {
          brier_ema?: number
          created_at?: string
          gamma?: number
          last_brier?: number | null
          last_n_bets?: number | null
          league_key: string
          n_updates?: number
          surprise_ema?: number
          updated_at?: string
        }
        Update: {
          brier_ema?: number
          created_at?: string
          gamma?: number
          last_brier?: number | null
          last_n_bets?: number | null
          league_key?: string
          n_updates?: number
          surprise_ema?: number
          updated_at?: string
        }
        Relationships: []
      }
      gate_runs: {
        Row: {
          elapsed_s: number | null
          failed: number
          finished_at: string | null
          gates: Json | null
          id: number
          passed: number
          started_at: string
          status: string
        }
        Insert: {
          elapsed_s?: number | null
          failed?: number
          finished_at?: string | null
          gates?: Json | null
          id?: number
          passed?: number
          started_at?: string
          status: string
        }
        Update: {
          elapsed_s?: number | null
          failed?: number
          finished_at?: string | null
          gates?: Json | null
          id?: number
          passed?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      league_unlocks: {
        Row: {
          credits_spent: number
          expires_at: string
          id: number
          league_key: string
          unlocked_at: string
          user_id: number
        }
        Insert: {
          credits_spent?: number
          expires_at: string
          id?: number
          league_key: string
          unlocked_at?: string
          user_id: number
        }
        Update: {
          credits_spent?: number
          expires_at?: string
          id?: number
          league_key?: string
          unlocked_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_unlocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          country: string | null
          created_at: string | null
          credit_cost: number | null
          credit_tier: string | null
          current_round: number | null
          flag: string | null
          key: string
          name: string
          season: string | null
          sport: string
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          credit_cost?: number | null
          credit_tier?: string | null
          current_round?: number | null
          flag?: string | null
          key: string
          name: string
          season?: string | null
          sport?: string
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          credit_cost?: number | null
          credit_tier?: string | null
          current_round?: number | null
          flag?: string | null
          key?: string
          name?: string
          season?: string | null
          sport?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leagues_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["key"]
          },
        ]
      }
      line_scores: {
        Row: {
          brier: number | null
          computed_at: string
          devig: string | null
          game_id: number
          grade_status: string
          graded_at: string | null
          id: number
          league_key: string
          line: number | null
          logloss: number | null
          market: string
          match_date: string
          outcome: number | null
          prob: number | null
          probs: Json | null
          rps: number | null
          season: string
          source: string
        }
        Insert: {
          brier?: number | null
          computed_at?: string
          devig?: string | null
          game_id: number
          grade_status?: string
          graded_at?: string | null
          id?: number
          league_key: string
          line?: number | null
          logloss?: number | null
          market: string
          match_date: string
          outcome?: number | null
          prob?: number | null
          probs?: Json | null
          rps?: number | null
          season: string
          source: string
        }
        Update: {
          brier?: number | null
          computed_at?: string
          devig?: string | null
          game_id?: number
          grade_status?: string
          graded_at?: string | null
          id?: number
          league_key?: string
          line?: number | null
          logloss?: number | null
          market?: string
          match_date?: string
          outcome?: number | null
          prob?: number | null
          probs?: Json | null
          rps?: number | null
          season?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "line_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "line_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      lineups: {
        Row: {
          assists: number | null
          ball_recoveries: number | null
          big_chances_missed: number | null
          clearances: number | null
          created_at: string | null
          dribbles_attempted: number | null
          dribbles_successful: number | null
          duels: number | null
          expected_assists: number | null
          final_third_entries_successful: number | null
          fouls_committed: number | null
          full_name: string | null
          game_id: number
          goals: number | null
          goals_conceded: number | null
          goals_own: number | null
          goals_penalty: number | null
          id: number
          interceptions: number | null
          is_starting_xi: boolean | null
          jersey_number: number | null
          key_passes: number | null
          minutes_played: number | null
          offsides: number | null
          pass_accuracy: number | null
          passes: number | null
          passes_final_third_accurate: number | null
          passes_total: number | null
          penalties_not_converted: number | null
          penalties_saved: number | null
          player_id: string | null
          player_name: string
          position: string | null
          progressive_passes_accurate: number | null
          rating: number | null
          red_cards: number | null
          saves_total: number | null
          shots_on_target: number | null
          shots_total: number | null
          tackles: number | null
          tackles_total: number | null
          team_id: number
          touches: number | null
          touches_in_box: number | null
          turnovers: number | null
          was_fouled: number | null
          xg: number | null
          yellow_cards: number | null
          yellow_cards_second: number | null
        }
        Insert: {
          assists?: number | null
          ball_recoveries?: number | null
          big_chances_missed?: number | null
          clearances?: number | null
          created_at?: string | null
          dribbles_attempted?: number | null
          dribbles_successful?: number | null
          duels?: number | null
          expected_assists?: number | null
          final_third_entries_successful?: number | null
          fouls_committed?: number | null
          full_name?: string | null
          game_id: number
          goals?: number | null
          goals_conceded?: number | null
          goals_own?: number | null
          goals_penalty?: number | null
          id?: number
          interceptions?: number | null
          is_starting_xi?: boolean | null
          jersey_number?: number | null
          key_passes?: number | null
          minutes_played?: number | null
          offsides?: number | null
          pass_accuracy?: number | null
          passes?: number | null
          passes_final_third_accurate?: number | null
          passes_total?: number | null
          penalties_not_converted?: number | null
          penalties_saved?: number | null
          player_id?: string | null
          player_name: string
          position?: string | null
          progressive_passes_accurate?: number | null
          rating?: number | null
          red_cards?: number | null
          saves_total?: number | null
          shots_on_target?: number | null
          shots_total?: number | null
          tackles?: number | null
          tackles_total?: number | null
          team_id: number
          touches?: number | null
          touches_in_box?: number | null
          turnovers?: number | null
          was_fouled?: number | null
          xg?: number | null
          yellow_cards?: number | null
          yellow_cards_second?: number | null
        }
        Update: {
          assists?: number | null
          ball_recoveries?: number | null
          big_chances_missed?: number | null
          clearances?: number | null
          created_at?: string | null
          dribbles_attempted?: number | null
          dribbles_successful?: number | null
          duels?: number | null
          expected_assists?: number | null
          final_third_entries_successful?: number | null
          fouls_committed?: number | null
          full_name?: string | null
          game_id?: number
          goals?: number | null
          goals_conceded?: number | null
          goals_own?: number | null
          goals_penalty?: number | null
          id?: number
          interceptions?: number | null
          is_starting_xi?: boolean | null
          jersey_number?: number | null
          key_passes?: number | null
          minutes_played?: number | null
          offsides?: number | null
          pass_accuracy?: number | null
          passes?: number | null
          passes_final_third_accurate?: number | null
          passes_total?: number | null
          penalties_not_converted?: number | null
          penalties_saved?: number | null
          player_id?: string | null
          player_name?: string
          position?: string | null
          progressive_passes_accurate?: number | null
          rating?: number | null
          red_cards?: number | null
          saves_total?: number | null
          shots_on_target?: number | null
          shots_total?: number | null
          tackles?: number | null
          tackles_total?: number | null
          team_id?: number
          touches?: number | null
          touches_in_box?: number | null
          turnovers?: number | null
          was_fouled?: number | null
          xg?: number | null
          yellow_cards?: number | null
          yellow_cards_second?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lineups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "lineups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "lineups_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lineups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      market_calibration: {
        Row: {
          bet_type: string
          brier_calib: number
          brier_raw: number
          fitted_at: string
          knots_x: number[]
          knots_y: number[]
          league_key: string
          log_loss_calib: number | null
          log_loss_raw: number | null
          n_train: number
        }
        Insert: {
          bet_type: string
          brier_calib: number
          brier_raw: number
          fitted_at?: string
          knots_x: number[]
          knots_y: number[]
          league_key: string
          log_loss_calib?: number | null
          log_loss_raw?: number | null
          n_train: number
        }
        Update: {
          bet_type?: string
          brier_calib?: number
          brier_raw?: number
          fitted_at?: string
          knots_x?: number[]
          knots_y?: number[]
          league_key?: string
          log_loss_calib?: number | null
          log_loss_raw?: number | null
          n_train?: number
        }
        Relationships: []
      }
      market_posterior: {
        Row: {
          alpha: number
          alpha_prior: number
          avg_odds: number
          bet_type: string
          beta: number
          beta_prior: number
          league_key: string
          n_live: number
          n_prior: number
          roi_hat: number
          stake_multiplier: number
          updated_at: string
        }
        Insert: {
          alpha?: number
          alpha_prior?: number
          avg_odds?: number
          bet_type: string
          beta?: number
          beta_prior?: number
          league_key: string
          n_live?: number
          n_prior?: number
          roi_hat?: number
          stake_multiplier?: number
          updated_at?: string
        }
        Update: {
          alpha?: number
          alpha_prior?: number
          avg_odds?: number
          bet_type?: string
          beta?: number
          beta_prior?: number
          league_key?: string
          n_live?: number
          n_prior?: number
          roi_hat?: number
          stake_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      model_versions: {
        Row: {
          accuracy: number | null
          avg_odds: number | null
          away_accuracy: number | null
          brier_score: number | null
          btts_accuracy: number | null
          created_at: string | null
          description: string | null
          draw_accuracy: number | null
          ensemble_weights: Json | null
          features_used: Json | null
          home_accuracy: number | null
          id: number
          is_active: boolean | null
          log_loss: number | null
          name: string
          notes: string | null
          over25_accuracy: number | null
          profitable_bets: number | null
          roi: number | null
          tested_on: string | null
          total_bets: number | null
          trained_on: string | null
          training_date: string | null
          updated_at: string | null
          version: string
          win_rate: number | null
        }
        Insert: {
          accuracy?: number | null
          avg_odds?: number | null
          away_accuracy?: number | null
          brier_score?: number | null
          btts_accuracy?: number | null
          created_at?: string | null
          description?: string | null
          draw_accuracy?: number | null
          ensemble_weights?: Json | null
          features_used?: Json | null
          home_accuracy?: number | null
          id?: number
          is_active?: boolean | null
          log_loss?: number | null
          name: string
          notes?: string | null
          over25_accuracy?: number | null
          profitable_bets?: number | null
          roi?: number | null
          tested_on?: string | null
          total_bets?: number | null
          trained_on?: string | null
          training_date?: string | null
          updated_at?: string | null
          version: string
          win_rate?: number | null
        }
        Update: {
          accuracy?: number | null
          avg_odds?: number | null
          away_accuracy?: number | null
          brier_score?: number | null
          btts_accuracy?: number | null
          created_at?: string | null
          description?: string | null
          draw_accuracy?: number | null
          ensemble_weights?: Json | null
          features_used?: Json | null
          home_accuracy?: number | null
          id?: number
          is_active?: boolean | null
          log_loss?: number | null
          name?: string
          notes?: string | null
          over25_accuracy?: number | null
          profitable_bets?: number | null
          roi?: number | null
          tested_on?: string | null
          total_bets?: number | null
          trained_on?: string | null
          training_date?: string | null
          updated_at?: string | null
          version?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      odds_snapshots: {
        Row: {
          away_team_id: number | null
          captured_at: string
          game_date: string | null
          game_id: number | null
          home_team_id: number | null
          id: number
          league_key: string | null
          odds_away: number | null
          odds_btts_no: number | null
          odds_btts_yes: number | null
          odds_dc_12: number | null
          odds_dc_1x: number | null
          odds_dc_x2: number | null
          odds_draw: number | null
          odds_home: number | null
          odds_over: number | null
          odds_over_15: number | null
          odds_over_25: number | null
          odds_over_35: number | null
          odds_raw: Json | null
          odds_spread_away: number | null
          odds_spread_home: number | null
          odds_under: number | null
          odds_under_15: number | null
          odds_under_25: number | null
          odds_under_35: number | null
          source: string
          sport: string
          spread_line: number | null
          total_line: number | null
        }
        Insert: {
          away_team_id?: number | null
          captured_at?: string
          game_date?: string | null
          game_id?: number | null
          home_team_id?: number | null
          id?: number
          league_key?: string | null
          odds_away?: number | null
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_dc_12?: number | null
          odds_dc_1x?: number | null
          odds_dc_x2?: number | null
          odds_draw?: number | null
          odds_home?: number | null
          odds_over?: number | null
          odds_over_15?: number | null
          odds_over_25?: number | null
          odds_over_35?: number | null
          odds_raw?: Json | null
          odds_spread_away?: number | null
          odds_spread_home?: number | null
          odds_under?: number | null
          odds_under_15?: number | null
          odds_under_25?: number | null
          odds_under_35?: number | null
          source?: string
          sport: string
          spread_line?: number | null
          total_line?: number | null
        }
        Update: {
          away_team_id?: number | null
          captured_at?: string
          game_date?: string | null
          game_id?: number | null
          home_team_id?: number | null
          id?: number
          league_key?: string | null
          odds_away?: number | null
          odds_btts_no?: number | null
          odds_btts_yes?: number | null
          odds_dc_12?: number | null
          odds_dc_1x?: number | null
          odds_dc_x2?: number | null
          odds_draw?: number | null
          odds_home?: number | null
          odds_over?: number | null
          odds_over_15?: number | null
          odds_over_25?: number | null
          odds_over_35?: number | null
          odds_raw?: Json | null
          odds_spread_away?: number | null
          odds_spread_home?: number | null
          odds_under?: number | null
          odds_under_15?: number | null
          odds_under_25?: number | null
          odds_under_35?: number | null
          source?: string
          sport?: string
          spread_line?: number | null
          total_line?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      parlay_legs: {
        Row: {
          bet_id: number
          created_at: string
          id: number
          leg_number: number
          parlay_id: number
        }
        Insert: {
          bet_id: number
          created_at?: string
          id?: number
          leg_number: number
          parlay_id: number
        }
        Update: {
          bet_id?: number
          created_at?: string
          id?: number
          leg_number?: number
          parlay_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "parlay_legs_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parlay_legs_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "v_admin_picks"
            referencedColumns: ["bet_id"]
          },
          {
            foreignKeyName: "parlay_legs_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "v_recent_bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parlay_legs_parlay_id_fkey"
            columns: ["parlay_id"]
            isOneToOne: false
            referencedRelation: "parlays"
            referencedColumns: ["id"]
          },
        ]
      }
      parlays: {
        Row: {
          actual_payout: number | null
          correlation_penalty: number
          created_at: string
          diversity_score: number
          expected_value: number
          final_probability: number
          id: number
          kelly_fraction: number
          num_legs: number
          parlay_odds: number
          result: string | null
          settled_at: string | null
          status: string
          strategy: string
          total_stake: number | null
          updated_at: string | null
          wallet_id: number
        }
        Insert: {
          actual_payout?: number | null
          correlation_penalty: number
          created_at?: string
          diversity_score: number
          expected_value: number
          final_probability: number
          id?: number
          kelly_fraction: number
          num_legs: number
          parlay_odds: number
          result?: string | null
          settled_at?: string | null
          status?: string
          strategy?: string
          total_stake?: number | null
          updated_at?: string | null
          wallet_id: number
        }
        Update: {
          actual_payout?: number | null
          correlation_penalty?: number
          created_at?: string
          diversity_score?: number
          expected_value?: number
          final_probability?: number
          id?: number
          kelly_fraction?: number
          num_legs?: number
          parlay_odds?: number
          result?: string | null
          settled_at?: string | null
          status?: string
          strategy?: string
          total_stake?: number | null
          updated_at?: string | null
          wallet_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "parlays_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parlays_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_runs: {
        Row: {
          elapsed_s: number | null
          error_msg: string | null
          finished_at: string | null
          gate_failed: string | null
          id: number
          metadata: Json | null
          phase_name: string
          pipeline: string
          pipeline_run_id: number | null
          started_at: string
          status: string
          stderr_tail: string | null
          stdout_tail: string | null
        }
        Insert: {
          elapsed_s?: number | null
          error_msg?: string | null
          finished_at?: string | null
          gate_failed?: string | null
          id?: number
          metadata?: Json | null
          phase_name: string
          pipeline: string
          pipeline_run_id?: number | null
          started_at?: string
          status: string
          stderr_tail?: string | null
          stdout_tail?: string | null
        }
        Update: {
          elapsed_s?: number | null
          error_msg?: string | null
          finished_at?: string | null
          gate_failed?: string | null
          id?: number
          metadata?: Json | null
          phase_name?: string
          pipeline?: string
          pipeline_run_id?: number | null
          started_at?: string
          status?: string
          stderr_tail?: string | null
          stdout_tail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phase_runs_pipeline_run_id_fkey"
            columns: ["pipeline_run_id"]
            isOneToOne: false
            referencedRelation: "pipeline_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          details: Json | null
          elapsed_s: number | null
          errors: number
          finished_at: string | null
          id: number
          pipeline: string
          started_at: string
          status: string
          warnings: number
        }
        Insert: {
          details?: Json | null
          elapsed_s?: number | null
          errors?: number
          finished_at?: string | null
          id?: number
          pipeline: string
          started_at?: string
          status: string
          warnings?: number
        }
        Update: {
          details?: Json | null
          elapsed_s?: number | null
          errors?: number
          finished_at?: string | null
          id?: number
          pipeline?: string
          started_at?: string
          status?: string
          warnings?: number
        }
        Relationships: []
      }
      player_prop_picks: {
        Row: {
          actual_value: number | null
          alt_line: number | null
          alt_odds: number | null
          confidence: number | null
          created_at: string | null
          cv: number | null
          direction: string
          efe: number | null
          epistemic_value: number | null
          ev: number | null
          fe_edge: number | null
          fe_model_mean: number | null
          fe_model_std: number | null
          fe_p_over: number | null
          form_divergence: number | null
          game_id: number | null
          h2h_hr: number | null
          h2h_n: number | null
          id: number
          kelly_stake: number | null
          l10_hr: number | null
          league_key: string
          line: number
          line_mispricing: number | null
          market: string
          matchup_edge: number | null
          model_version: string | null
          n_signals: number | null
          odds: number | null
          opponent: string | null
          p_hit: number | null
          parlay_id: string | null
          pick_type: string
          player_name: string
          post_mean: number | null
          post_var: number | null
          pragmatic_value: number | null
          primary_pick: boolean | null
          profit: number | null
          prop_id: number | null
          result: string | null
          season_hr: number | null
          settled_at: string | null
          sniper_score: number | null
          sniper_signals: string[] | null
          sport: string
          target_date: string
          team_name: string | null
          trad_score: number | null
          trad_tier: number | null
        }
        Insert: {
          actual_value?: number | null
          alt_line?: number | null
          alt_odds?: number | null
          confidence?: number | null
          created_at?: string | null
          cv?: number | null
          direction?: string
          efe?: number | null
          epistemic_value?: number | null
          ev?: number | null
          fe_edge?: number | null
          fe_model_mean?: number | null
          fe_model_std?: number | null
          fe_p_over?: number | null
          form_divergence?: number | null
          game_id?: number | null
          h2h_hr?: number | null
          h2h_n?: number | null
          id?: number
          kelly_stake?: number | null
          l10_hr?: number | null
          league_key: string
          line: number
          line_mispricing?: number | null
          market: string
          matchup_edge?: number | null
          model_version?: string | null
          n_signals?: number | null
          odds?: number | null
          opponent?: string | null
          p_hit?: number | null
          parlay_id?: string | null
          pick_type: string
          player_name: string
          post_mean?: number | null
          post_var?: number | null
          pragmatic_value?: number | null
          primary_pick?: boolean | null
          profit?: number | null
          prop_id?: number | null
          result?: string | null
          season_hr?: number | null
          settled_at?: string | null
          sniper_score?: number | null
          sniper_signals?: string[] | null
          sport?: string
          target_date: string
          team_name?: string | null
          trad_score?: number | null
          trad_tier?: number | null
        }
        Update: {
          actual_value?: number | null
          alt_line?: number | null
          alt_odds?: number | null
          confidence?: number | null
          created_at?: string | null
          cv?: number | null
          direction?: string
          efe?: number | null
          epistemic_value?: number | null
          ev?: number | null
          fe_edge?: number | null
          fe_model_mean?: number | null
          fe_model_std?: number | null
          fe_p_over?: number | null
          form_divergence?: number | null
          game_id?: number | null
          h2h_hr?: number | null
          h2h_n?: number | null
          id?: number
          kelly_stake?: number | null
          l10_hr?: number | null
          league_key?: string
          line?: number
          line_mispricing?: number | null
          market?: string
          matchup_edge?: number | null
          model_version?: string | null
          n_signals?: number | null
          odds?: number | null
          opponent?: string | null
          p_hit?: number | null
          parlay_id?: string | null
          pick_type?: string
          player_name?: string
          post_mean?: number | null
          post_var?: number | null
          pragmatic_value?: number | null
          primary_pick?: boolean | null
          profit?: number | null
          prop_id?: number | null
          result?: string | null
          season_hr?: number | null
          settled_at?: string | null
          sniper_score?: number | null
          sniper_signals?: string[] | null
          sport?: string
          target_date?: string
          team_name?: string | null
          trad_score?: number | null
          trad_tier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_prop_picks_prop_id_fkey"
            columns: ["prop_id"]
            isOneToOne: false
            referencedRelation: "player_props"
            referencedColumns: ["id"]
          },
        ]
      }
      player_props: {
        Row: {
          actual_value: number | null
          created_at: string | null
          game_id: number | null
          id: number
          league_key: string
          line: number
          market: string
          over_odds: number | null
          player_name: string
          result: string | null
          source: string | null
          sport: string
          target_date: string
          team_name: string | null
          under_odds: number | null
        }
        Insert: {
          actual_value?: number | null
          created_at?: string | null
          game_id?: number | null
          id?: number
          league_key: string
          line: number
          market: string
          over_odds?: number | null
          player_name: string
          result?: string | null
          source?: string | null
          sport?: string
          target_date: string
          team_name?: string | null
          under_odds?: number | null
        }
        Update: {
          actual_value?: number | null
          created_at?: string | null
          game_id?: number | null
          id?: number
          league_key?: string
          line?: number
          market?: string
          over_odds?: number | null
          player_name?: string
          result?: string | null
          source?: string | null
          sport?: string
          target_date?: string
          team_name?: string | null
          under_odds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_props_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_props_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "player_props_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "player_props_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          away_win_prob: number | null
          belief_score: number | null
          brier_score: number | null
          btts_prob: number | null
          calibrated_prob: number | null
          calibration_meta: Json | null
          confidence: number
          created_at: string | null
          draw_prob: number | null
          expected_value: number | null
          game_id: number
          home_win_prob: number | null
          id: number
          kelly_percentage: number | null
          model_agreement: number | null
          model_details: Json | null
          model_version: string
          odds_away: number | null
          odds_draw: number | null
          odds_home: number | null
          odds_over_25: number | null
          odds_over25: number | null
          odds_under_25: number | null
          odds_under25: number | null
          over_105_corners_prob: number | null
          over_15_prob: number | null
          over_25_prob: number | null
          over_35_prob: number | null
          over_85_corners_prob: number | null
          over_95_corners_prob: number | null
          over25_prob: number | null
          prediction: string
          result_correct: boolean | null
          sport: string
          under25_prob: number | null
          validated_at: string | null
        }
        Insert: {
          away_win_prob?: number | null
          belief_score?: number | null
          brier_score?: number | null
          btts_prob?: number | null
          calibrated_prob?: number | null
          calibration_meta?: Json | null
          confidence: number
          created_at?: string | null
          draw_prob?: number | null
          expected_value?: number | null
          game_id: number
          home_win_prob?: number | null
          id?: number
          kelly_percentage?: number | null
          model_agreement?: number | null
          model_details?: Json | null
          model_version?: string
          odds_away?: number | null
          odds_draw?: number | null
          odds_home?: number | null
          odds_over_25?: number | null
          odds_over25?: number | null
          odds_under_25?: number | null
          odds_under25?: number | null
          over_105_corners_prob?: number | null
          over_15_prob?: number | null
          over_25_prob?: number | null
          over_35_prob?: number | null
          over_85_corners_prob?: number | null
          over_95_corners_prob?: number | null
          over25_prob?: number | null
          prediction: string
          result_correct?: boolean | null
          sport?: string
          under25_prob?: number | null
          validated_at?: string | null
        }
        Update: {
          away_win_prob?: number | null
          belief_score?: number | null
          brier_score?: number | null
          btts_prob?: number | null
          calibrated_prob?: number | null
          calibration_meta?: Json | null
          confidence?: number
          created_at?: string | null
          draw_prob?: number | null
          expected_value?: number | null
          game_id?: number
          home_win_prob?: number | null
          id?: number
          kelly_percentage?: number | null
          model_agreement?: number | null
          model_details?: Json | null
          model_version?: string
          odds_away?: number | null
          odds_draw?: number | null
          odds_home?: number | null
          odds_over_25?: number | null
          odds_over25?: number | null
          odds_under_25?: number | null
          odds_under25?: number | null
          over_105_corners_prob?: number | null
          over_15_prob?: number | null
          over_25_prob?: number | null
          over_35_prob?: number | null
          over_85_corners_prob?: number | null
          over_95_corners_prob?: number | null
          over25_prob?: number | null
          prediction?: string
          result_correct?: boolean | null
          sport?: string
          under25_prob?: number | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      prop_parlays: {
        Row: {
          combined_odds: number
          correlation_uplift: number | null
          created_at: string | null
          cross_game: boolean
          ev: number
          id: string
          independent_prob: number | null
          joint_prob: number
          kelly_stake: number
          league_key: string
          leg_summary: string | null
          model_version: string
          n_legs: number
          profit: number | null
          result: string | null
          settled_at: string | null
          sport: string
          target_date: string
        }
        Insert: {
          combined_odds: number
          correlation_uplift?: number | null
          created_at?: string | null
          cross_game?: boolean
          ev: number
          id: string
          independent_prob?: number | null
          joint_prob: number
          kelly_stake: number
          league_key: string
          leg_summary?: string | null
          model_version?: string
          n_legs: number
          profit?: number | null
          result?: string | null
          settled_at?: string | null
          sport?: string
          target_date: string
        }
        Update: {
          combined_odds?: number
          correlation_uplift?: number | null
          created_at?: string | null
          cross_game?: boolean
          ev?: number
          id?: string
          independent_prob?: number | null
          joint_prob?: number
          kelly_stake?: number
          league_key?: string
          leg_summary?: string | null
          model_version?: string
          n_legs?: number
          profit?: number | null
          result?: string | null
          settled_at?: string | null
          sport?: string
          target_date?: string
        }
        Relationships: []
      }
      scrape_log: {
        Row: {
          attempt: number | null
          error_msg: string | null
          fields_saved: string[] | null
          game_id: number
          id: number
          scraped_at: string
          success: boolean | null
        }
        Insert: {
          attempt?: number | null
          error_msg?: string | null
          fields_saved?: string[] | null
          game_id: number
          id?: number
          scraped_at?: string
          success?: boolean | null
        }
        Update: {
          attempt?: number | null
          error_msg?: string | null
          fields_saved?: string[] | null
          game_id?: number
          id?: number
          scraped_at?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_log_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_log_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "scrape_log_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "scrape_log_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: number
          token: string
          user_id: number
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: number
          token: string
          user_id: number
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: number
          token?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sports: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          key: string
          name: string
          stat_schema: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key: string
          name: string
          stat_schema?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key?: string
          name?: string
          stat_schema?: Json | null
        }
        Relationships: []
      }
      standings: {
        Row: {
          d: number | null
          form: string | null
          ga: number | null
          gf: number | null
          gp: number | null
          id: number
          l: number | null
          league_key: string
          pts: number | null
          season: string | null
          team_id: number
          updated_at: string | null
          w: number | null
        }
        Insert: {
          d?: number | null
          form?: string | null
          ga?: number | null
          gf?: number | null
          gp?: number | null
          id?: number
          l?: number | null
          league_key: string
          pts?: number | null
          season?: string | null
          team_id: number
          updated_at?: string | null
          w?: number | null
        }
        Update: {
          d?: number | null
          form?: string | null
          ga?: number | null
          gf?: number | null
          gp?: number | null
          id?: number
          l?: number | null
          league_key?: string
          pts?: number | null
          season?: string | null
          team_id?: number
          updated_at?: string | null
          w?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "standings_league_key_fkey"
            columns: ["league_key"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: number
          interval: string
          is_active: boolean
          key: string
          name: string
          price_eur: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: number
          interval?: string
          is_active?: boolean
          key: string
          name: string
          price_eur?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: number
          interval?: string
          is_active?: boolean
          key?: string
          name?: string
          price_eur?: number
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string | null
          flashscore_id: string | null
          id: number
          league_key: string
          name: string
          sport: string
          team_key: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          flashscore_id?: string | null
          id?: number
          league_key: string
          name: string
          sport?: string
          team_key?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          flashscore_id?: string | null
          id?: number
          league_key?: string
          name?: string
          sport?: string
          team_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["key"]
          },
        ]
      }
      tipster_entity_map: {
        Row: {
          confidence: number | null
          created_at: string
          id: number
          kind: string
          league_key: string | null
          method: string | null
          source_entity_id: string
          source_key: string
          source_name: string | null
          team_id: number | null
          unmapped: boolean
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: number
          kind: string
          league_key?: string | null
          method?: string | null
          source_entity_id: string
          source_key: string
          source_name?: string | null
          team_id?: number | null
          unmapped?: boolean
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: number
          kind?: string
          league_key?: string | null
          method?: string | null
          source_entity_id?: string
          source_key?: string
          source_name?: string | null
          team_id?: number | null
          unmapped?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tipster_entity_map_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "tipster_sources"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tipster_entity_map_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_picks: {
        Row: {
          away_name: string | null
          bet_type: string | null
          created_at: string
          game_id: number | null
          home_name: string | null
          id: number
          kickoff_at: string | null
          league_name: string | null
          leg_index: number
          line: number | null
          market_text: string | null
          odds: number | null
          rationale: string | null
          resolution_note: string | null
          resolution_status: string
          resolved_at: string | null
          selection_text: string | null
          site_result: string | null
          slip_id: number
          source_away_id: string | null
          source_fixture_id: string | null
          source_home_id: string | null
          source_league_id: string | null
        }
        Insert: {
          away_name?: string | null
          bet_type?: string | null
          created_at?: string
          game_id?: number | null
          home_name?: string | null
          id?: number
          kickoff_at?: string | null
          league_name?: string | null
          leg_index: number
          line?: number | null
          market_text?: string | null
          odds?: number | null
          rationale?: string | null
          resolution_note?: string | null
          resolution_status?: string
          resolved_at?: string | null
          selection_text?: string | null
          site_result?: string | null
          slip_id: number
          source_away_id?: string | null
          source_fixture_id?: string | null
          source_home_id?: string | null
          source_league_id?: string | null
        }
        Update: {
          away_name?: string | null
          bet_type?: string | null
          created_at?: string
          game_id?: number | null
          home_name?: string | null
          id?: number
          kickoff_at?: string | null
          league_name?: string | null
          leg_index?: number
          line?: number | null
          market_text?: string | null
          odds?: number | null
          rationale?: string | null
          resolution_note?: string | null
          resolution_status?: string
          resolved_at?: string | null
          selection_text?: string | null
          site_result?: string | null
          slip_id?: number
          source_away_id?: string | null
          source_fixture_id?: string | null
          source_home_id?: string | null
          source_league_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipster_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "tipster_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "tipster_picks_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_picks_slip_id_fkey"
            columns: ["slip_id"]
            isOneToOne: false
            referencedRelation: "tipster_slips"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_slips: {
        Row: {
          author: string | null
          bet_id: number | null
          category: string | null
          combined_odds: number | null
          content_sha: string | null
          first_kickoff_at: string | null
          id: number
          modified_at: string | null
          num_legs: number
          parlay_id: number | null
          published_at: string | null
          published_pre_off: boolean | null
          scraped_at: string
          source_key: string
          source_slip_id: string
          title: string | null
          url: string
          wallet_id: number | null
        }
        Insert: {
          author?: string | null
          bet_id?: number | null
          category?: string | null
          combined_odds?: number | null
          content_sha?: string | null
          first_kickoff_at?: string | null
          id?: number
          modified_at?: string | null
          num_legs: number
          parlay_id?: number | null
          published_at?: string | null
          published_pre_off?: boolean | null
          scraped_at?: string
          source_key: string
          source_slip_id: string
          title?: string | null
          url: string
          wallet_id?: number | null
        }
        Update: {
          author?: string | null
          bet_id?: number | null
          category?: string | null
          combined_odds?: number | null
          content_sha?: string | null
          first_kickoff_at?: string | null
          id?: number
          modified_at?: string | null
          num_legs?: number
          parlay_id?: number | null
          published_at?: string | null
          published_pre_off?: boolean | null
          scraped_at?: string
          source_key?: string
          source_slip_id?: string
          title?: string | null
          url?: string
          wallet_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tipster_slips_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_slips_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "v_admin_picks"
            referencedColumns: ["bet_id"]
          },
          {
            foreignKeyName: "tipster_slips_bet_id_fkey"
            columns: ["bet_id"]
            isOneToOne: false
            referencedRelation: "v_recent_bets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_slips_parlay_id_fkey"
            columns: ["parlay_id"]
            isOneToOne: false
            referencedRelation: "parlays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_slips_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "tipster_sources"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tipster_slips_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_slips_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_sources: {
        Row: {
          base_url: string
          created_at: string
          entity_id_space: string | null
          key: string
          name: string
          notes: string | null
          robots_ok_at: string | null
        }
        Insert: {
          base_url: string
          created_at?: string
          entity_id_space?: string | null
          key: string
          name: string
          notes?: string | null
          robots_ok_at?: string | null
        }
        Update: {
          base_url?: string
          created_at?: string
          entity_id_space?: string | null
          key?: string
          name?: string
          notes?: string | null
          robots_ok_at?: string | null
        }
        Relationships: []
      }
      tipster_wallets: {
        Row: {
          author: string
          created_at: string
          source_key: string
          wallet_id: number
        }
        Insert: {
          author: string
          created_at?: string
          source_key: string
          wallet_id: number
        }
        Update: {
          author?: string
          created_at?: string
          source_key?: string
          wallet_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "tipster_wallets_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "tipster_sources"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tipster_wallets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: true
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_wallets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: true
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_basketball_player: {
        Row: {
          assists_rate: number | null
          assists_var: number | null
          current_team_id: number | null
          effective_games: number
          efg_pct: number | null
          efg_pct_var: number | null
          first_seen: string | null
          games: number
          last_seen: string | null
          minutes: number | null
          player_id: string
          player_name: string
          plus_minus_rate: number | null
          plus_minus_var: number | null
          points_rate: number | null
          points_var: number | null
          position: string | null
          rebounds_rate: number | null
          rebounds_var: number | null
          state_as_of: string | null
          teams_played: Json
          ts_pct: number | null
          ts_pct_var: number | null
          updated_at: string
        }
        Insert: {
          assists_rate?: number | null
          assists_var?: number | null
          current_team_id?: number | null
          effective_games?: number
          efg_pct?: number | null
          efg_pct_var?: number | null
          first_seen?: string | null
          games?: number
          last_seen?: string | null
          minutes?: number | null
          player_id: string
          player_name: string
          plus_minus_rate?: number | null
          plus_minus_var?: number | null
          points_rate?: number | null
          points_var?: number | null
          position?: string | null
          rebounds_rate?: number | null
          rebounds_var?: number | null
          state_as_of?: string | null
          teams_played?: Json
          ts_pct?: number | null
          ts_pct_var?: number | null
          updated_at?: string
        }
        Update: {
          assists_rate?: number | null
          assists_var?: number | null
          current_team_id?: number | null
          effective_games?: number
          efg_pct?: number | null
          efg_pct_var?: number | null
          first_seen?: string | null
          games?: number
          last_seen?: string | null
          minutes?: number | null
          player_id?: string
          player_name?: string
          plus_minus_rate?: number | null
          plus_minus_var?: number | null
          points_rate?: number | null
          points_var?: number | null
          position?: string | null
          rebounds_rate?: number | null
          rebounds_var?: number | null
          state_as_of?: string | null
          teams_played?: Json
          ts_pct?: number | null
          ts_pct_var?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_basketball_player_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_league: {
        Row: {
          avg_goals: number | null
          first_seen: string | null
          home_adv: number | null
          is_cup: boolean
          last_seen: string | null
          league_key: string
          level: number | null
          n_games: number
          n_teams: number
          sport: string
          spread: number | null
          state_as_of: string | null
          tier: number | null
          updated_at: string
        }
        Insert: {
          avg_goals?: number | null
          first_seen?: string | null
          home_adv?: number | null
          is_cup?: boolean
          last_seen?: string | null
          league_key: string
          level?: number | null
          n_games?: number
          n_teams?: number
          sport?: string
          spread?: number | null
          state_as_of?: string | null
          tier?: number | null
          updated_at?: string
        }
        Update: {
          avg_goals?: number | null
          first_seen?: string | null
          home_adv?: number | null
          is_cup?: boolean
          last_seen?: string | null
          league_key?: string
          level?: number | null
          n_games?: number
          n_teams?: number
          sport?: string
          spread?: number | null
          state_as_of?: string | null
          tier?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      twin_manager: {
        Row: {
          coach_id: string
          coach_name: string
          current_team_id: number | null
          first_seen: string | null
          formations_used: Json
          games: number
          last_seen: string | null
          leagues_managed: Json
          state_as_of: string | null
          teams_managed: Json
          updated_at: string
        }
        Insert: {
          coach_id: string
          coach_name: string
          current_team_id?: number | null
          first_seen?: string | null
          formations_used?: Json
          games?: number
          last_seen?: string | null
          leagues_managed?: Json
          state_as_of?: string | null
          teams_managed?: Json
          updated_at?: string
        }
        Update: {
          coach_id?: string
          coach_name?: string
          current_team_id?: number | null
          first_seen?: string | null
          formations_used?: Json
          games?: number
          last_seen?: string | null
          leagues_managed?: Json
          state_as_of?: string | null
          teams_managed?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_manager_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_player: {
        Row: {
          ability: number | null
          ability_var: number | null
          appearances: number
          current_team_id: number | null
          effective_games: number
          first_seen: string | null
          full_name: string | null
          last_seen: string | null
          leagues_played: Json
          player_id: string
          player_name: string
          position: string | null
          rated_games: number
          starts: number
          state_as_of: string | null
          teams_played: Json
          updated_at: string
        }
        Insert: {
          ability?: number | null
          ability_var?: number | null
          appearances?: number
          current_team_id?: number | null
          effective_games?: number
          first_seen?: string | null
          full_name?: string | null
          last_seen?: string | null
          leagues_played?: Json
          player_id: string
          player_name: string
          position?: string | null
          rated_games?: number
          starts?: number
          state_as_of?: string | null
          teams_played?: Json
          updated_at?: string
        }
        Update: {
          ability?: number | null
          ability_var?: number | null
          appearances?: number
          current_team_id?: number | null
          effective_games?: number
          first_seen?: string | null
          full_name?: string | null
          last_seen?: string | null
          leagues_played?: Json
          player_id?: string
          player_name?: string
          position?: string | null
          rated_games?: number
          starts?: number
          state_as_of?: string | null
          teams_played?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_player_current_team_id_fkey"
            columns: ["current_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_season_phase: {
        Row: {
          b_m1: number | null
          ceiling: number | null
          close_bss: number | null
          computed_at: string
          league_key: string
          m1_delta_brier: number | null
          m1_delta_t: number | null
          market: string
          n_test: number
          phase: string
          t_m1: number | null
          test_season: string
          train_seasons: string
          twin_bss: number | null
          twin_delta_brier: number | null
          twin_delta_t: number | null
        }
        Insert: {
          b_m1?: number | null
          ceiling?: number | null
          close_bss?: number | null
          computed_at?: string
          league_key: string
          m1_delta_brier?: number | null
          m1_delta_t?: number | null
          market: string
          n_test?: number
          phase: string
          t_m1?: number | null
          test_season?: string
          train_seasons?: string
          twin_bss?: number | null
          twin_delta_brier?: number | null
          twin_delta_t?: number | null
        }
        Update: {
          b_m1?: number | null
          ceiling?: number | null
          close_bss?: number | null
          computed_at?: string
          league_key?: string
          m1_delta_brier?: number | null
          m1_delta_t?: number | null
          market?: string
          n_test?: number
          phase?: string
          t_m1?: number | null
          test_season?: string
          train_seasons?: string
          twin_bss?: number | null
          twin_delta_brier?: number | null
          twin_delta_t?: number | null
        }
        Relationships: []
      }
      twin_team: {
        Row: {
          attack: number | null
          attack_var: number | null
          current_league: string | null
          current_season: string | null
          defence: number | null
          defence_var: number | null
          effective_games: number | null
          evidence_league: string | null
          first_seen: string | null
          last_seen: string | null
          league_changed: boolean
          leagues_played: Json
          name: string
          seasons_played: Json
          sport: string
          state_as_of: string | null
          team_id: number
          total_games: number
          updated_at: string
        }
        Insert: {
          attack?: number | null
          attack_var?: number | null
          current_league?: string | null
          current_season?: string | null
          defence?: number | null
          defence_var?: number | null
          effective_games?: number | null
          evidence_league?: string | null
          first_seen?: string | null
          last_seen?: string | null
          league_changed?: boolean
          leagues_played?: Json
          name: string
          seasons_played?: Json
          sport?: string
          state_as_of?: string | null
          team_id: number
          total_games?: number
          updated_at?: string
        }
        Update: {
          attack?: number | null
          attack_var?: number | null
          current_league?: string | null
          current_season?: string | null
          defence?: number | null
          defence_var?: number | null
          effective_games?: number | null
          evidence_league?: string | null
          first_seen?: string | null
          last_seen?: string | null
          league_changed?: boolean
          leagues_played?: Json
          name?: string
          seasons_played?: Json
          sport?: string
          state_as_of?: string | null
          team_id?: number
          total_games?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "twin_team_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_team_season: {
        Row: {
          away_games: number
          draws: number
          first_game: string | null
          ga_per_game: number | null
          games: number
          gf_per_game: number | null
          goals_against: number
          goals_for: number
          home_games: number
          last_game: string | null
          league_key: string
          losses: number
          points_per_game: number | null
          season: string
          team_id: number
          tier: number | null
          wins: number
        }
        Insert: {
          away_games?: number
          draws?: number
          first_game?: string | null
          ga_per_game?: number | null
          games?: number
          gf_per_game?: number | null
          goals_against?: number
          goals_for?: number
          home_games?: number
          last_game?: string | null
          league_key: string
          losses?: number
          points_per_game?: number | null
          season: string
          team_id: number
          tier?: number | null
          wins?: number
        }
        Update: {
          away_games?: number
          draws?: number
          first_game?: string | null
          ga_per_game?: number | null
          games?: number
          gf_per_game?: number | null
          goals_against?: number
          goals_for?: number
          home_games?: number
          last_game?: string | null
          league_key?: string
          losses?: number
          points_per_game?: number | null
          season?: string
          team_id?: number
          tier?: number | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "twin_team_season_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_real_bets: {
        Row: {
          bet_type: string
          bookmaker: string
          bookmaker_external_id: string | null
          created_at: string
          id: number
          legs: Json
          notes: string | null
          payout: number
          placed_at: string
          profit: number
          screenshot_url: string | null
          stake: number
          status: string
          total_odds: number
          updated_at: string
          user_id: number
        }
        Insert: {
          bet_type?: string
          bookmaker?: string
          bookmaker_external_id?: string | null
          created_at?: string
          id?: number
          legs?: Json
          notes?: string | null
          payout?: number
          placed_at: string
          profit?: number
          screenshot_url?: string | null
          stake: number
          status?: string
          total_odds: number
          updated_at?: string
          user_id: number
        }
        Update: {
          bet_type?: string
          bookmaker?: string
          bookmaker_external_id?: string | null
          created_at?: string
          id?: number
          legs?: Json
          notes?: string | null
          payout?: number
          placed_at?: string
          profit?: number
          screenshot_url?: string | null
          stake?: number
          status?: string
          total_odds?: number
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_real_bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          league_key: string
          sport: string
          user_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          is_active?: boolean
          league_key: string
          sport?: string
          user_id: number
        }
        Update: {
          created_at?: string
          id?: number
          is_active?: boolean
          league_key?: string
          sport?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallet_subscriptions: {
        Row: {
          created_at: string
          credits_spent: number
          expires_at: string | null
          id: number
          is_active: boolean
          last_renewed_at: string | null
          user_id: number
          wallet_id: number
        }
        Insert: {
          created_at?: string
          credits_spent?: number
          expires_at?: string | null
          id?: number
          is_active?: boolean
          last_renewed_at?: string | null
          user_id: number
          wallet_id: number
        }
        Update: {
          created_at?: string
          credits_spent?: number
          expires_at?: string | null
          id?: number
          is_active?: boolean
          last_renewed_at?: string | null
          user_id?: number
          wallet_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_wallet_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wallet_subscriptions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wallet_subscriptions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_uid: string | null
          avatar_url: string | null
          created_at: string | null
          device_type: string | null
          display_name: string | null
          email: string | null
          free_league_key: string | null
          id: number
          is_active: boolean | null
          last_login: string | null
          name: string | null
          notification_prefs: Json | null
          onboarding_completed: boolean | null
          password_hash: string
          plan_expires_at: string | null
          plan_id: number | null
          preferred_sports: string[] | null
          preferred_wallet_id: number | null
          push_token: string | null
          role: string | null
          timezone: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          auth_uid?: string | null
          avatar_url?: string | null
          created_at?: string | null
          device_type?: string | null
          display_name?: string | null
          email?: string | null
          free_league_key?: string | null
          id?: number
          is_active?: boolean | null
          last_login?: string | null
          name?: string | null
          notification_prefs?: Json | null
          onboarding_completed?: boolean | null
          password_hash: string
          plan_expires_at?: string | null
          plan_id?: number | null
          preferred_sports?: string[] | null
          preferred_wallet_id?: number | null
          push_token?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          auth_uid?: string | null
          avatar_url?: string | null
          created_at?: string | null
          device_type?: string | null
          display_name?: string | null
          email?: string | null
          free_league_key?: string | null
          id?: number
          is_active?: boolean | null
          last_login?: string | null
          name?: string | null
          notification_prefs?: Json | null
          onboarding_completed?: boolean | null
          password_hash?: string
          plan_expires_at?: string | null
          plan_id?: number | null
          preferred_sports?: string[] | null
          preferred_wallet_id?: number | null
          push_token?: string | null
          role?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_scorecards: {
        Row: {
          brier_ema: number | null
          calmar: number | null
          clv_avg: number | null
          computed_at: string
          gamma_value: number | null
          id: number
          max_drawdown_pct: number | null
          n_bets: number
          n_won: number
          pct_green_days: number | null
          pnl: number | null
          regime_flag: string | null
          roi: number | null
          sharpe: number | null
          sortino: number | null
          total_staked: number | null
          verdict: string | null
          wallet_id: number
          win_rate: number | null
          window_days: number
        }
        Insert: {
          brier_ema?: number | null
          calmar?: number | null
          clv_avg?: number | null
          computed_at?: string
          gamma_value?: number | null
          id?: number
          max_drawdown_pct?: number | null
          n_bets?: number
          n_won?: number
          pct_green_days?: number | null
          pnl?: number | null
          regime_flag?: string | null
          roi?: number | null
          sharpe?: number | null
          sortino?: number | null
          total_staked?: number | null
          verdict?: string | null
          wallet_id: number
          win_rate?: number | null
          window_days: number
        }
        Update: {
          brier_ema?: number | null
          calmar?: number | null
          clv_avg?: number | null
          computed_at?: string
          gamma_value?: number | null
          id?: number
          max_drawdown_pct?: number | null
          n_bets?: number
          n_won?: number
          pct_green_days?: number | null
          pnl?: number | null
          regime_flag?: string | null
          roi?: number | null
          sharpe?: number | null
          sortino?: number | null
          total_staked?: number | null
          verdict?: string | null
          wallet_id?: number
          win_rate?: number | null
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "wallet_scorecards_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_scorecards_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          archetype: string | null
          balance: number
          bio: string | null
          created_at: string | null
          id: number
          initial_balance: number
          is_active: boolean | null
          is_public: boolean
          lifecycle: string
          name: string
          persona_name: string | null
          roi: number | null
          total_bets: number | null
          total_lost: number | null
          total_profit: number | null
          total_won: number | null
          updated_at: string | null
          user_id: number | null
          win_rate: number | null
        }
        Insert: {
          archetype?: string | null
          balance?: number
          bio?: string | null
          created_at?: string | null
          id?: number
          initial_balance?: number
          is_active?: boolean | null
          is_public?: boolean
          lifecycle?: string
          name?: string
          persona_name?: string | null
          roi?: number | null
          total_bets?: number | null
          total_lost?: number | null
          total_profit?: number | null
          total_won?: number | null
          updated_at?: string | null
          user_id?: number | null
          win_rate?: number | null
        }
        Update: {
          archetype?: string | null
          balance?: number
          bio?: string | null
          created_at?: string | null
          id?: number
          initial_balance?: number
          is_active?: boolean | null
          is_public?: boolean
          lifecycle?: string
          name?: string
          persona_name?: string | null
          roi?: number | null
          total_bets?: number | null
          total_lost?: number | null
          total_profit?: number | null
          total_won?: number | null
          updated_at?: string | null
          user_id?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      wc_outright_odds: {
        Row: {
          group_letter: string | null
          id: number
          line_value: number | null
          market_type: string
          odds: number
          scraped_at: string
          scraped_date: string
          side: string
          source: string
          team: string
          url: string | null
        }
        Insert: {
          group_letter?: string | null
          id?: number
          line_value?: number | null
          market_type: string
          odds: number
          scraped_at?: string
          scraped_date?: string
          side?: string
          source?: string
          team: string
          url?: string | null
        }
        Update: {
          group_letter?: string | null
          id?: number
          line_value?: number | null
          market_type?: string
          odds?: number
          scraped_at?: string
          scraped_date?: string
          side?: string
          source?: string
          team?: string
          url?: string | null
        }
        Relationships: []
      }
      wc_squads: {
        Row: {
          age: number | null
          created_at: string | null
          id: number
          jersey: number | null
          nt_assists: number | null
          nt_goals: number | null
          nt_matches: number | null
          nt_minutes: number | null
          player_fs_id: string | null
          player_name: string
          position_group: string | null
          team_id: number | null
          team_name: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string | null
          id?: never
          jersey?: number | null
          nt_assists?: number | null
          nt_goals?: number | null
          nt_matches?: number | null
          nt_minutes?: number | null
          player_fs_id?: string | null
          player_name: string
          position_group?: string | null
          team_id?: number | null
          team_name: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string | null
          id?: never
          jersey?: number | null
          nt_assists?: number | null
          nt_goals?: number | null
          nt_matches?: number | null
          nt_minutes?: number | null
          player_fs_id?: string | null
          player_name?: string
          position_group?: string | null
          team_id?: number | null
          team_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wc_squads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      external_match_facts: {
        Row: {
          ah_away_avg: number | null
          ah_away_max: number | null
          ah_home_avg: number | null
          ah_home_max: number | null
          ah_line: number | null
          away_corners: number | null
          away_fouls: number | null
          away_goals_ht: number | null
          away_reds: number | null
          away_shots: number | null
          away_shots_on_target: number | null
          away_yellows: number | null
          fd_away_goals: number | null
          fd_home_goals: number | null
          game_id: number | null
          home_corners: number | null
          home_fouls: number | null
          home_goals_ht: number | null
          home_reds: number | null
          home_shots: number | null
          home_shots_on_target: number | null
          home_yellows: number | null
          ht_result: string | null
          league_key: string | null
          match_date: string | null
          referee: string | null
          season: string | null
          source: string | null
        }
        Insert: {
          ah_away_avg?: never
          ah_away_max?: never
          ah_home_avg?: never
          ah_home_max?: never
          ah_line?: never
          away_corners?: never
          away_fouls?: never
          away_goals_ht?: never
          away_reds?: never
          away_shots?: never
          away_shots_on_target?: never
          away_yellows?: never
          fd_away_goals?: never
          fd_home_goals?: never
          game_id?: number | null
          home_corners?: never
          home_fouls?: never
          home_goals_ht?: never
          home_reds?: never
          home_shots?: never
          home_shots_on_target?: never
          home_yellows?: never
          ht_result?: never
          league_key?: string | null
          match_date?: string | null
          referee?: never
          season?: string | null
          source?: string | null
        }
        Update: {
          ah_away_avg?: never
          ah_away_max?: never
          ah_home_avg?: never
          ah_home_max?: never
          ah_line?: never
          away_corners?: never
          away_fouls?: never
          away_goals_ht?: never
          away_reds?: never
          away_shots?: never
          away_shots_on_target?: never
          away_yellows?: never
          fd_away_goals?: never
          fd_home_goals?: never
          game_id?: number | null
          home_corners?: never
          home_fouls?: never
          home_goals_ht?: never
          home_reds?: never
          home_shots?: never
          home_shots_on_target?: never
          home_yellows?: never
          ht_result?: never
          league_key?: string | null
          match_date?: string | null
          referee?: never
          season?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      external_score_conflicts: {
        Row: {
          away_team: string | null
          game_id: number | null
          home_team: string | null
          league_key: string | null
          match_date: string | null
          ours_away: number | null
          ours_home: number | null
          season: string | null
          theirs_away: number | null
          theirs_home: number | null
        }
        Relationships: [
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "closing_odds_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      league_active_clubs: {
        Row: {
          league_key: string | null
          n_active_clubs: number | null
          season: string | null
        }
        Relationships: []
      }
      league_corpus: {
        Row: {
          first_game: string | null
          last_game: string | null
          league_key: string | null
          n_games: number | null
          n_played: number | null
          n_seasons: number | null
          n_upcoming: number | null
          next_fixture: string | null
          sport: string | null
        }
        Relationships: []
      }
      mv_player_game_stats: {
        Row: {
          ast: number | null
          blocks: number | null
          dreb: number | null
          game_date: string | null
          game_id: number | null
          league_key: string | null
          minutes_raw: string | null
          oreb: number | null
          player_name: string | null
          pts: number | null
          reb: number | null
          season: string | null
          side: string | null
          steals: number | null
          threes: number | null
          tov: number | null
        }
        Relationships: []
      }
      odds_snapshots_latest: {
        Row: {
          away_team_id: number | null
          captured_at: string | null
          game_date: string | null
          game_id: number | null
          home_team_id: number | null
          league_key: string | null
          odds_away: number | null
          odds_btts_no: number | null
          odds_btts_yes: number | null
          odds_dc_12: number | null
          odds_dc_1x: number | null
          odds_dc_x2: number | null
          odds_draw: number | null
          odds_home: number | null
          odds_over: number | null
          odds_over_15: number | null
          odds_over_25: number | null
          odds_over_35: number | null
          odds_raw: Json | null
          odds_spread_away: number | null
          odds_spread_home: number | null
          odds_under: number | null
          odds_under_15: number | null
          odds_under_25: number | null
          odds_under_35: number | null
          source: string | null
          sport: string | null
          spread_line: number | null
          total_line: number | null
        }
        Relationships: [
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "odds_snapshots_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      tipster_coverage: {
        Row: {
          author: string | null
          category: string | null
          first_slip: string | null
          last_slip: string | null
          legs: number | null
          legs_ambiguous: number | null
          legs_no_fixture: number | null
          legs_no_market: number | null
          legs_resolved: number | null
          slips: number | null
          slips_in_ledger: number | null
          source_key: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipster_slips_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "tipster_sources"
            referencedColumns: ["key"]
          },
        ]
      }
      twin_fixture_risk: {
        Row: {
          away_changed_league: boolean | null
          away_evidence_league: string | null
          away_games_in_league: number | null
          away_team: string | null
          away_total_games: number | null
          blind_side: string | null
          date: string | null
          game_id: number | null
          home_changed_league: boolean | null
          home_evidence_league: string | null
          home_games_in_league: number | null
          home_team: string | null
          home_total_games: number | null
          league_key: string | null
          season: string | null
          status: string | null
        }
        Relationships: []
      }
      twin_league_transitions: {
        Row: {
          direction: string | null
          from_games: number | null
          from_gf_pg: number | null
          from_league: string | null
          from_ppg: number | null
          from_season: string | null
          name: string | null
          team_id: number | null
          to_games: number | null
          to_league: string | null
          to_season: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twin_team_season_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      twin_team_history: {
        Row: {
          draws: number | null
          first_game: string | null
          ga_per_game: number | null
          games: number | null
          gf_per_game: number | null
          goals_against: number | null
          goals_for: number | null
          last_game: string | null
          league_key: string | null
          losses: number | null
          name: string | null
          points_per_game: number | null
          season: string | null
          team_id: number | null
          tier: number | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "twin_team_season_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_active_predictions: {
        Row: {
          away_team: string | null
          away_win_prob: number | null
          confidence: number | null
          created_at: string | null
          draw_prob: number | null
          expected_value: number | null
          game_date: string | null
          game_id: number | null
          home_team: string | null
          home_win_prob: number | null
          id: number | null
          kelly_percentage: number | null
          league_key: string | null
          model_version: string | null
          prediction: string | null
          sport: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "predictions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
        ]
      }
      v_admin_picks: {
        Row: {
          away_team: string | null
          away_win_prob: number | null
          bet_id: number | null
          bet_type: string | null
          confidence: number | null
          draw_prob: number | null
          expected_value: number | null
          game_date: string | null
          game_id: number | null
          home_team: string | null
          home_win_prob: number | null
          kelly_percentage: number | null
          league_key: string | null
          model_version: string | null
          odds: number | null
          placed_at: string | null
          predicted_prob: number | null
          profit: number | null
          sport: string | null
          stake: number | null
          status: string | null
          strategy: string | null
          wallet_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "mv_player_game_stats"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "twin_fixture_risk"
            referencedColumns: ["game_id"]
          },
          {
            foreignKeyName: "bets_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "vw_games_needing_scrape"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_sport_fkey"
            columns: ["sport"]
            isOneToOne: false
            referencedRelation: "sports"
            referencedColumns: ["key"]
          },
        ]
      }
      v_model_comparison: {
        Row: {
          accuracy: number | null
          actual_brier_score: number | null
          avg_confidence: number | null
          brier_score: number | null
          correct_predictions: number | null
          is_active: boolean | null
          name: string | null
          predictions_made: number | null
          roi: number | null
          total_bets: number | null
          version: string | null
          win_rate: number | null
        }
        Relationships: []
      }
      v_recent_bets: {
        Row: {
          away_goals: number | null
          away_team: string | null
          bet_type: string | null
          confidence: number | null
          game_date: string | null
          home_goals: number | null
          home_team: string | null
          id: number | null
          league_key: string | null
          model_version: string | null
          odds: number | null
          placed_at: string | null
          profit: number | null
          settled_at: string | null
          stake: number | null
          status: string | null
          wallet_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_tipster_wallet_coverage: {
        Row: {
          author: string | null
          coverage_pct: number | null
          first_seen: string | null
          last_seen: string | null
          legs: number | null
          legs_no_fixture: number | null
          legs_no_market: number | null
          legs_resolved: number | null
          slips: number | null
          slips_in_ledger: number | null
          source_key: string | null
          verdict_agree: number | null
          verdict_comparable: number | null
          wallet_id: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tipster_slips_source_key_fkey"
            columns: ["source_key"]
            isOneToOne: false
            referencedRelation: "tipster_sources"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tipster_slips_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_performance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipster_slips_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      v_wallet_balance_history: {
        Row: {
          pnl_cum: number | null
          ts: string | null
          wallet_id: number | null
        }
        Relationships: []
      }
      v_wallet_performance: {
        Row: {
          balance: number | null
          id: number | null
          initial_balance: number | null
          name: string | null
          pending_amount: number | null
          pending_bets: number | null
          roi: number | null
          total_bets: number | null
          total_lost: number | null
          total_profit: number | null
          total_won: number | null
          win_rate: number | null
        }
        Relationships: []
      }
      vw_games_needing_scrape: {
        Row: {
          date: string | null
          flashscore_url: string | null
          id: number | null
          last_scraped_at: string | null
          league_key: string | null
          reason: string | null
          scrape_attempts: number | null
          season: string | null
          successful_scrapes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _fd_num: { Args: { t: string }; Returns: number }
      auth_user_id: { Args: never; Returns: number }
      bump_sequence: {
        Args: { p_column?: string; p_table: string }
        Returns: number
      }
      estimate_missing_xg: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      find_duplicate_games: {
        Args: never
        Returns: {
          away_team: string
          count: number
          date: string
          game_ids: number[]
          home_team: string
          league_key: string
          season: string
        }[]
      }
      find_round_duplicates:
        | {
            Args: { p_league_key: string; p_season: string }
            Returns: {
              away_team: string
              duplicate_count: number
              game_ids: number[]
              home_team: string
              round: number
            }[]
          }
        | {
            Args: { p_league_key: string; p_round?: number; p_season?: string }
            Returns: {
              away_team_id: number
              duplicate_count: number
              flashscore_urls: string[]
              game_dates: string[]
              game_ids: string[]
              home_team_id: number
              round_number: string
            }[]
          }
      games_incomplete_scraping: {
        Args: { p_league_key?: string; p_season?: string }
        Returns: {
          away_team: string
          date: string
          home_team: string
          id: number
          league_key: string
          missing_data: string[]
          season: string
        }[]
      }
      games_missing_flashscore_urls: {
        Args: { p_league_key?: string; p_season?: string }
        Returns: {
          away_team: string
          date: string
          home_team: string
          id: number
          league_key: string
          season: string
          status: string
        }[]
      }
      get_league_analysis: {
        Args: { p_league_key: string; p_season?: string }
        Returns: Json
      }
      get_wallet_breakdown: { Args: { p_wallet_id: number }; Returns: Json }
      get_wallet_performance: {
        Args: { p_wallet_id?: number }
        Returns: {
          n_pending: number
          n_wagers: number
          n_won: number
          p_luck: number
          pnl: number
          roi_pct: number
          turnover: number
          verdict: string
          wallet_id: number
          win_rate_pct: number
        }[]
      }
      league_bet_counts: {
        Args: { p_since?: string }
        Returns: {
          league_key: string
          n: number
          pending: number
        }[]
      }
      league_data_completeness: {
        Args: { p_league_key: string; p_season?: string }
        Returns: {
          completed_games: number
          completeness_pct: number
          games_with_lineups: number
          games_with_possession: number
          games_with_xg: number
          league_key: string
          scheduled_games: number
          season: string
          total_games: number
        }[]
      }
      line_scores_currency: {
        Args: never
        Returns: {
          last_date: string
          n_graded: number
          n_rows: number
          source: string
          unscored_completed: number
        }[]
      }
      line_scores_model_vs_close: {
        Args: { p_cells: Json; p_since?: string }
        Returns: {
          brier_close: number
          brier_ours: number
          bss: number
          first_date: string
          last_date: string
          league_key: string
          market: string
          n: number
          source: string
        }[]
      }
      mark_notification_read: { Args: { p_id: number }; Returns: undefined }
      player_profile_basketball: {
        Args: { p_log_limit?: number; p_player_id: string; p_season?: string }
        Returns: Json
      }
      player_profile_football: {
        Args: { p_log_limit?: number; p_player_id: string; p_season?: string }
        Returns: Json
      }
      player_resolve: {
        Args: { p_id: string }
        Returns: {
          player_id: string
          sport: string
        }[]
      }
      remove_duplicate_games: {
        Args: never
        Returns: {
          deleted_count: number
          kept_count: number
        }[]
      }
      remove_round_duplicate: {
        Args: { p_game_id_to_keep: number; p_game_ids_to_delete: number[] }
        Returns: {
          deleted_count: number
          kept_game_id: number
          message: string
        }[]
      }
      subscribe_to_wallet: { Args: { p_wallet_id: number }; Returns: Json }
      swap_free_league: { Args: { p_league_key: string }; Returns: Json }
      twin_managers_by_league: {
        Args: { p_league_key: string; p_limit?: number }
        Returns: {
          coach_id: string
          coach_name: string
          current_team_id: number
          first_seen: string
          formations_used: Json
          games: number
          last_seen: string
          leagues_managed: Json
          state_as_of: string
          teams_managed: Json
        }[]
      }
      unlock_league: { Args: { p_league_key: string }; Returns: Json }
      unsubscribe_from_wallet: { Args: { p_wallet_id: number }; Returns: Json }
      update_game_status: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
      update_notification_prefs: { Args: { p_prefs: Json }; Returns: Json }
      validate_all_leagues: {
        Args: { p_season?: string }
        Returns: {
          league_key: string
          lineups_pct: number
          ml_ready_pct: number
          overall_status: string
          scraped_pct: number
          total_games: number
          xg_pct: number
        }[]
      }
      validate_league_by_round: {
        Args: { p_league_key: string; p_season: string }
        Returns: {
          expected_games: number
          formations_count: number
          has_lineups: number
          has_odds: number
          has_referee: number
          has_scraped: number
          has_urls: number
          has_xg: number
          ml_ready_count: number
          round: number
          total_games: number
        }[]
      }
      validate_league_season: {
        Args: { p_league_key: string; p_season?: string }
        Returns: {
          current_value: string
          expected_value: string
          is_ready: boolean
          percentage: number
          status: string
          validation_item: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

