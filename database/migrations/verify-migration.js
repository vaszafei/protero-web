#!/usr/bin/env node

/**
 * Verify Supabase Migration
 * Tests that tables and RPC functions exist
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verifying Supabase Migration...\n');

async function verify() {
  const results = {
    tables: {},
    functions: {},
    data: {}
  };

  // 1. Check tables exist
  console.log('📋 Checking Tables...');
  const tables = ['leagues', 'standings', 'referees', 'games', 'teams', 'lineups'];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        results.tables[table] = `❌ Error: ${error.message}`;
      } else {
        results.tables[table] = `✅ Exists (${count} rows)`;
      }
    } catch (err) {
      results.tables[table] = `❌ Failed: ${err.message}`;
    }
  }

  // 2. Check RPC functions exist
  console.log('\n⚙️  Checking RPC Functions...');
  const functions = [
    'find_duplicate_games',
    'league_data_completeness',
    'games_missing_flashscore_urls',
    'validate_all_leagues'
  ];

  for (const func of functions) {
    try {
      const { data, error } = await supabase.rpc(func, 
        func === 'league_data_completeness' ? { p_league_key: 'premier_league' } :
        func === 'validate_all_leagues' ? { p_season: '2025-2026' } : {}
      );
      
      if (error) {
        results.functions[func] = `❌ Error: ${error.message}`;
      } else {
        results.functions[func] = `✅ Works`;
      }
    } catch (err) {
      results.functions[func] = `❌ Failed: ${err.message}`;
    }
  }

  // 3. Check sample data
  console.log('\n📊 Checking Data...');
  
  // Check leagues
  const { data: leaguesData, error: leaguesError } = await supabase
    .from('leagues')
    .select('key, name')
    .order('priority');
  
  if (!leaguesError && leaguesData) {
    results.data.leagues = `✅ ${leaguesData.length} leagues found`;
    console.log('   Leagues:', leaguesData.map(l => l.key).join(', '));
  } else {
    results.data.leagues = `❌ Error loading leagues`;
  }

  // Check games
  const { count: gamesCount } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });
  
  results.data.games = `✅ ${gamesCount || 0} games total`;

  // Check teams
  const { count: teamsCount } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true });
  
  results.data.teams = `✅ ${teamsCount || 0} teams total`;

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n📋 Tables:');
  for (const [table, status] of Object.entries(results.tables)) {
    console.log(`   ${table.padEnd(20)} ${status}`);
  }

  console.log('\n⚙️  RPC Functions:');
  for (const [func, status] of Object.entries(results.functions)) {
    console.log(`   ${func.padEnd(30)} ${status}`);
  }

  console.log('\n📊 Data:');
  for (const [key, status] of Object.entries(results.data)) {
    console.log(`   ${key.padEnd(20)} ${status}`);
  }

  // Check if games table has new columns
  console.log('\n🔧 Checking new columns in games table...');
  const { data: sampleGame } = await supabase
    .from('games')
    .select('id, flashscore_url, referee_id')
    .limit(1)
    .single();
  
  if (sampleGame) {
    console.log('   flashscore_url column:', sampleGame.hasOwnProperty('flashscore_url') ? '✅ Exists' : '❌ Missing');
    console.log('   referee_id column:', sampleGame.hasOwnProperty('referee_id') ? '✅ Exists' : '❌ Missing');
  }

  console.log('\n' + '='.repeat(60));
  
  // Overall status
  const allTablesOk = Object.values(results.tables).every(s => s.startsWith('✅'));
  const allFunctionsOk = Object.values(results.functions).every(s => s.startsWith('✅'));
  
  if (allTablesOk && allFunctionsOk) {
    console.log('✅ Migration Successful! All checks passed.');
    console.log('\nNext steps:');
    console.log('1. Test db-maintenance: cd protero-tools && node bin/db-maintenance.js list-duplicates');
    console.log('2. Start frontend: cd protero-frontend && npm run dev');
  } else {
    console.log('⚠️  Some checks failed. Review errors above.');
  }
  
  console.log('='.repeat(60) + '\n');
}

verify().catch(console.error);
