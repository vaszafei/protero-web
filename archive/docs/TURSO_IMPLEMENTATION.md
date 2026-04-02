# 🚀 Turso Implementation Guide for Protero

## 📋 Overview

**Turso** = SQLite on the edge (based on libSQL, a fork of SQLite)

### Why Turso for Your App:
✅ **Edge-replicated** - Deployed globally, <50ms latency everywhere
✅ **SQLite** - Simple, fast, familiar SQL
✅ **9GB free storage** - 1B row reads/month
✅ **Native Nuxt integration** - Works perfectly with server routes
✅ **Simple manual updates** - Easy admin panel with server routes
✅ **No vendor lock-in** - It's just SQLite, export anytime
✅ **TypeScript-first** - Excellent DX

### Perfect For Manual Updates:
✅ You can create an **admin page** to manually update scores
✅ Server routes handle writes (secure)
✅ Frontend can update data directly through API
✅ No complex auth setup needed for admin features

---

## 💰 Turso Free Tier

```
Storage:           9GB (way more than you need)
Row Reads:         1 billion/month
Row Writes:        25 million/month
Databases:         500
Locations:         Global edge replication
```

**Your usage estimate:**
- 7 leagues × 380 matches = ~2MB data
- 1000 daily visitors × 10 queries = 10k reads/day = 300k/month
- Manual updates: ~100 writes/week = 400/month
- **Well within free tier limits** ✅

---

## 🚀 Step-by-Step Setup (20 minutes)

### Step 1: Install Turso CLI (2 min)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Add to PATH (if needed)
export PATH="$HOME/.turso:$PATH"

# Verify installation
turso --version
```

### Step 2: Create Account & Database (3 min)

```bash
# Sign up (opens browser)
turso auth signup

# Create database
turso db create protero-football

# Show database URL
turso db show protero-football

# Create authentication token
turso db tokens create protero-football

# Copy both:
# - Database URL: libsql://protero-football-[org].turso.io
# - Auth Token: eyJhbGc...
```

### Step 3: Install Dependencies (1 min)

```bash
cd /home/zafnitlab/Desktop/protero
npm install @libsql/client
```

### Step 4: Configure Environment

**File: `.env`**
```bash
# Turso Database
TURSO_DATABASE_URL=libsql://protero-football-[your-org].turso.io
TURSO_AUTH_TOKEN=your_auth_token_here

# Admin authentication (simple password for manual updates)
ADMIN_PASSWORD=your_secure_password_here
```

**File: `nuxt.config.ts`**
```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Private (server-only)
    tursoDbUrl: process.env.TURSO_DATABASE_URL,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
    adminPassword: process.env.ADMIN_PASSWORD,
    
    // Public
    public: {
      // Add any public config here
    }
  },
  
  // ... rest of config
})
```

---

## 🗄️ Database Schema

### Step 5: Create Tables (5 min)

**File: `server/utils/db.ts`**
```typescript
import { createClient } from '@libsql/client'

let db: any = null

export function getDB() {
  if (!db) {
    const config = useRuntimeConfig()
    db = createClient({
      url: config.tursoDbUrl,
      authToken: config.tursoAuthToken
    })
  }
  return db
}
```

**File: `tools/setup_turso_schema.js`**
```javascript
#!/usr/bin/env node
const { createClient } = require('@libsql/client')
require('dotenv').config()

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const schema = `
-- =====================================================
-- LEAGUES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leagues (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT,
  country TEXT,
  current_round INTEGER DEFAULT 1,
  season TEXT DEFAULT '2025-2026',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_key TEXT NOT NULL,
  name TEXT NOT NULL,
  team_key TEXT NOT NULL,
  logo_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_key, team_key),
  FOREIGN KEY (league_key) REFERENCES leagues(key) ON DELETE CASCADE
);

-- =====================================================
-- STANDINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS standings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_key TEXT NOT NULL,
  team_id INTEGER NOT NULL,
  season TEXT DEFAULT '2025-2026',
  gp INTEGER DEFAULT 0,
  w INTEGER DEFAULT 0,
  d INTEGER DEFAULT 0,
  l INTEGER DEFAULT 0,
  gf INTEGER DEFAULT 0,
  ga INTEGER DEFAULT 0,
  pts INTEGER DEFAULT 0,
  position INTEGER,
  form TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(league_key, team_id, season),
  FOREIGN KEY (league_key) REFERENCES leagues(key) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- =====================================================
-- GAMES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  league_key TEXT NOT NULL,
  round INTEGER NOT NULL,
  home_team_id INTEGER NOT NULL,
  away_team_id INTEGER NOT NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  date TEXT,
  status TEXT DEFAULT 'scheduled',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (league_key) REFERENCES leagues(key) ON DELETE CASCADE,
  FOREIGN KEY (home_team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (away_team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- =====================================================
-- ODDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS odds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  bookmaker TEXT DEFAULT 'average',
  home_odds REAL,
  draw_odds REAL,
  away_odds REAL,
  over_15_odds REAL,
  under_15_odds REAL,
  over_25_odds REAL,
  under_25_odds REAL,
  over_35_odds REAL,
  under_35_odds REAL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, bookmaker),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- =====================================================
-- PREDICTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL UNIQUE,
  prediction TEXT NOT NULL,
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  recommended_bet TEXT,
  explanation TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_games_league_round ON games(league_key, round);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_standings_league ON standings(league_key);
CREATE INDEX IF NOT EXISTS idx_standings_pts ON standings(pts DESC);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_key);
CREATE INDEX IF NOT EXISTS idx_odds_game ON odds(game_id);
`

async function setupSchema() {
  console.log('🚀 Setting up Turso database schema...\n')
  
  try {
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      if (statement.startsWith('--')) continue
      
      await db.execute(statement)
      console.log('✅', statement.substring(0, 50) + '...')
    }
    
    console.log('\n✅ Schema setup complete!')
    console.log('📊 Tables created: leagues, teams, standings, games, odds, predictions')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

setupSchema()
```

**Run schema setup:**
```bash
node tools/setup_turso_schema.js
```

---

## 🔄 Step 6: Migrate JSON Data to Turso

**File: `tools/migrate_to_turso.js`**
```javascript
#!/usr/bin/env node
const { createClient } = require('@libsql/client')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

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
    const filePath = path.join(__dirname, '..', 'public', 'data', 'leagues', `${leagueConfig.key}.json`)
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    
    // 1. Insert league
    console.log('  📝 Inserting league...')
    await db.execute({
      sql: `INSERT OR REPLACE INTO leagues (key, name, flag, country, current_round, season) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        leagueConfig.key,
        leagueConfig.name,
        leagueConfig.flag,
        leagueConfig.country,
        getCurrentRound(jsonData.games),
        '2025-2026'
      ]
    })
    
    // 2. Insert teams
    console.log('  👥 Inserting teams...')
    for (const standing of jsonData.standings) {
      const teamName = standing.team || standing.Team
      const teamKey = standing.team_key || teamName.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '')
      
      await db.execute({
        sql: `INSERT OR IGNORE INTO teams (league_key, name, team_key) VALUES (?, ?, ?)`,
        args: [leagueConfig.key, teamName, teamKey]
      })
    }
    console.log(`     ✅ ${jsonData.standings.length} teams`)
    
    // 3. Get team IDs for mapping
    const teamsResult = await db.execute({
      sql: `SELECT id, name FROM teams WHERE league_key = ?`,
      args: [leagueConfig.key]
    })
    
    const teamMap = {}
    teamsResult.rows.forEach(row => {
      teamMap[row.name.toLowerCase()] = row.id
    })
    
    // 4. Insert standings
    console.log('  📊 Inserting standings...')
    for (let i = 0; i < jsonData.standings.length; i++) {
      const s = jsonData.standings[i]
      const teamName = s.team || s.Team
      const teamId = teamMap[teamName.toLowerCase()]
      
      if (!teamId) {
        console.log(`     ⚠️  Team not found: ${teamName}`)
        continue
      }
      
      await db.execute({
        sql: `INSERT OR REPLACE INTO standings 
              (league_key, team_id, season, gp, w, d, l, gf, ga, pts, position, form)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          leagueConfig.key,
          teamId,
          '2025-2026',
          s.gp || s.GP || 0,
          s.w || s.W || 0,
          s.d || s.D || 0,
          s.l || s.L || 0,
          s.gf || s.GF || 0,
          s.ga || s.GA || 0,
          s.pts || s.Pts || 0,
          i + 1,
          s.last5_raw || s.Last5 || ''
        ]
      })
    }
    console.log(`     ✅ ${jsonData.standings.length} standings`)
    
    // 5. Insert games
    console.log('  🎮 Inserting games...')
    let gamesInserted = 0
    
    for (const game of jsonData.games) {
      if (!game.home || !game.away) continue
      
      const homeId = teamMap[game.home.toLowerCase()]
      const awayId = teamMap[game.away.toLowerCase()]
      
      if (!homeId || !awayId) {
        console.log(`     ⚠️  Skipping: ${game.home} vs ${game.away}`)
        continue
      }
      
      const result = await db.execute({
        sql: `INSERT INTO games 
              (league_key, round, home_team_id, away_team_id, home_goals, away_goals, date, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          leagueConfig.key,
          game.round,
          homeId,
          awayId,
          game.home_goals,
          game.away_goals,
          game.date !== 'TBD' ? game.date : null,
          game.home_goals !== null ? 'finished' : 'scheduled'
        ]
      })
      
      // Insert odds if available
      if (game.odds && result.lastInsertRowid) {
        await db.execute({
          sql: `INSERT INTO odds 
                (game_id, bookmaker, home_odds, draw_odds, away_odds, over_25_odds, under_25_odds)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            result.lastInsertRowid,
            'average',
            game.odds.home || null,
            game.odds.draw || null,
            game.odds.away || null,
            game.odds.over || null,
            game.odds.under || null
          ]
        })
      }
      
      gamesInserted++
    }
    
    console.log(`     ✅ ${gamesInserted} games with odds`)
    console.log(`\n✅ ${leagueConfig.name} migration complete!`)
    
  } catch (error) {
    console.error(`❌ Error migrating ${leagueConfig.name}:`, error)
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
  console.log('🚀 TURSO MIGRATION')
  console.log('='.repeat(70))
  
  for (const league of LEAGUES) {
    await migrateLeague(league)
  }
  
  console.log('\n' + '='.repeat(70))
  console.log('✅ ALL MIGRATIONS COMPLETE!')
  console.log('='.repeat(70))
  console.log('\n🎉 Your data is now in Turso!')
  console.log('💻 Run: turso db shell protero-football')
  console.log('   Then: SELECT COUNT(*) FROM games;')
}

migrateAll().catch(console.error)
```

**Run migration:**
```bash
node tools/migrate_to_turso.js
```

---

## 🎨 Step 7: Create Server API Routes

**File: `server/api/leagues/index.get.ts`**
```typescript
import { getDB } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = getDB()
  
  const result = await db.execute(`
    SELECT 
      l.*,
      COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'scheduled') as upcoming_games,
      COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'finished') as finished_games
    FROM leagues l
    LEFT JOIN games g ON l.key = g.league_key
    GROUP BY l.key
    ORDER BY l.name
  `)
  
  return {
    leagues: result.rows,
    cached_at: new Date().toISOString()
  }
})
```

**File: `server/api/leagues/[slug].get.ts`**
```typescript
import { getDB } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const { round } = getQuery(event)
  const db = getDB()
  
  // Get league
  const leagueResult = await db.execute({
    sql: 'SELECT * FROM leagues WHERE key = ?',
    args: [slug]
  })
  
  if (leagueResult.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }
  
  const league = leagueResult.rows[0]
  const targetRound = round || league.current_round
  
  // Get standings with team info
  const standingsResult = await db.execute({
    sql: `
      SELECT s.*, t.name as team_name, t.team_key, t.logo_url
      FROM standings s
      JOIN teams t ON s.team_id = t.id
      WHERE s.league_key = ? AND s.season = '2025-2026'
      ORDER BY s.pts DESC, (s.gf - s.ga) DESC
    `,
    args: [slug]
  })
  
  // Get games for round with team names
  const gamesResult = await db.execute({
    sql: `
      SELECT 
        g.*,
        h.name as home_name,
        h.team_key as home_key,
        a.name as away_name,
        a.team_key as away_key,
        o.home_odds,
        o.draw_odds,
        o.away_odds,
        o.over_25_odds,
        o.under_25_odds
      FROM games g
      JOIN teams h ON g.home_team_id = h.id
      JOIN teams a ON g.away_team_id = a.id
      LEFT JOIN odds o ON g.id = o.game_id
      WHERE g.league_key = ? AND g.round = ?
      ORDER BY g.date ASC
    `,
    args: [slug, targetRound]
  })
  
  return {
    league,
    standings: standingsResult.rows,
    games: gamesResult.rows,
    round: targetRound
  }
})
```

---

## 🔧 Step 8: **ADMIN PANEL for Manual Updates**

This is the key feature you wanted! Here's a complete admin interface:

**File: `server/api/admin/auth.post.ts`**
```typescript
export default defineEventHandler(async (event) => {
  const { password } = await readBody(event)
  const config = useRuntimeConfig()
  
  if (password === config.adminPassword) {
    // Set session cookie
    setCookie(event, 'admin_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 // 24 hours
    })
    
    return { success: true }
  }
  
  throw createError({ statusCode: 401, message: 'Invalid password' })
})
```

**File: `server/api/admin/games/[id].patch.ts`**
```typescript
import { getDB } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  // Check authentication
  const authCookie = getCookie(event, 'admin_auth')
  if (authCookie !== 'authenticated') {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const gameId = getRouterParam(event, 'id')
  const { home_goals, away_goals, status } = await readBody(event)
  const db = getDB()
  
  // Update game
  await db.execute({
    sql: `UPDATE games 
          SET home_goals = ?, away_goals = ?, status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [home_goals, away_goals, status || 'finished', gameId]
  })
  
  // Update standings if game is finished
  if (status === 'finished' || (home_goals !== null && away_goals !== null)) {
    // Get game details
    const gameResult = await db.execute({
      sql: 'SELECT * FROM games WHERE id = ?',
      args: [gameId]
    })
    
    const game = gameResult.rows[0]
    
    // Update home team standings
    await updateTeamStandings(db, game.league_key, game.home_team_id, home_goals, away_goals, true)
    
    // Update away team standings
    await updateTeamStandings(db, game.league_key, game.away_team_id, away_goals, home_goals, false)
  }
  
  return { success: true }
})

async function updateTeamStandings(db: any, leagueKey: string, teamId: number, goalsFor: number, goalsAgainst: number, isHome: boolean) {
  // Get current standings
  const result = await db.execute({
    sql: 'SELECT * FROM standings WHERE league_key = ? AND team_id = ?',
    args: [leagueKey, teamId]
  })
  
  if (result.rows.length === 0) return
  
  const standing = result.rows[0]
  const gp = standing.gp + 1
  const gf = standing.gf + goalsFor
  const ga = standing.ga + goalsAgainst
  
  let w = standing.w
  let d = standing.d
  let l = standing.l
  
  if (goalsFor > goalsAgainst) {
    w++
  } else if (goalsFor === goalsAgainst) {
    d++
  } else {
    l++
  }
  
  const pts = w * 3 + d
  
  await db.execute({
    sql: `UPDATE standings 
          SET gp = ?, w = ?, d = ?, l = ?, gf = ?, ga = ?, pts = ?, updated_at = CURRENT_TIMESTAMP
          WHERE league_key = ? AND team_id = ?`,
    args: [gp, w, d, l, gf, ga, pts, leagueKey, teamId]
  })
}
```

**File: `pages/admin.vue`**
```vue
<template>
  <div class="p-8 max-w-[1400px] mx-auto">
    <!-- Login -->
    <div v-if="!authenticated" class="max-w-md mx-auto mt-20">
      <div class="bg-white rounded-xl shadow-lg p-8">
        <h1 class="text-2xl font-bold mb-6">🔐 Admin Login</h1>
        <form @submit.prevent="login">
          <input
            v-model="password"
            type="password"
            placeholder="Enter admin password"
            class="w-full px-4 py-3 border rounded-lg mb-4"
            required
          />
          <button
            type="submit"
            class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Login
          </button>
          <p v-if="loginError" class="text-red-600 text-sm mt-2">{{ loginError }}</p>
        </form>
      </div>
    </div>
    
    <!-- Admin Panel -->
    <div v-else>
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-4xl font-bold text-slate-900">⚙️ Admin Panel</h1>
          <p class="text-slate-600">Manually update match scores and data</p>
        </div>
        <button
          @click="logout"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>
      
      <!-- League Selector -->
      <div class="mb-6">
        <select
          v-model="selectedLeague"
          @change="loadGames"
          class="px-4 py-3 border rounded-lg text-lg"
        >
          <option value="">Select a league...</option>
          <option v-for="league in leagues" :key="league.key" :value="league.key">
            {{ league.flag }} {{ league.name }}
          </option>
        </select>
        
        <select
          v-if="selectedLeague"
          v-model="selectedRound"
          @change="loadGames"
          class="ml-4 px-4 py-3 border rounded-lg text-lg"
        >
          <option v-for="r in 38" :key="r" :value="r">
            Round {{ r }}
          </option>
        </select>
      </div>
      
      <!-- Games List -->
      <div v-if="loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
      
      <div v-else-if="games.length > 0" class="space-y-4">
        <div
          v-for="game in games"
          :key="game.id"
          class="bg-white rounded-xl shadow-md p-6"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <!-- Teams -->
            <div class="text-center">
              <p class="text-lg font-bold">{{ game.home_name }}</p>
              <p class="text-sm text-slate-500">vs</p>
              <p class="text-lg font-bold">{{ game.away_name }}</p>
            </div>
            
            <!-- Score Input -->
            <div class="flex items-center justify-center gap-4">
              <div>
                <label class="text-xs text-slate-500 block mb-1">Home Goals</label>
                <input
                  v-model.number="game.home_goals"
                  type="number"
                  min="0"
                  class="w-20 px-3 py-2 border rounded-lg text-center text-2xl font-bold"
                  :class="game.status === 'finished' ? 'bg-green-50' : ''"
                />
              </div>
              
              <div class="text-2xl font-bold text-slate-400">-</div>
              
              <div>
                <label class="text-xs text-slate-500 block mb-1">Away Goals</label>
                <input
                  v-model.number="game.away_goals"
                  type="number"
                  min="0"
                  class="w-20 px-3 py-2 border rounded-lg text-center text-2xl font-bold"
                  :class="game.status === 'finished' ? 'bg-green-50' : ''"
                />
              </div>
            </div>
            
            <!-- Actions -->
            <div class="flex flex-col gap-2">
              <button
                @click="updateGame(game)"
                :disabled="saving === game.id"
                class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {{ saving === game.id ? 'Saving...' : 'Update Score' }}
              </button>
              
              <button
                @click="markAsScheduled(game)"
                class="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Reset to Scheduled
              </button>
              
              <p class="text-xs text-slate-500 text-center">
                Status: <span class="font-semibold">{{ game.status }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else-if="selectedLeague" class="text-center py-12 text-slate-500">
        No games found for this round
      </div>
    </div>
  </div>
</template>

<script setup>
const authenticated = ref(false)
const password = ref('')
const loginError = ref('')

const leagues = ref([])
const selectedLeague = ref('')
const selectedRound = ref(1)
const games = ref([])
const loading = ref(false)
const saving = ref(null)

async function login() {
  try {
    const response = await $fetch('/api/admin/auth', {
      method: 'POST',
      body: { password: password.value }
    })
    
    if (response.success) {
      authenticated.value = true
      await loadLeagues()
    }
  } catch (error) {
    loginError.value = 'Invalid password'
  }
}

function logout() {
  authenticated.value = false
  password.value = ''
  selectedLeague.value = ''
  games.value = []
}

async function loadLeagues() {
  const response = await $fetch('/api/leagues')
  leagues.value = response.leagues
}

async function loadGames() {
  if (!selectedLeague.value) return
  
  loading.value = true
  try {
    const response = await $fetch(`/api/leagues/${selectedLeague.value}`, {
      params: { round: selectedRound.value }
    })
    games.value = response.games
  } catch (error) {
    console.error('Error loading games:', error)
  } finally {
    loading.value = false
  }
}

async function updateGame(game) {
  if (game.home_goals === null || game.away_goals === null) {
    alert('Please enter both scores')
    return
  }
  
  saving.value = game.id
  
  try {
    await $fetch(`/api/admin/games/${game.id}`, {
      method: 'PATCH',
      body: {
        home_goals: game.home_goals,
        away_goals: game.away_goals,
        status: 'finished'
      }
    })
    
    game.status = 'finished'
    alert('✅ Game updated successfully!')
    
    // Reload to see updated standings
    await loadGames()
  } catch (error) {
    alert('❌ Error updating game: ' + error.message)
  } finally {
    saving.value = null
  }
}

async function markAsScheduled(game) {
  if (!confirm('Reset this game to scheduled status?')) return
  
  saving.value = game.id
  
  try {
    await $fetch(`/api/admin/games/${game.id}`, {
      method: 'PATCH',
      body: {
        home_goals: null,
        away_goals: null,
        status: 'scheduled'
      }
    })
    
    game.home_goals = null
    game.away_goals = null
    game.status = 'scheduled'
    alert('✅ Game reset to scheduled')
  } catch (error) {
    alert('❌ Error: ' + error.message)
  } finally {
    saving.value = null
  }
}
</script>
```

---

## 📊 Comparison: Turso vs Supabase

| Feature | Turso | Supabase |
|---------|-------|----------|
| **Database** | SQLite (edge) | PostgreSQL |
| **Free Storage** | 9GB | 500MB |
| **Setup Time** | 20 min | 30 min |
| **Latency** | <50ms (global) | ~100ms |
| **Manual Updates** | ✅ Simple server routes | ✅ RLS policies needed |
| **Real-time** | ❌ Manual polling | ✅ Built-in subscriptions |
| **Auth Built-in** | ❌ DIY | ✅ Full auth system |
| **Admin Panel** | ✅ Easy custom UI | ✅ Auto-generated UI |
| **Learning Curve** | Low (it's SQLite) | Medium (Postgres) |
| **Vendor Lock-in** | None (SQLite export) | Medium |
| **Best For** | Manual updates, simplicity | Real-time, auth features |

---

## 🎯 **Recommendation for Your Needs:**

### Choose **Turso** if:
✅ You want **manual score updates** (admin panel)
✅ You prefer **simplicity** (it's just SQLite)
✅ You don't need real-time subscriptions
✅ You want **global edge performance**
✅ You want **no vendor lock-in**

### Choose **Supabase** if:
✅ You want **real-time score updates** (auto-refresh)
✅ You need **user authentication** (login/signup)
✅ You want **auto-generated REST API**
✅ You need **advanced features** (storage, edge functions)

---

## 🚀 **For Your Use Case: I Recommend Turso**

**Why:**
1. ✅ You specifically want **manual updates** → Perfect fit
2. ✅ Simpler to implement (20 min vs 30+ min)
3. ✅ Better free tier (9GB vs 500MB)
4. ✅ Faster global performance (edge replicas)
5. ✅ No learning curve (it's SQLite)
6. ✅ The admin panel is straightforward to build

---

## 💻 Want me to implement it?

I can:
1. ✅ Set up the Turso schema
2. ✅ Migrate your JSON data
3. ✅ Create the admin panel
4. ✅ Update your frontend pages
5. ✅ Add manual update functionality

Just say "implement Turso" and I'll do it all!
