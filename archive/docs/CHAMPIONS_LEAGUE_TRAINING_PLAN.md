# Champions League V13 Training Plan
**Date**: January 28, 2026
**Status**: ⚙️ IN PROGRESS - Step 2/5

## ✅ Step 1: Sync Champions League to Local DB - COMPLETE

### Sync Results
- **✅ 314 games** synced (18 skipped without results)
- **✅ 3,609 lineups** synced 
- **✅ Average 11 lineups/game** (expected: 11 starting XI)
- **✅ Script created**: tools/sync-champions-league-to-local.mjs

### v13_train.db Status
- **15 total leagues** (12 existing + champions_league + 2 europa leagues)
- **8,007 total games** (7,693 + 314)
- **~276k total lineups** (273k + 3,609)

---

## ✅ Data Validation Complete

### Champions League 2024-2025
- **188 games** total (144 group + 44 knockout)
- **100% ML ready** (all games have odds, xG, stats)
- **98% lineups** (185/188 games with lineups)
- **Structure**: Matchdays 1-8 (group), 9-14 (knockout)

### Champions League 2025-2026  
- **144 games** total (group stage only, season in progress)
- **87.5% ML ready** (126/144 games)
- **97% lineups** (140/144 games with lineups)
- **Structure**: Matchdays 1-8 (Matchday 8 incomplete - 0% xG)

### Total Champions League Data
- **332 games** combined
- **325 games** with lineups (98%)
- **~14,000+ lineups** (40-45 players per game)

---

## 📊 Current V13 Model Status

### Data Source: LOCAL SQLITE (v13_train.db)
```python
# Location: ml/training/train_v13_ou.py line 120
self.conn = sqlite3.connect('/home/zafnitlab/Desktop/protero/v13_train.db')
```

**Current leagues trained**:
- bundesliga, bundesliga_2
- championship
- greek_super_league
- la_liga, la_liga_2
- liga_portugal
- ligue1, ligue_2  
- premier_league
- serie_a, serie_b

**Missing**: ❌ champions_league, ❌ europa_league

---

## 🔄 Migration Decision: Local DB vs Supabase

### Option 1: Keep Local SQLite ✅ RECOMMENDED
**Pros**:
- ✅ **Fast**: No network latency
- ✅ **Offline**: Works without internet
- ✅ **Simple**: Training script already optimized for SQLite
- ✅ **Complete**: v13_train.db has 273k lineups, 7,693 games

**Cons**:
- ❌ Need to keep v13_train.db updated
- ❌ Separate data sync process

### Option 2: Migrate to Supabase
**Pros**:
- ✅ Single source of truth
- ✅ Real-time data updates
- ✅ No duplicate data storage

**Cons**:
- ❌ **Network latency** (slower feature engineering - 1000s of queries)
- ❌ **Rate limits** (Supabase default 1000 row limit per query)
- ❌ **Requires refactoring** train_v13_ou.py (complex queries)
- ❌ **Dependencies**: Need Supabase connection during training

**Recommendation**: **KEEP LOCAL SQLITE** for training, sync Champions League data from Supabase to v13_train.db

---

## 🎯 Action Plan

### Step 1: Sync Champions League to Local DB
Create migration script to copy CL data from Supabase → v13_train.db:

```javascript
// tools/sync-champions-league-to-local.mjs
// Copy games + lineups for champions_league from Supabase to v13_train.db
```

This ensures v13_train.db contains:
- All existing leagues (7,693 games)
- **+ Champions League 2024-2025** (188 games, ~8,400 lineups)
- **+ Champions League 2025-2026** (126 ML-ready games, ~5,600 lineups)

**New total**: ~7,880 games, ~287,000 lineups

### Step 2: Update train_v13_ou.py
Add champions_league to supported leagues:

```python
# Current (line ~470):
for league in ['bundesliga', 'bundesliga_2', 'championship', 
               'greek_super_league', 'la_liga', 'la_liga_2', 
               'liga_portugal', 'ligue1', 'ligue_2', 
               'premier_league', 'serie_a', 'serie_b']:

# Updated:
for league in ['bundesliga', 'bundesliga_2', 'championship', 
               'champions_league',  # ← ADD THIS
               'greek_super_league', 'la_liga', 'la_liga_2', 
               'liga_portugal', 'ligue1', 'ligue_2', 
               'premier_league', 'serie_a', 'serie_b']:
```

**Note**: Skip europa_league (0% data)

### Step 3: Retrain V13 Model
```bash
cd /home/zafnitlab/Desktop/Projects/protero
python ml/training/train_v13_ou.py
```

Expected output:
- 13 league models (12 existing + 1 new champions_league)
- Per-league feature selection (28 best features from 52 total)
- 3-model ensemble per league (XGBoost + LightGBM + CatBoost)
- Models saved to `ml/models/v13_champions-league_*.pkl`

### Step 4: Backtest Champions League
Run chronological backtest on both seasons:

```bash
python ml/betting/backtest_v13_chronological.py
```

Expected metrics:
- Accuracy by season (2024-2025, 2025-2026)
- ROI analysis
- Confidence distribution
- Bet coverage %

### Step 5: Today's Predictions
Check if today is Matchday 8 final games:

```bash
# Get today's Champions League games
node -e "
import('dotenv/config').then(async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const today = new Date().toISOString().split('T')[0];
  
  const { data } = await supabase
    .from('games')
    .select('id, date, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name), odds_home, odds_draw, odds_away')
    .eq('league_key', 'champions_league')
    .eq('season', '2025-2026')
    .gte('date', today)
    .lte('date', today + 'T23:59:59')
    .order('date');
  
  console.log('Today\\'s Champions League games:', data.length);
  data.forEach(g => {
    console.log('  -', g.home_team.name, 'vs', g.away_team.name, '| Odds:', g.odds_home, g.odds_draw, g.odds_away);
  });
});
"
```

Then generate predictions:
```bash
python ml/betting/predict_today_v13_supabase.py
```

---

## 🎲 Betting Strategy (Post-Predictions)

After generating predictions, we'll analyze:

1. **Expected Value (EV)**: Model probability vs bookmaker odds
2. **Kelly Criterion**: Optimal stake sizing
3. **Confidence Thresholds**: Only bet on high-confidence predictions
4. **Correlation**: Avoid correlated bets in same matchday
5. **Bankroll Management**: Max 5% per bet, max 20% total exposure

We'll discuss specific strategies after seeing:
- Today's game predictions
- Backtest results for Champions League
- Confidence distribution

---

## 📝 Summary

✅ **Champions League data ready**: 332 games, 325 with lineups
✅ **Validation complete**: 98% lineup coverage
✅ **Plan**: Keep local SQLite, sync CL data
✅ **Next**: Create sync script → Retrain → Backtest → Predict

**Key Decision**: Use local v13_train.db (faster, proven), sync CL from Supabase
