# 🔥 Supabase Implementation Guide for Protero

## 📋 Overview

**Supabase** = Firebase alternative with PostgreSQL + Real-time + Auth + Storage

### Why Supabase for Your App:
✅ **Real-time score updates** - Games update live without refresh
✅ **PostgreSQL** - Powerful queries, joins, aggregations
✅ **Built-in Authentication** - User accounts, saved predictions
✅ **Row Level Security** - Secure data access
✅ **Free Tier** - 500MB database, 2GB bandwidth, 50k monthly users
✅ **Auto-generated REST API** - No need to write endpoints
✅ **TypeScript Support** - Full type safety

---

## 💰 Supabase Free Tier

```
Database:        500MB (enough for ~100k+ matches)
Bandwidth:       2GB/month (egress)
Storage:         1GB (for team logos, etc.)
Auth Users:      50,000 monthly active
Edge Functions:  500,000 invocations
Realtime:        Unlimited connections
API Requests:    Unlimited
```

**Your usage estimate:**
- 7 leagues × 380 matches × 2KB = ~5MB data
- 1000 daily visitors × 10 requests = 10k requests/day
- **Well within free tier limits** ✅

---

## 🚀 Step-by-Step Setup (30 minutes)

### Step 1: Create Supabase Project (5 min)

```bash
# Go to https://supabase.com
# Click "Start your project"
# Create organization: "Protero"
# Create project: "protero-football"
# Choose region: Europe (West) - closest to you
# Generate strong password (save it!)
# Wait 2 minutes for project to provision
```

### Step 2: Install Dependencies (2 min)

```bash
cd /home/zafnitlab/Desktop/protero
npm install @supabase/supabase-js
npm install --save-dev @supabase/supabase-js
```

### Step 3: Get API Keys (1 min)

In Supabase Dashboard:
- Go to Project Settings → API
- Copy **Project URL** (like: https://xxxx.supabase.co)
- Copy **anon/public** key
- Copy **service_role** key (for server-side)

**File: `.env`**
```bash
# Public keys (safe for frontend)
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your-anon-key-here

# Server-only keys (never expose)
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

---

## 🗄️ Database Schema (Copy-paste into Supabase SQL Editor)

### Step 4: Create Tables (5 min)

```sql
-- =====================================================
-- LEAGUES TABLE
-- =====================================================
CREATE TABLE leagues (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT,
  country TEXT,
  current_round INTEGER DEFAULT 1,
  season TEXT DEFAULT '2025-2026',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  league_key TEXT NOT NULL REFERENCES leagues(key) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team_key TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_key, team_key)
);

-- =====================================================
-- STANDINGS TABLE
-- =====================================================
CREATE TABLE standings (
  id SERIAL PRIMARY KEY,
  league_key TEXT NOT NULL REFERENCES leagues(key) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season TEXT DEFAULT '2025-2026',
  gp INTEGER DEFAULT 0,
  w INTEGER DEFAULT 0,
  d INTEGER DEFAULT 0,
  l INTEGER DEFAULT 0,
  gf INTEGER DEFAULT 0,
  ga INTEGER DEFAULT 0,
  pts INTEGER DEFAULT 0,
  position INTEGER,
  form TEXT, -- Last 5 games: "WWDLW"
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_key, team_id, season)
);

-- =====================================================
-- GAMES TABLE
-- =====================================================
CREATE TABLE games (
  id SERIAL PRIMARY KEY,
  league_key TEXT NOT NULL REFERENCES leagues(key) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  home_team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_goals INTEGER,
  away_goals INTEGER,
  date TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, finished, postponed
  venue TEXT,
  referee TEXT,
  attendance INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ODDS TABLE
-- =====================================================
CREATE TABLE odds (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  bookmaker TEXT DEFAULT 'average',
  home_odds DECIMAL(5,2),
  draw_odds DECIMAL(5,2),
  away_odds DECIMAL(5,2),
  over_15_odds DECIMAL(5,2),
  under_15_odds DECIMAL(5,2),
  over_25_odds DECIMAL(5,2),
  under_25_odds DECIMAL(5,2),
  over_35_odds DECIMAL(5,2),
  under_35_odds DECIMAL(5,2),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, bookmaker)
);

-- =====================================================
-- PREDICTIONS TABLE (Your ML/Stats Analysis)
-- =====================================================
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  prediction TEXT NOT NULL, -- "Arsenal win", "Over 2.5", etc.
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  recommended_bet TEXT,
  explanation TEXT,
  model_version TEXT DEFAULT 'v1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id)
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================
CREATE INDEX idx_games_league_round ON games(league_key, round);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_date ON games(date);
CREATE INDEX idx_standings_league ON standings(league_key);
CREATE INDEX idx_standings_pts ON standings(pts DESC);
CREATE INDEX idx_teams_league ON teams(league_key);

-- =====================================================
-- AUTO-UPDATE TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON leagues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standings_updated_at BEFORE UPDATE ON standings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_odds_updated_at BEFORE UPDATE ON odds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Allow public read access (everyone can view)
CREATE POLICY "Public read access" ON leagues FOR SELECT USING (true);
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON standings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access" ON odds FOR SELECT USING (true);
CREATE POLICY "Public read access" ON predictions FOR SELECT USING (true);

-- Only service role can write (your backend)
CREATE POLICY "Service role write" ON leagues FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role write" ON teams FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role write" ON standings FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role write" ON games FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role write" ON odds FOR ALL USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service role write" ON predictions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
```

---

## 🔄 Step 5: Migrate Your JSON Data to Supabase (10 min)

**File: `tools/migrate_to_supabase.js`**
```javascript
#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Initialize Supabase client with SERVICE KEY (has write permissions)
const supabase = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for migrations
)

const LEAGUES = [
  { key: 'premier_league', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', country: 'England' },
  { key: 'la_liga', name: 'La Liga', flag: '🇪🇸', country: 'Spain' },
  { key: 'bundesliga', name: 'Bundesliga', flag: '🇩🇪', country: 'Germany' },
  { key: 'serie_a', name: 'Serie A', flag: '🇮🇹', country: 'Italy' },
  { key: 'ligue1', name: 'Ligue 1', flag: '🇫🇷', country: 'France' }
]

async function migrateLeague(leagueConfig) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`📊 Migrating ${leagueConfig.name}`)
  console.log('='.repeat(70))
  
  try {
    // Read JSON file
    const filePath = path.join(__dirname, '..', 'public', 'data', 'leagues', `${leagueConfig.key}.json`)
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    // 1. Insert league
    console.log('  📝 Inserting league...')
    const { error: leagueError } = await supabase
      .from('leagues')
      .upsert({
        key: leagueConfig.key,
        name: leagueConfig.name,
        flag: leagueConfig.flag,
        country: leagueConfig.country,
        current_round: getCurrentRound(jsonData.games),
        season: '2025-2026'
      })
    
    if (leagueError) throw leagueError
    
    // 2. Insert teams from standings
    console.log('  👥 Inserting teams...')
    const teams = jsonData.standings.map(s => ({
      league_key: leagueConfig.key,
      name: s.team || s.Team,
      team_key: s.team_key || (s.team || s.Team).toLowerCase().replace(/\s+/g, '_')
    }))
    
    const { data: insertedTeams, error: teamsError } = await supabase
      .from('teams')
      .upsert(teams, { onConflict: 'league_key,team_key' })
      .select()
    
    if (teamsError) throw teamsError
    
    // Create team name to ID mapping
    const teamMap = {}
    insertedTeams.forEach(t => {
      teamMap[t.name.toLowerCase()] = t.id
    })
    
    console.log(`     ✅ ${insertedTeams.length} teams`)
    
    // 3. Insert standings
    console.log('  📊 Inserting standings...')
    const standings = jsonData.standings.map((s, index) => ({
      league_key: leagueConfig.key,
      team_id: teamMap[(s.team || s.Team).toLowerCase()],
      season: '2025-2026',
      gp: s.gp || s.GP,
      w: s.w || s.W,
      d: s.d || s.D,
      l: s.l || s.L,
      gf: s.gf || s.GF,
      ga: s.ga || s.GA,
      pts: s.pts || s.Pts,
      position: index + 1,
      form: s.last5_raw || s.Last5 || ''
    }))
    
    const { error: standingsError } = await supabase
      .from('standings')
      .upsert(standings, { onConflict: 'league_key,team_id,season' })
    
    if (standingsError) throw standingsError
    console.log(`     ✅ ${standings.length} standings`)
    
    // 4. Insert games
    console.log('  🎮 Inserting games...')
    const games = jsonData.games
      .filter(g => g.home && g.away) // Skip games without teams
      .map(g => {
        const homeId = teamMap[g.home.toLowerCase()]
        const awayId = teamMap[g.away.toLowerCase()]
        
        if (!homeId || !awayId) {
          console.log(`     ⚠️  Skipping: ${g.home} vs ${g.away} (team not found)`)
          return null
        }
        
        return {
          league_key: leagueConfig.key,
          round: g.round,
          home_team_id: homeId,
          away_team_id: awayId,
          home_goals: g.home_goals,
          away_goals: g.away_goals,
          date: g.date !== 'TBD' ? g.date : null,
          status: g.home_goals !== null ? 'finished' : 'scheduled'
        }
      })
      .filter(g => g !== null)
    
    // Insert in batches of 100
    for (let i = 0; i < games.length; i += 100) {
      const batch = games.slice(i, i + 100)
      const { error: gamesError } = await supabase
        .from('games')
        .insert(batch)
      
      if (gamesError) throw gamesError
    }
    
    console.log(`     ✅ ${games.length} games`)
    
    // 5. Insert odds
    console.log('  💰 Inserting odds...')
    const { data: insertedGames } = await supabase
      .from('games')
      .select('id, round, home_team_id, away_team_id')
      .eq('league_key', leagueConfig.key)
    
    const gameIdMap = {}
    insertedGames.forEach(g => {
      const key = `${g.round}_${g.home_team_id}_${g.away_team_id}`
      gameIdMap[key] = g.id
    })
    
    const odds = []
    jsonData.games.forEach(g => {
      if (g.odds && g.home && g.away) {
        const homeId = teamMap[g.home.toLowerCase()]
        const awayId = teamMap[g.away.toLowerCase()]
        const key = `${g.round}_${homeId}_${awayId}`
        const gameId = gameIdMap[key]
        
        if (gameId) {
          odds.push({
            game_id: gameId,
            bookmaker: 'average',
            home_odds: g.odds.home || null,
            draw_odds: g.odds.draw || null,
            away_odds: g.odds.away || null,
            over_25_odds: g.odds.over || null,
            under_25_odds: g.odds.under || null,
            over_15_odds: g.odds.over15 || null,
            under_15_odds: g.odds.under15 || null,
            over_35_odds: g.odds.over35 || null,
            under_35_odds: g.odds.under35 || null
          })
        }
      }
    })
    
    if (odds.length > 0) {
      for (let i = 0; i < odds.length; i += 100) {
        const batch = odds.slice(i, i + 100)
        const { error: oddsError } = await supabase
          .from('odds')
          .upsert(batch, { onConflict: 'game_id,bookmaker' })
        
        if (oddsError) throw oddsError
      }
      console.log(`     ✅ ${odds.length} odds records`)
    }
    
    console.log(`\n✅ ${leagueConfig.name} migration complete!`)
    
  } catch (error) {
    console.error(`❌ Error migrating ${leagueConfig.name}:`, error.message)
    throw error
  }
}

function getCurrentRound(games) {
  const rounds = [...new Set(games.map(g => g.round))].sort((a, b) => a - b)
  
  for (let round of rounds) {
    const roundGames = games.filter(g => g.round === round)
    if (roundGames.some(g => g.home_goals === null)) {
      return round
    }
  }
  
  return Math.max(...rounds)
}

async function migrateAll() {
  console.log('\n' + '='.repeat(70))
  console.log('🚀 SUPABASE MIGRATION')
  console.log('='.repeat(70))
  
  for (const league of LEAGUES) {
    await migrateLeague(league)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ ALL MIGRATIONS COMPLETE!')
  console.log('='.repeat(70))
  console.log('\n🎉 Your data is now in Supabase!')
  console.log('📊 Check your Supabase dashboard to verify')
}

migrateAll().catch(console.error)
```

**Run migration:**
```bash
node tools/migrate_to_supabase.js
```

---

## 🎨 Step 6: Update Frontend to Use Supabase

### Create Supabase Client

**File: `utils/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = useRuntimeConfig().public.supabaseUrl
const supabaseKey = useRuntimeConfig().public.supabaseKey

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Update Nuxt Config

**File: `nuxt.config.ts`**
```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Server-only
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    
    // Public (exposed to frontend)
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY
    }
  },
  
  // ... rest of your config
})
```

### Create Composables

**File: `composables/useSupabaseLeagues.ts`**
```typescript
import { supabase } from '~/utils/supabase'

export const useSupabaseLeagues = () => {
  const leagues = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  const fetchLeagues = async () => {
    loading.value = true
    error.value = null
    
    try {
      const { data, error: fetchError } = await supabase
        .from('leagues')
        .select('*')
        .order('name')
      
      if (fetchError) throw fetchError
      
      leagues.value = data
    } catch (e) {
      error.value = e.message
      console.error('Error fetching leagues:', e)
    } finally {
      loading.value = false
    }
  }
  
  return {
    leagues,
    loading,
    error,
    fetchLeagues
  }
}
```

**File: `composables/useSupabaseLeague.ts`**
```typescript
import { supabase } from '~/utils/supabase'

export const useSupabaseLeague = (leagueKey: string) => {
  const league = ref(null)
  const standings = ref([])
  const games = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  const fetchLeague = async (round?: number) => {
    loading.value = true
    error.value = null
    
    try {
      // Fetch league info
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('key', leagueKey)
        .single()
      
      if (leagueError) throw leagueError
      league.value = leagueData
      
      // Fetch standings with team info
      const { data: standingsData, error: standingsError } = await supabase
        .from('standings')
        .select(`
          *,
          team:teams(name, team_key, logo_url)
        `)
        .eq('league_key', leagueKey)
        .eq('season', '2025-2026')
        .order('pts', { ascending: false })
      
      if (standingsError) throw standingsError
      standings.value = standingsData
      
      // Fetch games for specific round (or current round)
      const targetRound = round || leagueData.current_round
      
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          home_team:teams!home_team_id(name, team_key),
          away_team:teams!away_team_id(name, team_key),
          odds(*)
        `)
        .eq('league_key', leagueKey)
        .eq('round', targetRound)
        .order('date', { ascending: true })
      
      if (gamesError) throw gamesError
      games.value = gamesData
      
    } catch (e) {
      error.value = e.message
      console.error('Error fetching league:', e)
    } finally {
      loading.value = false
    }
  }
  
  // Subscribe to real-time game updates
  const subscribeToGames = () => {
    const channel = supabase
      .channel(`league:${leagueKey}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `league_key=eq.${leagueKey}`
        },
        async (payload) => {
          console.log('Game updated!', payload)
          // Refresh the specific game
          await fetchLeague()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }
  
  return {
    league,
    standings,
    games,
    loading,
    error,
    fetchLeague,
    subscribeToGames
  }
}
```

### Update Index Page

**File: `pages/index.vue` (simplified version)**
```vue
<script setup>
import { useSupabaseLeagues } from '~/composables/useSupabaseLeagues'

const { leagues, loading, fetchLeagues } = useSupabaseLeagues()

onMounted(() => {
  fetchLeagues()
})
</script>

<template>
  <div class="p-8 max-w-[1600px] mx-auto">
    <h1 class="text-4xl font-bold mb-8">🎯 Overview Dashboard</h1>
    
    <div v-if="loading" class="text-center py-16">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="league in leagues"
        :key="league.key"
        :to="`/league/${league.key}`"
        class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
      >
        <div class="text-4xl mb-2">{{ league.flag }}</div>
        <h3 class="text-xl font-bold">{{ league.name }}</h3>
        <p class="text-sm text-slate-500">Round {{ league.current_round }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
```

### Update League Page

**File: `pages/league/[slug].vue`**
```vue
<script setup>
import { useSupabaseLeague } from '~/composables/useSupabaseLeague'

const route = useRoute()
const slug = route.params.slug

const { league, standings, games, loading, fetchLeague, subscribeToGames } = useSupabaseLeague(slug)

onMounted(async () => {
  await fetchLeague()
  
  // Subscribe to real-time updates
  const unsubscribe = subscribeToGames()
  
  onUnmounted(() => {
    unsubscribe()
  })
})
</script>

<template>
  <div class="p-8 max-w-[1600px] mx-auto">
    <div v-if="loading" class="text-center py-16">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
    </div>
    
    <div v-else-if="league">
      <h1 class="text-4xl font-bold mb-2">{{ league.flag }} {{ league.name }}</h1>
      <p class="text-slate-600 mb-8">Round {{ league.current_round }} • Season {{ league.season }}</p>
      
      <!-- Standings -->
      <div class="bg-white rounded-xl shadow-md p-6 mb-8">
        <h2 class="text-2xl font-bold mb-4">Standings</h2>
        <table class="w-full">
          <thead>
            <tr class="text-left text-sm text-slate-600">
              <th class="pb-2">Pos</th>
              <th class="pb-2">Team</th>
              <th class="pb-2">GP</th>
              <th class="pb-2">W</th>
              <th class="pb-2">D</th>
              <th class="pb-2">L</th>
              <th class="pb-2">GF</th>
              <th class="pb-2">GA</th>
              <th class="pb-2">Pts</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(standing, index) in standings" :key="standing.id" class="border-t">
              <td class="py-2">{{ index + 1 }}</td>
              <td class="py-2 font-semibold">{{ standing.team.name }}</td>
              <td class="py-2">{{ standing.gp }}</td>
              <td class="py-2">{{ standing.w }}</td>
              <td class="py-2">{{ standing.d }}</td>
              <td class="py-2">{{ standing.l }}</td>
              <td class="py-2">{{ standing.gf }}</td>
              <td class="py-2">{{ standing.ga }}</td>
              <td class="py-2 font-bold">{{ standing.pts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Games -->
      <div class="bg-white rounded-xl shadow-md p-6">
        <h2 class="text-2xl font-bold mb-4">Round {{ league.current_round }} Fixtures</h2>
        <div class="space-y-4">
          <div
            v-for="game in games"
            :key="game.id"
            class="border rounded-lg p-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <p class="font-semibold">{{ game.home_team.name }}</p>
                <p class="text-sm text-slate-500">vs</p>
                <p class="font-semibold">{{ game.away_team.name }}</p>
              </div>
              
              <div v-if="game.status === 'finished'" class="text-2xl font-bold">
                {{ game.home_goals }} - {{ game.away_goals }}
              </div>
              
              <div v-else-if="game.odds && game.odds.length > 0" class="text-right">
                <div class="text-xs text-slate-500 mb-1">Odds</div>
                <div class="flex gap-2">
                  <span class="text-sm">1: {{ game.odds[0].home_odds }}</span>
                  <span class="text-sm">X: {{ game.odds[0].draw_odds }}</span>
                  <span class="text-sm">2: {{ game.odds[0].away_odds }}</span>
                </div>
              </div>
            </div>
            
            <div class="mt-2 text-xs text-slate-500">
              {{ new Date(game.date).toLocaleString() }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
```

---

## ⚡ Real-time Score Updates

**File: `composables/useRealtimeScores.ts`**
```typescript
import { supabase } from '~/utils/supabase'

export const useRealtimeScores = () => {
  const liveGames = ref([])
  
  const subscribeToLiveScores = () => {
    const channel = supabase
      .channel('live-scores')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: 'status=eq.live'
        },
        (payload) => {
          console.log('🔴 LIVE UPDATE:', payload.new)
          
          // Update local state
          const index = liveGames.value.findIndex(g => g.id === payload.new.id)
          if (index >= 0) {
            liveGames.value[index] = payload.new
          } else {
            liveGames.value.push(payload.new)
          }
          
          // You can also show a toast notification here
          showNotification(`Goal! ${payload.new.home_team.name} ${payload.new.home_goals} - ${payload.new.away_goals} ${payload.new.away_team.name}`)
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }
  
  return {
    liveGames,
    subscribeToLiveScores
  }
}
```

---

## 📊 Performance Optimizations

### 1. Add Database Views for Complex Queries

```sql
-- View for league overview with stats
CREATE VIEW league_overview AS
SELECT 
  l.key,
  l.name,
  l.flag,
  l.current_round,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'scheduled') as upcoming_games,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'finished') as finished_games
FROM leagues l
LEFT JOIN games g ON l.key = g.league_key
GROUP BY l.key, l.name, l.flag, l.current_round;

-- View for team stats
CREATE VIEW team_stats AS
SELECT 
  t.id,
  t.name,
  t.league_key,
  s.gp,
  s.pts,
  s.form,
  ROUND(CAST(s.gf AS DECIMAL) / NULLIF(s.gp, 0), 2) as goals_per_game,
  ROUND(CAST(s.ga AS DECIMAL) / NULLIF(s.gp, 0), 2) as goals_conceded_per_game
FROM teams t
JOIN standings s ON t.id = s.team_id;
```

### 2. Add Caching Layer

**File: `server/utils/cache.ts`**
```typescript
const cache = new Map()

export function getCached<T>(key: string, ttl: number = 300): T | null {
  const item = cache.get(key)
  if (!item) return null
  
  if (Date.now() > item.expiry) {
    cache.delete(key)
    return null
  }
  
  return item.data
}

export function setCache<T>(key: string, data: T, ttl: number = 300): void {
  cache.set(key, {
    data,
    expiry: Date.now() + (ttl * 1000)
  })
}
```

---

## 🎯 Next Steps

1. **Run migration** (10 min):
   ```bash
   node tools/migrate_to_supabase.js
   ```

2. **Test queries** in Supabase dashboard (5 min)

3. **Update frontend** to use new composables (20 min)

4. **Add real-time** subscriptions (10 min)

5. **Deploy** to Vercel/Netlify (5 min)

---

## 💡 Advanced Features You Can Add

1. **User Authentication**
   ```typescript
   // Login with email
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'password'
   })
   ```

2. **Save User Predictions**
   ```sql
   CREATE TABLE user_predictions (
     id SERIAL PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     game_id INTEGER REFERENCES games(id),
     prediction TEXT,
     stake DECIMAL(10,2),
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Track Win/Loss**
   - Save user bets
   - Calculate ROI
   - Show leaderboard

4. **Push Notifications**
   - When game starts
   - When goal is scored
   - When prediction wins

---

Want me to implement the migration script and updated composables now?
