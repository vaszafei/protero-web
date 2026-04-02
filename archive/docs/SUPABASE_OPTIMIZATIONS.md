# 🗄️ Supabase Database Optimizations

**Date**: January 27, 2026  
**Status**: ✅ Production Ready

---

## 📋 What's New

### 1. **Advanced SQL Functions** (`database/migrations/supabase_optimizations.sql`)

Comprehensive database functions for:
- ✅ Duplicate detection & cleanup
- ✅ Missing games detection
- ✅ Data quality monitoring
- ✅ Automated maintenance
- ✅ PostgreSQL extensions

### 2. **Maintenance CLI Tool** (`tools/db-maintenance.mjs`)

Easy-to-use command-line utility for database operations.

---

## 🚀 Quick Start

### Step 1: Apply SQL Functions to Supabase

```bash
# Copy the SQL file content
cat database/migrations/supabase_optimizations.sql

# Go to Supabase Dashboard → SQL Editor
# Paste and run the entire SQL file
```

### Step 2: Use the Maintenance Tool

```bash
# Check for all issues
node tools/db-maintenance.mjs all

# Check data quality for specific league
node tools/db-maintenance.mjs quality premier_league

# Find duplicate games
node tools/db-maintenance.mjs duplicates

# Remove duplicates (keeps most complete data)
node tools/db-maintenance.mjs remove-duplicates
```

---

## 📚 Available Functions

### 🔍 Duplicate Detection

**Find duplicates:**
```sql
SELECT * FROM find_duplicate_games();
```

**Remove duplicates** (keeps game with most data):
```sql
SELECT * FROM remove_duplicate_games();
```

Or use CLI:
```bash
node tools/db-maintenance.mjs duplicates
node tools/db-maintenance.mjs remove-duplicates
```

---

### 🎯 Data Quality Checks

**League completeness report:**
```sql
SELECT * FROM league_data_completeness('premier_league', '2025-2026');
```

**Output example:**
```
metric              | total_games | count_with_data | percentage
--------------------|-------------|-----------------|------------
Total Games         | 380         | 380             | 100.00
Has Flashscore URL  | 380         | 365             | 96.05
Is Scraped          | 380         | 342             | 90.00
Has Results         | 380         | 230             | 60.53
Has xG Data         | 380         | 220             | 57.89
Has Odds            | 380         | 218             | 57.37
Has Lineups         | 380         | 215             | 56.58
Has Referee         | 380         | 210             | 55.26
```

CLI:
```bash
node tools/db-maintenance.mjs quality premier_league
```

---

### 🔗 Missing Flashscore URLs

**Find games without URLs:**
```sql
SELECT * FROM games_missing_flashscore_urls('premier_league', 50);
```

CLI:
```bash
node tools/db-maintenance.mjs missing-urls premier_league
```

**Use case:** Get list of games that need manual URL entry via frontend.

---

### 🕷️ Incomplete Scraping

**Find games with partial data:**
```sql
SELECT * FROM games_incomplete_scraping('premier_league');
```

Shows which games have:
- ✅ URL added
- ❌ Not yet scraped
- ❌ Missing lineups
- ❌ Missing odds
- ❌ Missing stats

CLI:
```bash
node tools/db-maintenance.mjs incomplete premier_league
```

**Use case:** Identify games to re-scrape or scrape for first time.

---

### 📊 Missing Games Detection

**Find missing rounds:**
```sql
SELECT * FROM find_missing_games('premier_league', '2025-2026');
```

**Output example:**
```
expected_round | games_in_round | expected_games | missing_count
---------------|----------------|----------------|---------------
15             | 9              | 10             | 1
23             | 8              | 10             | 2
```

**Use case:** Detect which rounds have incomplete game data from API-Football.

---

### ⚙️ Automated Maintenance

**Update game statuses:**
```sql
SELECT update_game_status();
-- Returns: number of games updated
```

- Marks past games without results as `postponed`
- Marks games with results as `completed`

**Estimate missing xG:**
```sql
SELECT estimate_missing_xg();
-- Returns: number of games updated
```

Formula: `xG ≈ shots_on_target × 0.15 + big_chances × 0.4`

CLI:
```bash
node tools/db-maintenance.mjs update-status
node tools/db-maintenance.mjs estimate-xg
```

---

## 📊 Useful Views

### `v_data_quality_summary`

Overall data quality across all leagues:

```sql
SELECT * FROM v_data_quality_summary;
```

| league_key | season | total_games | has_url | scraped | has_xg | scraping_pct | xg_pct |
|------------|--------|-------------|---------|---------|--------|--------------|--------|
| premier_league | 2025-2026 | 380 | 365 | 342 | 220 | 90.00 | 57.89 |

---

### `v_ml_ready_games`

Games ready for ML training (complete data):

```sql
SELECT * FROM v_ml_ready_games LIMIT 100;
```

Filters for games with:
- ✅ Results (home/away goals)
- ✅ xG data
- ✅ Odds
- ✅ Lineups

---

## 🛠️ CLI Tool Commands

### Full Command Reference

```bash
# Check for duplicates
node tools/db-maintenance.mjs duplicates

# Remove duplicates (DESTRUCTIVE - be careful!)
node tools/db-maintenance.mjs remove-duplicates

# Data quality for all leagues
node tools/db-maintenance.mjs quality

# Data quality for one league
node tools/db-maintenance.mjs quality premier_league

# Find missing URLs (default: Premier League)
node tools/db-maintenance.mjs missing-urls

# Find missing URLs for specific league
node tools/db-maintenance.mjs missing-urls championship

# Check incomplete scraping (all leagues)
node tools/db-maintenance.mjs incomplete

# Check incomplete scraping (one league)
node tools/db-maintenance.mjs incomplete bundesliga

# Update game statuses
node tools/db-maintenance.mjs update-status

# Estimate missing xG
node tools/db-maintenance.mjs estimate-xg

# Run all checks (no modifications)
node tools/db-maintenance.mjs all

# Show help
node tools/db-maintenance.mjs help
```

---

## 🎨 CLI Output Example

```
📊 Data Quality Report
================================================================================

📁 PREMIER_LEAGUE (380 games)
--------------------------------------------------------------------------------
✅ Total Games         ████████████████████    380/380    100.0%
✅ Has Flashscore URL  ███████████████████      365/380     96.1%
✅ Is Scraped          ██████████████████       342/380     90.0%
⚠️  Has Results         ████████████             230/380     60.5%
⚠️  Has xG Data         ███████████              220/380     57.9%
⚠️  Has Odds            ███████████              218/380     57.4%
⚠️  Has Lineups         ███████████              215/380     56.6%
⚠️  Has Referee         ███████████              210/380     55.3%
```

---

## 🔐 Database Constraints

### Unique Constraint

Prevents duplicate games:

```sql
CREATE UNIQUE INDEX idx_games_unique_match 
ON games (home_team_id, away_team_id, DATE(date), league_key, season);
```

If you try to insert a duplicate, PostgreSQL will reject it automatically.

---

## 🧩 PostgreSQL Extensions

The optimization file enables these extensions:

1. **`pg_trgm`** - Fuzzy text search (for team names, player names)
2. **`btree_gin`** - Better JSONB indexing (for match_events, odds)
3. **`pg_stat_statements`** - Query performance monitoring

---

## 📈 Workflow Integration

### Daily Workflow

1. **Morning**: Check data quality
```bash
node tools/db-maintenance.mjs quality
```

2. **After API fetch**: Check for missing games
```sql
SELECT * FROM find_missing_games('premier_league', '2025-2026');
```

3. **Before scraping**: Find games missing URLs
```bash
node tools/db-maintenance.mjs missing-urls premier_league
```

4. **After scraping**: Verify completeness
```bash
node tools/db-maintenance.mjs incomplete premier_league
```

5. **Before ML training**: Check ML-ready games
```sql
SELECT COUNT(*) FROM v_ml_ready_games WHERE league_key = 'premier_league';
```

---

## ⚠️ Important Notes

### Duplicate Removal

`remove_duplicate_games()` is **DESTRUCTIVE**. It will:
- Score games based on data completeness
- Keep the game with MORE data
- Delete the duplicate

**Always run `find_duplicate_games()` first** to review what will be deleted.

### Unique Constraint Impact

The unique constraint prevents:
- ❌ Inserting duplicate games
- ❌ API re-fetching creating duplicates

But allows:
- ✅ Updating existing games
- ✅ Adding scraped data to games

---

## 🎯 Real-World Example

### Problem: Premier League has 1 duplicate and 15 games missing URLs

```bash
# Step 1: Check the situation
node tools/db-maintenance.mjs quality premier_league

# Output:
# Premier League: 381 games (should be 380)
# Has URL: 365/381 (95.8%)

# Step 2: Find the duplicate
node tools/db-maintenance.mjs duplicates

# Output:
# Found 1 duplicate
# Game IDs: 2000 & 2005
# Team vs Team, Same date

# Step 3: Review which has more data (check in Supabase dashboard)
# Game 2000: has lineups, stats, odds
# Game 2005: only basic data

# Step 4: Remove duplicate
node tools/db-maintenance.mjs remove-duplicates

# Output:
# Deleted: 2005, Kept: 2000

# Step 5: Find games missing URLs
node tools/db-maintenance.mjs missing-urls premier_league

# Output:
# 15 games missing URLs
# (List of games with IDs)

# Step 6: Go to frontend, add URLs manually

# Step 7: Verify
node tools/db-maintenance.mjs quality premier_league

# Output:
# Premier League: 380 games ✅
# Has URL: 380/380 (100.0%) ✅
```

---

## 📖 Next Steps

1. **Apply SQL file** to Supabase (run in SQL Editor)
2. **Test CLI tool** with `node tools/db-maintenance.mjs all`
3. **Review current issues** and fix them
4. **Integrate into daily workflow**
5. **Add to documentation** or README

---

## 🤝 Contributing

To add new functions:

1. Add SQL function to `supabase_optimizations.sql`
2. Add corresponding CLI command to `db-maintenance.mjs`
3. Update this README with examples
4. Test thoroughly before deploying

---

## 📝 Changelog

**v1.0 - January 27, 2026**
- Initial release
- 8 SQL functions
- 7 CLI commands
- 3 views
- 3 PostgreSQL extensions
- Unique constraint for duplicates
