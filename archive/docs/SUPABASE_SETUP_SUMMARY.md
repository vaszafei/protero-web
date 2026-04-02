# ✅ Supabase Migration - Files Created

**Date:** January 26, 2026  
**Status:** Ready to migrate from local SQLite to Supabase

---

## 📁 Files Created

### 1. Database Schema
**File:** `database/migrations/supabase_schema.sql`  
**Purpose:** Complete PostgreSQL schema for Supabase  
**Size:** ~600 lines  
**Contains:**
- All tables (teams, games, predictions, bets, wallets, etc.)
- Indexes for performance
- Views for analytics
- Triggers for automatic updates
- Row Level Security policies
- Initial data (default wallet, v11 model)

### 2. TypeScript/Nuxt Integration
**File:** `server/utils/supabase.ts`  
**Purpose:** Supabase client for Nuxt server API  
**Contains:**
- `getSupabase()` - Get client instance
- `getGamesWithTeams()` - Helper for games with team names
- `getPredictionsWithGames()` - Helper for predictions
- `placeBet()` - Place bet with validation
- `settleBet()` - Settle bet and update wallet

**File:** `types/database.ts`  
**Purpose:** TypeScript types for database schema  
**Auto-generated types for type safety**

### 3. Python/ML Integration
**File:** `ml/utils/supabase_client.py`  
**Purpose:** Supabase client for Python ML scripts  
**Contains:**
- `get_supabase()` - Get client
- `execute_query()` - Run raw SQL
- `fetch_games()` - Get games with filters
- `fetch_predictions()` - Get predictions
- `upsert_prediction()` - Insert/update prediction
- `insert_predictions_bulk()` - Bulk operations

### 4. Migration Scripts
**File:** `tools/migrate_local_to_supabase.py` ✨ **USE THIS ONE**  
**Purpose:** Migrate from local SQLite databases  
**Migrates:**
- 6,700 games from `ml/data/games_ml.db`
- Teams from `protero.db`
- Predictions from `protero.db`

### 5. Configuration
**File:** `.env.example` (updated)  
**Added Supabase configuration:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_DB_URL=postgresql://...
```

**File:** `nuxt.config.ts` (updated)  
**Added Supabase runtime config**

**File:** `package.json` (updated)  
**Added:** `@supabase/supabase-js`

**File:** `ml/requirements_supabase.txt`  
**Python dependencies:**
```
supabase==2.3.4
psycopg2-binary==2.9.9
python-dotenv==1.0.0
```

### 6. Documentation
**File:** `SUPABASE_MIGRATION_GUIDE.md`  
**Purpose:** Complete step-by-step migration guide  
**Includes:**
- Why migrate to Supabase
- Prerequisites and setup
- Migration phases (6-10 hours total)
- Code changes required
- Testing checklist
- Rollback plan

**File:** `SUPABASE_QUICK_START.md`  
**Purpose:** Quick reference for common operations  
**Includes:**
- Installation commands
- TypeScript examples
- Python examples
- Common SQL queries
- Helper functions

---

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Supabase (15 min)

1. Create Supabase project at https://supabase.com
2. Get credentials from Settings → API
3. Update `.env`:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### Step 2: Run Schema Migration (5 min)

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `database/migrations/supabase_schema.sql`
3. Click **Run**
4. Verify tables created

### Step 3: Migrate Data (30 min)

```bash
# Install Python dependencies
cd ml
pip install supabase psycopg2-binary

# Run migration from local databases
cd ..
python tools/migrate_local_to_supabase.py
```

This will migrate:
- ✅ 6,700 games from `ml/data/games_ml.db`
- ✅ 20 teams from `protero.db`  
- ✅ Any predictions from `protero.db`

---

## 📊 Your Local Data

```
ml/data/games_ml.db:     1.6 MB  - 6,700 games (MAIN DATA)
protero.db:              92 KB   - 67 games, 20 teams, predictions
```

The migration script uses these local files, **NOT Turso**.

---

## ✅ What You Have Now

1. ✅ Complete PostgreSQL schema for Supabase
2. ✅ TypeScript utilities for Nuxt frontend/API
3. ✅ Python utilities for ML scripts
4. ✅ Migration script ready to run
5. ✅ Complete documentation
6. ✅ No Turso dependency needed!

---

## 📝 Next Steps

1. **Create Supabase account** (if not done)
2. **Run schema migration** in SQL Editor
3. **Install dependencies:**
   ```bash
   npm install @supabase/supabase-js
   pip install supabase psycopg2-binary
   ```
4. **Run migration script:**
   ```bash
   python tools/migrate_local_to_supabase.py
   ```
5. **Update API routes** to use new utilities
6. **Test and deploy**

---

## 🎯 Benefits Over Turso

- ✅ **No vendor lock-in** - Standard PostgreSQL
- ✅ **Better performance** - Complex queries, joins, aggregations
- ✅ **More features** - Real-time, storage, auth, functions
- ✅ **Better analytics** - JSONB, full-text search, PostGIS
- ✅ **Free tier** - 500MB database, unlimited API requests
- ✅ **Direct SQL access** - For ML pipelines and complex queries

---

## 📚 Documentation

- **Full Guide:** `SUPABASE_MIGRATION_GUIDE.md` (detailed, 6-10 hour plan)
- **Quick Reference:** `SUPABASE_QUICK_START.md` (code examples)
- **Schema:** `database/migrations/supabase_schema.sql`
- **Migration Script:** `tools/migrate_local_to_supabase.py`

---

🎉 **You're ready to migrate to Supabase using your local data!**
