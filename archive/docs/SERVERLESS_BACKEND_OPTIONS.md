# ⚡ Serverless Backend Architectures for Protero

## 🎯 **Option 1: Nuxt Server Routes + Turso (SQLite Edge)**
**Best for: Real-time queries, minimal cost, edge performance**

### Architecture
```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Nuxt 3)                                      │
│  ├─ pages/index.vue                                     │
│  ├─ pages/league/[slug].vue                            │
│  └─ composables/useLeagueData.js                       │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/API Calls
┌────────────────▼────────────────────────────────────────┐
│  Nuxt Server Routes (Serverless Functions)              │
│  ├─ server/api/leagues/index.get.ts                    │
│  ├─ server/api/leagues/[slug].get.ts                   │
│  ├─ server/api/leagues/[slug]/rounds/[round].get.ts   │
│  └─ server/api/odds/live.get.ts                        │
└────────────────┬────────────────────────────────────────┘
                 │ SQL Queries
┌────────────────▼────────────────────────────────────────┐
│  Turso Database (Edge SQLite)                           │
│  ├─ tables: leagues, teams, games, standings, odds     │
│  └─ Replicated globally (low latency)                  │
└─────────────────────────────────────────────────────────┘
```

### Cost: **FREE** (up to 9GB storage, 1B row reads/month)

### Setup (15 minutes):

```bash
# 1. Install Turso
npm install @libsql/client

# 2. Create Turso database (free account at turso.tech)
curl -L https://turso.tech/install.sh | bash
turso auth signup
turso db create protero-db
turso db show protero-db
# Copy the database URL

# 3. Get auth token
turso db tokens create protero-db
```

### Implementation:

**File: `server/utils/db.ts`**
```typescript
import { createClient } from '@libsql/client'

let db: any = null

export function getDB() {
  if (!db) {
    db = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!
    })
  }
  return db
}
```

**File: `.env`**
```bash
TURSO_DATABASE_URL=libsql://protero-db-your-org.turso.io
TURSO_AUTH_TOKEN=your_token_here
```

**File: `server/api/leagues/index.get.ts`**
```typescript
import { getDB } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const db = getDB()
  
  // Get all leagues with current round info
  const result = await db.execute(`
    SELECT 
      l.key,
      l.name,
      l.flag,
      l.current_round,
      COUNT(DISTINCT g.id) as games_count,
      COUNT(DISTINCT CASE WHEN g.status = 'scheduled' THEN g.id END) as upcoming_count
    FROM leagues l
    LEFT JOIN games g ON l.key = g.league_key AND g.round = l.current_round
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
  
  // Get league info
  const leagueResult = await db.execute({
    sql: 'SELECT * FROM leagues WHERE key = ?',
    args: [slug]
  })
  
  if (leagueResult.rows.length === 0) {
    throw createError({ statusCode: 404, message: 'League not found' })
  }
  
  const league = leagueResult.rows[0]
  const targetRound = round || league.current_round
  
  // Get standings
  const standingsResult = await db.execute({
    sql: `SELECT * FROM standings 
          WHERE league_key = ? 
          ORDER BY pts DESC, (gf - ga) DESC`,
    args: [slug]
  })
  
  // Get games for the round
  const gamesResult = await db.execute({
    sql: `
      SELECT 
        g.*,
        h.name as home_name,
        h.form as home_form,
        a.name as away_name,
        a.form as away_form,
        o.home_odds,
        o.draw_odds,
        o.away_odds,
        o.over_25_odds,
        o.under_25_odds
      FROM games g
      LEFT JOIN teams h ON g.home_team_id = h.id
      LEFT JOIN teams a ON g.away_team_id = a.id
      LEFT JOIN odds o ON g.id = o.game_id
      WHERE g.league_key = ? AND g.round = ?
      ORDER BY g.date ASC
    `,
    args: [slug, targetRound]
  })
  
  return {
    league: league,
    standings: standingsResult.rows,
    games: gamesResult.rows,
    round: targetRound
  }
})
```

**File: `server/api/leagues/[slug]/parlay.get.ts`**
```typescript
import { getDB } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const db = getDB()
  
  // Get best picks for parlay (high confidence, low odds)
  const result = await db.execute({
    sql: `
      SELECT 
        g.*,
        p.prediction,
        p.confidence,
        p.recommended_bet,
        o.home_odds,
        o.away_odds,
        o.over_25_odds
      FROM games g
      INNER JOIN predictions p ON g.id = p.game_id
      LEFT JOIN odds o ON g.id = o.game_id
      WHERE g.league_key = ?
        AND g.status = 'scheduled'
        AND p.confidence >= 75
      ORDER BY p.confidence DESC, o.home_odds ASC
      LIMIT 10
    `,
    args: [slug]
  })
  
  return {
    picks: result.rows,
    generated_at: new Date().toISOString()
  }
})
```

**Database Schema:**
```sql
-- server/migrations/001_initial.sql
CREATE TABLE IF NOT EXISTS leagues (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  flag TEXT,
  current_round INTEGER,
  season TEXT
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  team_key TEXT,
  league_key TEXT,
  form TEXT,
  FOREIGN KEY (league_key) REFERENCES leagues(key)
);

CREATE TABLE IF NOT EXISTS standings (
  id INTEGER PRIMARY KEY,
  league_key TEXT,
  team_id INTEGER,
  gp INTEGER,
  w INTEGER,
  d INTEGER,
  l INTEGER,
  gf INTEGER,
  ga INTEGER,
  pts INTEGER,
  position INTEGER,
  FOREIGN KEY (league_key) REFERENCES leagues(key),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  league_key TEXT,
  round INTEGER,
  home_team_id INTEGER,
  away_team_id INTEGER,
  home_goals INTEGER,
  away_goals INTEGER,
  date TEXT,
  status TEXT,
  FOREIGN KEY (league_key) REFERENCES leagues(key),
  FOREIGN KEY (home_team_id) REFERENCES teams(id),
  FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS odds (
  id INTEGER PRIMARY KEY,
  game_id INTEGER UNIQUE,
  home_odds REAL,
  draw_odds REAL,
  away_odds REAL,
  over_25_odds REAL,
  under_25_odds REAL,
  updated_at TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY,
  game_id INTEGER UNIQUE,
  prediction TEXT,
  confidence INTEGER,
  recommended_bet TEXT,
  explanation TEXT,
  created_at TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

-- Indexes for performance
CREATE INDEX idx_games_league_round ON games(league_key, round);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_standings_league ON standings(league_key);
```

---

## 🎯 **Option 2: Cloudflare Workers + D1 (SQLite)**
**Best for: Global edge deployment, unlimited free requests**

### Architecture
```
Cloudflare Edge Network (310+ locations)
├─ Workers (Serverless Functions) - FREE 100k req/day
├─ D1 Database (SQLite) - FREE 5GB storage
├─ KV Store (Key-Value cache) - FREE 100k reads/day
└─ R2 Storage (JSON backups) - FREE 10GB
```

### Cost: **FREE** (100k requests/day, 5GB database)

### Setup:

```bash
npm install -g wrangler
wrangler login
wrangler d1 create protero-db
```

**File: `wrangler.toml`**
```toml
name = "protero-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "protero-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"
```

**File: `workers/src/index.ts`**
```typescript
export interface Env {
  DB: D1Database
  CACHE: KVNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    
    // API Router
    if (url.pathname.startsWith('/api/leagues')) {
      return handleLeagues(request, env)
    }
    
    return new Response('Not Found', { status: 404 })
  }
}

async function handleLeagues(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const slug = url.pathname.split('/')[3]
  
  if (!slug) {
    // List all leagues
    const cacheKey = 'leagues:all'
    let cached = await env.CACHE.get(cacheKey, 'json')
    
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT' 
        }
      })
    }
    
    const result = await env.DB.prepare(
      'SELECT * FROM leagues ORDER BY name'
    ).all()
    
    await env.CACHE.put(cacheKey, JSON.stringify(result.results), {
      expirationTtl: 3600 // 1 hour
    })
    
    return new Response(JSON.stringify(result.results), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS' 
      }
    })
  }
  
  // Get specific league
  const cacheKey = `league:${slug}`
  let cached = await env.CACHE.get(cacheKey, 'json')
  
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'HIT' 
      }
    })
  }
  
  const [league, standings, games] = await Promise.all([
    env.DB.prepare('SELECT * FROM leagues WHERE key = ?').bind(slug).first(),
    env.DB.prepare('SELECT * FROM standings WHERE league_key = ? ORDER BY pts DESC').bind(slug).all(),
    env.DB.prepare('SELECT * FROM games WHERE league_key = ? AND status = "scheduled" LIMIT 20').bind(slug).all()
  ])
  
  const response = { league, standings: standings.results, games: games.results }
  
  await env.CACHE.put(cacheKey, JSON.stringify(response), {
    expirationTtl: 300 // 5 minutes
  })
  
  return new Response(JSON.stringify(response), {
    headers: { 
      'Content-Type': 'application/json',
      'X-Cache': 'MISS' 
    }
  })
}
```

---

## 🎯 **Option 3: Supabase (Postgres + Realtime)**
**Best for: Advanced features, auth, real-time updates**

### Architecture
```
Supabase Cloud (managed Postgres)
├─ PostgreSQL Database - FREE 500MB
├─ Edge Functions (Deno) - FREE 500k invocations
├─ Realtime Subscriptions - FREE
├─ Authentication - FREE
└─ Storage - FREE 1GB
```

### Cost: **FREE** (500MB database, 500k function calls)

### Setup:

```bash
npm install @supabase/supabase-js
```

**File: `server/utils/supabase.ts`**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

**File: `server/api/leagues/[slug].get.ts`**
```typescript
import { supabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  
  // Get league with standings and upcoming games
  const { data: league } = await supabase
    .from('leagues')
    .select('*')
    .eq('key', slug)
    .single()
  
  const { data: standings } = await supabase
    .from('standings')
    .select(`
      *,
      team:teams(name, team_key, form)
    `)
    .eq('league_key', slug)
    .order('pts', { ascending: false })
  
  const { data: games } = await supabase
    .from('games')
    .select(`
      *,
      home_team:teams!home_team_id(name, form),
      away_team:teams!away_team_id(name, form),
      odds(*)
    `)
    .eq('league_key', slug)
    .eq('status', 'scheduled')
    .order('date', { ascending: true })
    .limit(20)
  
  return { league, standings, games }
})
```

**Real-time Updates (Frontend):**
```typescript
// composables/useRealtimeScores.ts
import { supabase } from '~/utils/supabase-client'

export const useRealtimeScores = (leagueKey: string) => {
  const games = ref([])
  
  onMounted(() => {
    // Subscribe to game updates
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
        (payload) => {
          console.log('Game updated:', payload)
          // Update local games array
          const index = games.value.findIndex(g => g.id === payload.new.id)
          if (index >= 0) {
            games.value[index] = payload.new
          }
        }
      )
      .subscribe()
    
    onUnmounted(() => {
      supabase.removeChannel(channel)
    })
  })
  
  return { games }
}
```

---

## 🎯 **Option 4: Vercel Serverless + Upstash Redis**
**Best for: Nuxt deployment, fast caching**

### Architecture
```
Vercel (Serverless Platform)
├─ Nuxt App (Edge Functions)
├─ Upstash Redis (Global cache) - FREE 10k commands/day
└─ Vercel KV (Key-Value) - FREE tier
```

### Setup:

```bash
npm install @upstash/redis
```

**File: `server/utils/cache.ts`**
```typescript
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
})

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key)
  if (cached) {
    return cached as T
  }
  
  // Fetch fresh data
  const data = await fetcher()
  
  // Cache it
  await redis.setex(key, ttl, JSON.stringify(data))
  
  return data
}
```

**File: `server/api/leagues/[slug].get.ts`**
```typescript
import { getCached } from '~/server/utils/cache'
import { readFile } from 'fs/promises'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  
  return await getCached(
    `league:${slug}`,
    async () => {
      // Fetch from JSON file or database
      const filePath = `public/data/leagues/${slug}.json`
      const data = await readFile(filePath, 'utf-8')
      return JSON.parse(data)
    },
    300 // 5 minutes
  )
})
```

---

## 📊 **Comparison Table**

| Feature | Turso | Cloudflare | Supabase | Vercel+Redis |
|---------|-------|------------|----------|--------------|
| **Free Tier** | 9GB / 1B reads | 100k req/day | 500MB DB | 10k Redis cmds |
| **Setup Time** | 15 min | 20 min | 10 min | 10 min |
| **Latency** | <50ms (edge) | <10ms (edge) | ~100ms | ~50ms |
| **SQL Support** | ✅ SQLite | ✅ SQLite | ✅ Postgres | ❌ |
| **Realtime** | ❌ | ❌ | ✅ | ❌ |
| **Auth Built-in** | ❌ | ❌ | ✅ | ❌ |
| **Best For** | SQL queries | Edge perf | Full features | Caching |
| **Migration** | Easy | Medium | Easy | Easy |

---

## 🚀 **My Recommendation: Start with Turso**

**Why:**
1. ✅ Works perfectly with your current Nuxt setup
2. ✅ Free tier is very generous (9GB storage)
3. ✅ SQL queries are simple and powerful
4. ✅ Global edge replication (fast everywhere)
5. ✅ Easy to migrate FROM JSON (I can help)

**Migration Path:**
```
Current: JSON files (520KB, slow on load)
    ↓
Step 1: Turso DB + Keep JSON as backup (1 hour)
    ↓
Step 2: Update frontend to use API routes (2 hours)
    ↓
Step 3: Add caching layer (1 hour)
    ↓
Done: Fast, scalable, real-time capable
```

---

## 💻 **Want me to implement one?**

I can set up any of these options for you. Which sounds best:

1. **Turso + Nuxt Server Routes** (Recommended - best balance)
2. **Cloudflare Workers** (Maximum performance)
3. **Supabase** (Want auth + realtime features)
4. **Keep JSON + Add Redis caching** (Minimal changes)

Let me know and I'll build it out!
