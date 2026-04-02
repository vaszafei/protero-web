# 🏠 LOCAL DEPLOYMENT OPTIMIZATION GUIDE

## Overview
Since Protero runs **locally only**, we've optimized for:
- ✅ Simple manual updates
- ✅ No build/deployment pipeline needed
- ✅ Zero hosting costs
- ✅ Full offline capability (after data fetch)
- ✅ Direct JSON file editing when needed

---

## 🚀 Daily Workflow

### Starting Development
```bash
cd /home/zafnitlab/Desktop/protero
npm run dev
```

**Opens:** http://localhost:3000  
**No data update needed** - Use existing JSON files

---

## 📅 Weekly Data Refresh (5 minutes)

### Option 1: Automated (Recommended)
```bash
./tools/update_all.sh
```

**This does:**
1. ✅ Fetches latest matches (API-Football)
2. ✅ Updates betting odds
3. ✅ Normalizes team names
4. ✅ Validates data
5. ✅ Shows summary

**If API fails:** Automatically falls back to FBref scraper

---

### Option 2: Manual Control
```bash
# Step 1: Update matches
python3 tools/fetch_2025_season.py

# Step 2: Update odds (optional - for predictions)
python3 tools/fetch_live_odds.py

# Step 3: Clean up
python3 tools/normalize_data.py
python3 tools/validate_leagues.py
```

---

## 🎯 Optimizations Applied

### ✅ Cleanup Completed
- **Removed:** 532KB of backup files
- **Removed:** 5 redundant data fetching tools
- **Archived:** 6 one-time migration scripts
- **Removed:** 2 legacy files (old format)

### ✅ Before vs After

**BEFORE:**
```
tools/
├── 21 Python scripts (3,187 lines)
├── Multiple overlapping data sources
├── Manual markdown-based workflows
└── Confusing tool purposes
```

**AFTER:**
```
tools/
├── 10 active tools (clear purposes)
├── 1 unified update script
├── 6 archived tools (for reference)
└── README.md (documentation)
```

---

## 💾 Data Management

### Current Setup (Optimized for Local)

```
public/data/leagues/
├── premier_league.json     124KB
├── la_liga.json           124KB
├── serie_a.json           120KB
├── bundesliga.json        104KB
├── ligue1.json            100KB
├── greece.json             40KB
└── conference_league.json  32KB
────────────────────────────────
TOTAL: 644KB (7 leagues)
```

**Benefits:**
- ✅ Fast loading (< 1 second)
- ✅ No database overhead
- ✅ Easy to inspect/debug
- ✅ Git-friendly (track changes)
- ✅ Works offline

**Limitations:**
- ⚠️ Manual updates required
- ⚠️ Data can get stale (run weekly)
- ⚠️ File size grows with more leagues

---

## 🔧 Local Optimizations

### 1. SSR Disabled
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,  // ✅ Client-side only (faster local dev)
})
```

**Why:** No server needed, pure static site

---

### 2. Static JSON Files
- No database queries
- Instant page loads
- Full offline capability
- Version control friendly

---

### 3. Development Mode
```bash
# Fast hot-reload
npm run dev

# No need for production builds
# (only if you want to test)
npm run generate
```

---

### 4. Browser Cache
Your browser caches JSON files automatically:
- First load: ~644KB download
- Subsequent loads: Instant (cached)
- **Clear cache:** Ctrl+Shift+R (when data updates)

---

## 📊 Performance Metrics

### Current Performance (Local)
```
Initial Load:     ~500ms
JSON Fetch:       ~50ms  (cached: ~5ms)
Predictions:      ~100ms (Dixon-Coles calculation)
Page Navigation:  Instant (SPA)
```

**No optimization needed** - Already fast for local use!

---

## 🛠️ Maintenance Schedule

### Weekly (5 minutes)
```bash
./tools/update_all.sh
```

### Monthly (10 minutes)
```bash
# Check for new teams/leagues
python3 tools/generate_logo_map.py

# Verify data quality
python3 tools/validate_leagues.py

# Check API quota
python3 tools/test_api.py
```

### As Needed
```bash
# New league added
python3 tools/migrate_league_format.py

# Team logos broken
python3 tools/import_logo_map.py export
# Edit logo_map_edit.csv manually
python3 tools/import_logo_map.py import
```

---

## 💡 When to Update Data

### ✅ Update BEFORE:
- **Match day** (to get latest odds)
- **Prediction analysis** (fresh data = better predictions)
- **Weekly reviews** (see new results)

### ❌ Don't update during:
- Active development (avoid conflicts)
- UI/UX changes (data not needed)
- Debugging (use stable data)

---

## 🔄 Git Workflow

### Recommended
```bash
# 1. Update data
./tools/update_all.sh

# 2. Review changes
git diff public/data/

# 3. Commit with date
git add public/data/
git commit -m "Data update: $(date +%Y-%m-%d)"

# 4. Continue development
git checkout -b feature/new-feature
```

**Why commit data updates separately:**
- Clear history
- Easy to revert if bad data
- Track data changes over time

---

## 📈 Future Scaling (If Needed)

### If you add more leagues (10+):
```bash
# Consider compression
gzip public/data/leagues/*.json

# Nuxt will serve .json.gz automatically
# Reduces: 644KB → ~150KB
```

### If file size becomes an issue (5MB+):
- Split by season (2024.json, 2025.json)
- Load on-demand (not all leagues at once)
- Consider SQLite for local database

### If you want automation:
- Use cron job (Linux/Mac):
```bash
# Edit crontab
crontab -e

# Add: Update every Sunday at 2am
0 2 * * 0 cd /home/zafnitlab/Desktop/protero && ./tools/update_all.sh >> /tmp/protero-update.log 2>&1
```

---

## ⚡ Quick Tips

1. **Run dev server in background:**
```bash
npm run dev &
# Continue using terminal
# Stop: fg, then Ctrl+C
```

2. **Check data freshness:**
```bash
ls -lh public/data/leagues/*.json | awk '{print $6, $7, $8, $9}'
# Shows last modified dates
```

3. **Quick data summary:**
```bash
for f in public/data/leagues/*.json; do
  echo "$(basename $f): $(jq '.games | length' $f) games"
done
```

4. **Verify predictions working:**
```bash
# Open browser console (F12)
# Look for: "Predictions calculated: X matches"
```

---

## 🎯 Summary

### What You Have Now
✅ **Streamlined tools** - 10 active, 6 archived  
✅ **Unified update script** - One command for everything  
✅ **Clean data structure** - All leagues standardized  
✅ **Documentation** - README for all tools  
✅ **Fast local performance** - < 1 second loads  
✅ **Zero hosting costs** - Pure local deployment  
✅ **Offline capable** - Works without internet (after data fetch)  

### Weekly Routine
```bash
# Sunday evening (5 min)
./tools/update_all.sh
git add public/data
git commit -m "Data update: $(date +%Y-%m-%d)"

# Then use Protero all week with fresh data
npm run dev
```

### That's It!
No servers, no deployments, no complexity. Just:
1. Update data weekly
2. Run dev server
3. Analyze matches
4. Make predictions

**Perfect for local use! 🎉**
