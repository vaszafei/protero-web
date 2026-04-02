# 🚀 Turso → Supabase Migration Guide

**Project:** Protero Football Prediction System  
**Date:** January 26, 2026  
**Migration Type:** Turso (SQLite) → Supabase (PostgreSQL)

---

## 📋 Table of Contents

1. [Why Migrate to Supabase?](#why-migrate)
2. [Migration Overview](#overview)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Migration](#migration-steps)
5. [Code Changes Required](#code-changes)
6. [Testing & Validation](#testing)
7. [Rollback Plan](#rollback)
8. [Post-Migration Optimization](#optimization)

---

## 🎯 Why Migrate to Supabase? <a name="why-migrate"></a>

### Current Setup (Turso)
- ✅ Serverless SQLite database
- ✅ Low latency, edge distribution
- ⚠️ SQLite limitations (no complex joins, limited concurrency)
- ⚠️ Vendor lock-in with libsql protocol

### New Setup (Supabase)
- ✅ PostgreSQL (industry standard, powerful)
- ✅ Built-in authentication, real-time subscriptions
- ✅ Better analytics, complex queries, full-text search
- ✅ PostGIS for geospatial data (future features)
- ✅ Row Level Security (RLS) for data protection
- ✅ Free tier: 500MB database, unlimited API requests
- ✅ Direct SQL access for ML pipelines

---

## 📊 Migration Overview <a name="overview"></a>

### What's Changing

| Component | Before (Turso) | After (Supabase) |
|-----------|----------------|------------------|
| **Database** | libsql (SQLite) | PostgreSQL 15 |
| **Client Library** | `@libsql/client` | `@supabase/supabase-js` |
| **Python Client** | `libsql_client` | `supabase-py` + `psycopg2` |
| **Connection** | `TURSO_DATABASE_URL` | `SUPABASE_URL` + `SUPABASE_DB_URL` |
| **Auth** | `TURSO_AUTH_TOKEN` | `SUPABASE_SERVICE_ROLE_KEY` |
| **SQL Syntax** | SQLite | PostgreSQL |
| **Data Types** | INTEGER, REAL, TEXT | BIGSERIAL, NUMERIC, JSONB, TIMESTAMP |

### Migration Phases

```
Phase 1: Setup Supabase              [30 min]
Phase 2: Run Schema Migration        [15 min]
Phase 3: Migrate Data from Turso     [1-2 hours]
Phase 4: Update Application Code     [2-3 hours]
Phase 5: Update ML Scripts           [1-2 hours]
Phase 6: Testing & Validation        [1 hour]
Phase 7: Deploy & Monitor            [30 min]
────────────────────────────────────────────
Total Estimated Time: 6-10 hours
```

---

## ✅ Prerequisites <a name="prerequisites"></a>

### 1. Supabase Account Setup

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up / Log in
3. Create new project:
   - Name: `protero-football`
   - Database Password: Save this securely!
   - Region: Choose closest to your users (e.g., `eu-west-1`)
4. Wait 2-3 minutes for project provisioning

### 2. Get Supabase Credentials

After project is created:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: For frontend (public)
   - **service_role key**: For backend/ML (secret - keep secure!)

3. Go to **Settings** → **Database**
4. Copy **Connection String** (Postgres):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### 3. Update Environment Variables

Edit `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  # Public key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Secret key (server-side only!)
SUPABASE_DB_URL=postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres

# Keep Turso credentials for migration period
TURSO_DATABASE_URL=libsql://protero-football-xxx.turso.io
TURSO_AUTH_TOKEN=xxx
```

### 4. Install Dependencies

**Frontend (Nuxt):**
```bash
npm install @supabase/supabase-js
```

**Backend (Python/ML):**
```bash
cd ml
source venv/bin/activate  # or: . venv/bin/activate
pip install supabase psycopg2-binary python-dotenv
```

---

## 🔄 Step-by-Step Migration <a name="migration-steps"></a>

### Phase 1: Setup Supabase (30 min)

#### Step 1.1: Run Schema Migration

1. Open Supabase Dashboard → **SQL Editor**
2. Create new query
3. Copy entire contents of `database/migrations/supabase_schema.sql`
4. Click **Run** (executes all tables, indexes, views, triggers)
5. Check for errors (should be none if PostgreSQL 15+)

**Verification:**
```sql
-- Run in SQL Editor to verify tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- teams
- games
- lineups
- model_versions
- predictions
- wallets
- bets
- strategy_performance
- users
- sessions

#### Step 1.2: Verify Triggers & Functions

```sql
-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- Check functions
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public';
```

---

### Phase 2: Migrate Data from Turso (1-2 hours)

#### Option A: Export/Import (Recommended for <100K rows)

1. **Export from Turso:**

```bash
# Create export script
cat > export_turso_data.py << 'EOF'
import os
import json
import sqlite3
from libsql_client import create_client_sync

# Connect to Turso
url = os.getenv('TURSO_DATABASE_URL').replace('libsql://', 'https://')
token = os.getenv('TURSO_AUTH_TOKEN')
turso = create_client_sync(url=url, auth_token=token)

# Export tables
tables = ['teams', 'games', 'predictions', 'wallets', 'bets']

for table in tables:
    print(f"Exporting {table}...")
    result = turso.execute(f"SELECT * FROM {table}")
    
    with open(f'export_{table}.json', 'w') as f:
        json.dump([dict(row) for row in result.rows], f, default=str)
    
    print(f"  → Exported {len(result.rows)} rows")

print("\nExport complete!")
EOF

python export_turso_data.py
```

2. **Import to Supabase:**

```bash
cat > import_to_supabase.py << 'EOF'
import os
import json
from ml.utils.supabase_client import get_supabase, execute_query

client = get_supabase()

tables = ['teams', 'games', 'predictions', 'wallets', 'bets']

for table in tables:
    print(f"\nImporting {table}...")
    
    with open(f'export_{table}.json', 'r') as f:
        data = json.load(f)
    
    if not data:
        print(f"  → No data for {table}")
        continue
    
    # Batch insert (500 rows at a time for efficiency)
    batch_size = 500
    for i in range(0, len(data), batch_size):
        batch = data[i:i+batch_size]
        
        response = client.table(table).insert(batch).execute()
        print(f"  → Inserted {len(batch)} rows (batch {i//batch_size + 1})")
    
    print(f"✓ {table}: {len(data)} rows imported")

print("\n✓ All data imported successfully!")
EOF

python import_to_supabase.py
```

#### Option B: Direct Migration Script (For Large Datasets)

```python
# migrate_turso_to_supabase.py
import os
from libsql_client import create_client_sync
from ml.utils.supabase_client import get_supabase

# Connect to both databases
turso_url = os.getenv('TURSO_DATABASE_URL').replace('libsql://', 'https://')
turso = create_client_sync(url=turso_url, auth_token=os.getenv('TURSO_AUTH_TOKEN'))
supabase = get_supabase()

# Migrate teams first (foreign key dependency)
print("Migrating teams...")
teams = turso.execute("SELECT * FROM teams").rows
supabase.table('teams').insert([dict(t) for t in teams]).execute()

# Migrate games
print("Migrating games...")
games = turso.execute("SELECT * FROM games").rows
# Convert SQLite date format to PostgreSQL timestamp
for game in games:
    game['date'] = game['date'] + '+00:00' if 'T' in game['date'] else game['date']

supabase.table('games').insert([dict(g) for g in games]).execute()

# Migrate predictions, bets, etc.
# ... similar pattern
```

---

### Phase 3: Update Application Code (2-3 hours)

#### Step 3.1: Update Nuxt Configuration

Edit `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  // ... existing config ...
  
  runtimeConfig: {
    // Private (server-only)
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    
    // Keep Turso for migration period
    tursoDbUrl: process.env.TURSO_DATABASE_URL,
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN,
    
    // Public (exposed to frontend)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  }
})
```

#### Step 3.2: Update Server API Routes

**Before (Turso):**
```typescript
// server/api/predictions/[gameId].get.ts
import { createClient } from '@libsql/client'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const client = createClient({
    url: config.tursoDbUrl,
    authToken: config.tursoAuthToken
  })
  
  const result = await client.execute({
    sql: 'SELECT * FROM predictions WHERE game_id = ?',
    args: [gameId]
  })
  
  return result.rows[0]
})
```

**After (Supabase):**
```typescript
// server/api/predictions/[gameId].get.ts
import { getSupabase } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const gameId = event.context.params?.gameId
  const supabase = getSupabase()
  
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('game_id', gameId)
    .single()
  
  if (error) {
    throw createError({
      statusCode: 404,
      message: 'Prediction not found'
    })
  }
  
  return data
})
```

#### Step 3.3: Batch Update All API Routes

Replace in all `server/api/**/*.ts` files:

```typescript
// OLD - Remove these
import { createClient } from '@libsql/client'
const client = createClient({ url, authToken })
client.execute({ sql, args })

// NEW - Use these
import { getSupabase } from '~/server/utils/supabase'
const supabase = getSupabase()
supabase.from('table').select('*').execute()
```

#### Step 3.4: SQL Syntax Changes

Common changes needed:

| SQLite (Turso) | PostgreSQL (Supabase) |
|----------------|----------------------|
| `?` placeholders | `$1, $2, $3` or named |
| `AUTOINCREMENT` | `SERIAL` / `BIGSERIAL` |
| `INTEGER` | `BIGINT` |
| `REAL` | `NUMERIC(10,2)` |
| `DATETIME` | `TIMESTAMP WITH TIME ZONE` |
| `date('now')` | `NOW()` |
| `||` (concat) | `||` (same) |
| No JSON support | `JSONB` type |

---

### Phase 4: Update ML Scripts (1-2 hours)

#### Step 4.1: Update Prediction Scripts

Edit `ml/prediction/predict_v11_to_turso.py` → Rename to `predict_v11_to_supabase.py`:

**Before:**
```python
from libsql_client import create_client_sync

url = os.getenv('TURSO_DATABASE_URL').replace('libsql://', 'https://')
token = os.getenv('TURSO_AUTH_TOKEN')
conn = create_client_sync(url=url, auth_token=token)

# Write predictions
result = conn.execute(
    "INSERT INTO predictions (game_id, prediction, confidence) VALUES (?, ?, ?)",
    [game_id, pred, conf]
)
```

**After:**
```python
from ml.utils.supabase_client import get_supabase, upsert_prediction

client = get_supabase()

# Write prediction
upsert_prediction({
    'game_id': game_id,
    'model_version': 'v11',
    'prediction': pred,
    'confidence': conf,
    'home_win_prob': probs[0],
    'draw_prob': probs[1],
    'away_win_prob': probs[2],
    'expected_value': ev,
    'kelly_percentage': kelly
})
```

#### Step 4.2: Update Training Scripts

Similar changes for:
- `ml/training/train_v11.py`
- `ml/betting/backtest_v11.py`
- `ml/betting/decide_bets.py`

Use the new helper functions:
```python
from ml.utils.supabase_client import (
    fetch_games,
    fetch_predictions,
    fetch_historical_data,
    execute_query
)
```

---

### Phase 5: Testing & Validation (1 hour)

#### Test Checklist

- [ ] **Database Schema**
  ```sql
  -- Verify all tables exist
  SELECT COUNT(*) FROM games;
  SELECT COUNT(*) FROM predictions;
  SELECT COUNT(*) FROM bets;
  ```

- [ ] **API Endpoints**
  ```bash
  # Test predictions endpoint
  curl http://localhost:3000/api/predictions/1
  
  # Test wallet status
  curl http://localhost:3000/api/wallet/status
  ```

- [ ] **ML Pipeline**
  ```bash
  cd ml
  source venv/bin/activate
  python prediction/predict_v11_to_supabase.py
  # Should write predictions successfully
  ```

- [ ] **Frontend**
  ```bash
  npm run dev
  # Navigate to dashboard, verify data loads
  ```

---

### Phase 6: Deploy & Monitor (30 min)

1. **Update Production Environment Variables**
   - Add Supabase credentials to production `.env`
   - Keep Turso credentials as backup

2. **Deploy Updates**
   ```bash
   git add .
   git commit -m "Migrate from Turso to Supabase"
   git push
   ```

3. **Monitor for Issues**
   - Check Supabase Dashboard → **Logs**
   - Monitor API response times
   - Verify predictions are being generated

---

## 🔙 Rollback Plan <a name="rollback"></a>

If issues occur, you can quickly rollback:

1. **Restore Turso as Primary Database:**
   ```bash
   # In .env, comment out Supabase
   # SUPABASE_URL=...
   # SUPABASE_SERVICE_ROLE_KEY=...
   
   # Keep using Turso
   TURSO_DATABASE_URL=libsql://...
   TURSO_AUTH_TOKEN=...
   ```

2. **Revert Code Changes:**
   ```bash
   git revert HEAD
   # or
   git checkout <previous-commit>
   ```

3. **Keep Supabase Running:**
   - Data is still there
   - Can resume migration later

---

## 🚀 Post-Migration Optimization <a name="optimization"></a>

### 1. Enable Realtime (Optional)

```sql
-- Enable realtime for predictions table
ALTER TABLE predictions REPLICA IDENTITY FULL;

-- In Supabase Dashboard → Database → Replication
-- Enable realtime for: predictions, bets, games
```

### 2. Create Materialized Views for Analytics

```sql
-- Fast daily performance summary
CREATE MATERIALIZED VIEW daily_betting_performance AS
SELECT 
  DATE(placed_at) as bet_date,
  COUNT(*) as total_bets,
  SUM(stake) as total_staked,
  SUM(profit) as total_profit,
  AVG(odds) as avg_odds,
  SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins
FROM bets
GROUP BY DATE(placed_at);

-- Refresh daily
SELECT cron.schedule('refresh-daily-performance', '0 0 * * *', 
  'REFRESH MATERIALIZED VIEW daily_betting_performance'
);
```

### 3. Setup Database Backups

- Supabase automatically backs up daily (free tier: 7 days retention)
- For additional safety, export weekly:
  ```bash
  # Create backup script
  pg_dump $SUPABASE_DB_URL > backup_$(date +%Y%m%d).sql
  ```

### 4. Monitor Performance

- **Supabase Dashboard** → **Reports**
  - Query performance
  - API usage
  - Database size
  
- Set up alerts for:
  - Slow queries (>1s)
  - Database size (approaching limit)
  - Error rates

---

## 📈 Expected Benefits

### Performance Improvements
- **Complex Queries:** 2-5x faster (PostgreSQL vs SQLite)
- **Concurrent Writes:** Unlimited (vs SQLite's single writer)
- **Analytics:** Native JSONB indexing, full-text search

### Feature Unlocks
- **Real-time Subscriptions:** Live updates in frontend
- **PostGIS:** Geospatial queries (future: stadium locations, fan bases)
- **Row Level Security:** Secure multi-user access
- **Vector Extensions:** AI embeddings for advanced ML

### Cost Savings
- **Free Tier:** 500MB database, unlimited API requests
- **No Vendor Lock-in:** Standard PostgreSQL (migrate anywhere)
- **Reduced Complexity:** Built-in auth, storage, functions

---

## 🎯 Success Metrics

After migration, verify:
- [ ] All API endpoints respond <500ms
- [ ] ML predictions running successfully
- [ ] Frontend dashboard loading correctly
- [ ] Betting system placing/settling bets
- [ ] No data loss (row counts match)
- [ ] Supabase Dashboard showing activity

---

## 📞 Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Migration:** https://supabase.com/docs/guides/database/migrating-to-supabase
- **Supabase Discord:** https://discord.supabase.com

---

## ✅ Migration Checklist

Copy this checklist and track progress:

```markdown
## Pre-Migration
- [ ] Supabase account created
- [ ] Project provisioned
- [ ] Credentials saved in .env
- [ ] Dependencies installed (npm + pip)
- [ ] Backup of current Turso data

## Migration
- [ ] Schema deployed to Supabase
- [ ] Tables verified in SQL Editor
- [ ] Data exported from Turso
- [ ] Data imported to Supabase
- [ ] Row counts match

## Code Updates
- [ ] nuxt.config.ts updated
- [ ] server/utils/supabase.ts created
- [ ] All API routes migrated
- [ ] ML scripts updated
- [ ] SQL syntax updated

## Testing
- [ ] API endpoints tested
- [ ] Frontend dashboard verified
- [ ] ML predictions working
- [ ] Betting system functional
- [ ] Performance acceptable

## Deployment
- [ ] Production env vars updated
- [ ] Code deployed
- [ ] Monitoring enabled
- [ ] Rollback plan documented
- [ ] Team notified

## Post-Migration
- [ ] Turso kept as backup (1 week)
- [ ] Performance monitoring active
- [ ] No critical errors
- [ ] Users happy with performance
- [ ] Turso decommissioned (after 1 week)
```

---

**Migration Time:** 6-10 hours  
**Risk Level:** Low (easy rollback available)  
**Benefits:** High (better performance, more features, cost savings)

🚀 **Ready to migrate? Start with Phase 1!**
