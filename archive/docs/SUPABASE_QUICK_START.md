# 🎯 Supabase Quick Start

**Fast reference for common operations after migration**

---

## 📦 Installation

```bash
# Frontend
npm install @supabase/supabase-js

# Backend/ML
pip install supabase psycopg2-binary
```

---

## 🔑 Environment Setup

```bash
# .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...          # Public key (frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Secret key (backend/ML)
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
```

---

## 🚀 Common Operations

### TypeScript/Nuxt (Frontend/API)

```typescript
import { getSupabase } from '~/server/utils/supabase'

const supabase = getSupabase()

// 1. Get all upcoming games
const { data: games } = await supabase
  .from('games')
  .select('*, home_team:teams!home_team_id(*), away_team:teams!away_team_id(*)')
  .eq('status', 'scheduled')
  .gte('date', new Date().toISOString())
  .order('date', { ascending: true })

// 2. Get predictions for a game
const { data: prediction } = await supabase
  .from('predictions')
  .select('*')
  .eq('game_id', gameId)
  .eq('model_version', 'v11')
  .single()

// 3. Insert prediction
const { data: newPrediction } = await supabase
  .from('predictions')
  .upsert({
    game_id: 123,
    model_version: 'v11',
    prediction: 'HOME',
    confidence: 75,
    home_win_prob: 60,
    draw_prob: 25,
    away_win_prob: 15
  })
  .select()
  .single()

// 4. Get wallet status
const { data: wallet } = await supabase
  .from('wallets')
  .select('*, bets(*)')
  .eq('id', walletId)
  .single()

// 5. Place bet
const { data: bet } = await supabase
  .from('bets')
  .insert({
    wallet_id: 1,
    game_id: 123,
    bet_type: 'HOME',
    stake: 10.00,
    odds: 2.50,
    status: 'pending'
  })
  .select()
  .single()
```

### Python (ML Services)

```python
from ml.utils.supabase_client import get_supabase, fetch_games, fetch_predictions

# 1. Get client
client = get_supabase()

# 2. Fetch upcoming games
games = fetch_games(
    league_key='ESP-La-Liga',
    status='scheduled',
    limit=10
)

# 3. Fetch historical data for team
from ml.utils.supabase_client import execute_query

historical = execute_query("""
    SELECT * FROM games
    WHERE (home_team_id = %s OR away_team_id = %s)
      AND status = 'completed'
      AND date < %s
    ORDER BY date DESC
    LIMIT 10
""", [team_id, team_id, game_date])

# 4. Insert predictions (bulk)
from ml.utils.supabase_client import insert_predictions_bulk

predictions = [
    {
        'game_id': 1,
        'model_version': 'v11',
        'prediction': 'HOME',
        'confidence': 75,
        'home_win_prob': 60,
        'draw_prob': 25,
        'away_win_prob': 15
    },
    # ... more predictions
]

insert_predictions_bulk(predictions)

# 5. Upsert single prediction
from ml.utils.supabase_client import upsert_prediction

upsert_prediction({
    'game_id': 123,
    'model_version': 'v11',
    'prediction': 'HOME',
    'confidence': 75,
    'expected_value': 0.15,
    'kelly_percentage': 0.05
})
```

---

## 📊 Common SQL Queries

### Get Today's Predictions

```sql
SELECT 
  p.*,
  g.date,
  ht.name as home_team,
  at.name as away_team,
  g.league_key
FROM predictions p
JOIN games g ON p.game_id = g.id
JOIN teams ht ON g.home_team_id = ht.id
JOIN teams at ON g.away_team_id = at.id
WHERE DATE(g.date) = CURRENT_DATE
  AND p.model_version = 'v11'
ORDER BY p.confidence DESC;
```

### Betting Performance Summary

```sql
SELECT 
  DATE(placed_at) as bet_date,
  COUNT(*) as total_bets,
  SUM(stake) as total_staked,
  SUM(profit) as total_profit,
  SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
  ROUND(SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100, 2) as win_rate,
  ROUND(SUM(profit) / SUM(stake) * 100, 2) as roi
FROM bets
WHERE settled_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(placed_at)
ORDER BY bet_date DESC;
```

### Model Accuracy

```sql
SELECT 
  model_version,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN result_correct THEN 1 ELSE 0 END) as correct,
  ROUND(SUM(CASE WHEN result_correct THEN 1 ELSE 0 END)::NUMERIC / COUNT(*) * 100, 2) as accuracy,
  AVG(confidence) as avg_confidence
FROM predictions
WHERE result_correct IS NOT NULL
GROUP BY model_version
ORDER BY accuracy DESC;
```

---

## 🔥 Views (Pre-built Queries)

```sql
-- Use built-in views for common queries

-- Active predictions (upcoming games)
SELECT * FROM v_active_predictions 
WHERE confidence >= 60
ORDER BY game_date;

-- Model comparison
SELECT * FROM v_model_comparison
ORDER BY accuracy DESC;

-- Wallet performance
SELECT * FROM v_wallet_performance;

-- Recent bets with game details
SELECT * FROM v_recent_bets
WHERE settled_at >= CURRENT_DATE - INTERVAL '7 days';
```

---

## 🛠️ Useful Functions

### TypeScript Helpers

```typescript
// server/utils/supabase.ts exports these:

// Get games with team names
import { getGamesWithTeams } from '~/server/utils/supabase'
const games = await getGamesWithTeams({
  leagueKey: 'ESP-La-Liga',
  status: 'scheduled',
  limit: 10
})

// Get predictions with game details
import { getPredictionsWithGames } from '~/server/utils/supabase'
const predictions = await getPredictionsWithGames({
  modelVersion: 'v11',
  minConfidence: 60,
  upcoming: true
})

// Place bet with validation
import { placeBet } from '~/server/utils/supabase'
const bet = await placeBet({
  wallet_id: 1,
  game_id: 123,
  bet_type: 'HOME',
  stake: 10.00,
  odds: 2.50
})
```

### Python Helpers

```python
# ml/utils/supabase_client.py exports these:

from ml.utils.supabase_client import (
    get_supabase,              # Get client
    execute_query,             # Run raw SQL
    fetch_games,               # Get games with filters
    fetch_predictions,         # Get predictions with filters
    fetch_historical_data,     # Get historical games for team
    upsert_prediction,         # Insert/update prediction
    insert_predictions_bulk,   # Bulk insert predictions
    close_connections          # Cleanup
)
```

---

## 🔍 Debugging

### Check Connection

```typescript
// TypeScript
const supabase = getSupabase()
const { data, error } = await supabase.from('games').select('count')
console.log('Connected:', !error)
```

```python
# Python
from ml.utils.supabase_client import get_supabase
client = get_supabase()  # Should print "✓ Connected to Supabase"
```

### Check Table Counts

```sql
-- Run in Supabase SQL Editor
SELECT 
  'games' as table_name, COUNT(*) as rows FROM games
UNION ALL
SELECT 'predictions', COUNT(*) FROM predictions
UNION ALL
SELECT 'bets', COUNT(*) FROM bets
UNION ALL
SELECT 'teams', COUNT(*) FROM teams;
```

### Monitor Performance

- **Dashboard** → **Reports** → **Query Performance**
- Look for slow queries (>1s)
- Check database size usage

---

## 📝 Migration Snippets

### Update API Route (Turso → Supabase)

```typescript
// BEFORE (Turso)
import { createClient } from '@libsql/client'
const client = createClient({ url, authToken })
const result = await client.execute({
  sql: 'SELECT * FROM predictions WHERE game_id = ?',
  args: [gameId]
})
return result.rows[0]

// AFTER (Supabase)
import { getSupabase } from '~/server/utils/supabase'
const supabase = getSupabase()
const { data } = await supabase
  .from('predictions')
  .select('*')
  .eq('game_id', gameId)
  .single()
return data
```

### Update ML Script (Turso → Supabase)

```python
# BEFORE (Turso)
from libsql_client import create_client_sync
conn = create_client_sync(url=url, auth_token=token)
result = conn.execute("INSERT INTO predictions VALUES (?, ?, ?)", [a, b, c])

# AFTER (Supabase)
from ml.utils.supabase_client import upsert_prediction
upsert_prediction({
    'game_id': a,
    'model_version': b,
    'prediction': c
})
```

---

## 🎯 Next Steps

1. ✅ Run `npm install` to add Supabase dependency
2. ✅ Update `.env` with Supabase credentials
3. ✅ Run schema migration in Supabase SQL Editor
4. ✅ Test connection with quick query
5. ✅ Migrate data from Turso
6. ✅ Update API routes one by one
7. ✅ Update ML scripts
8. ✅ Test end-to-end flow
9. ✅ Deploy and monitor

---

## 📚 Resources

- **Full Migration Guide:** `SUPABASE_MIGRATION_GUIDE.md`
- **Schema File:** `database/migrations/supabase_schema.sql`
- **TypeScript Utils:** `server/utils/supabase.ts`
- **Python Utils:** `ml/utils/supabase_client.py`
- **Supabase Docs:** https://supabase.com/docs

---

🚀 **You're ready to migrate!**
