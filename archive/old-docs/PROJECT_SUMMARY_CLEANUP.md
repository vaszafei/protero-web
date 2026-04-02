# Protero - Advanced Football Analytics & Prediction Platform

**Last Updated:** January 8, 2026  
**Status:** Production-Ready with Active Development  
**Tech Stack:** Nuxt 3 + Vue 3 + Turso (LibSQL) + Python Analytics

---

## 🎯 What This Application Does

Protero is a comprehensive football analytics platform that combines **live match data**, **advanced statistics**, **machine learning predictions**, and **odds analysis** to provide deep insights into European football leagues. The platform serves both casual fans and serious analysts with a rich, data-driven experience.

### Core Value Propositions

1. **Real-Time League Intelligence**
   - Live standings calculated from match results (not API-dependent)
   - Round-by-round fixture tracking with scores and status
   - Comprehensive team statistics with 30+ data points per match
   - Advanced metrics: possession, shots, corners, cards, xG, fouls

2. **Predictive Analytics Engine**
   - Machine learning model predicting match outcomes (Win/Draw/Away)
   - Over/Under 2.5 goals predictions
   - Both Teams To Score (BTTS) probability
   - Odds comparison: model predictions vs bookmaker odds
   - Parlay generator for multi-match combinations
   - Confidence scores and calibration analysis

3. **Interactive Data Visualization**
   - Dynamic charts showing goals distribution, win rates, BTTS patterns
   - Team performance metrics (corners, cards, possession, shots)
   - Home vs Away performance comparisons
   - Trend analysis across rounds and seasons

4. **Multi-Source Data Integration**
   - Fetches scheduled games from multiple sources
   - Live odds integration
   - Flashscore scraping for match data and statistics
   - OCR extraction from match statistics images
   - Automated data pipeline with validation

5. **User Management**
   - Secure authentication with bcrypt hashing
   - League preferences for personalized experience
   - Admin panel for data management
   - Role-based access control

### Supported Leagues

- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Premier League** (England)
- 🇪🇸 **La Liga** (Spain)
- 🇮🇹 **Serie A** (Italy)
- 🇩🇪 **Bundesliga** (Germany)
- 🇫🇷 **Ligue 1** (France)

---

## 🏗️ Architecture & Tech Stack

### Frontend Stack
- **Nuxt 3** (v3.17.7) - Vue 3 meta-framework with SSR support
- **Vue 3** (v3.5.25) - Composition API throughout
- **Tailwind CSS** - Utility-first styling with custom slate palette
- **Nuxt UI** (@nuxt/ui) - Component library
- **Lucide Vue** - Icon system (modern, tree-shakeable)
- **Vite** (v6.4.1) - Build tool and dev server

### Backend Stack
- **Nitro** (v2.12.9) - Server engine (part of Nuxt)
- **Turso (LibSQL)** - Distributed SQLite database
- **Node.js** - Server runtime
- **Python 3.x** - Analytics and prediction scripts

### Data Pipeline
- **Multi-source API aggregation** - Scheduled games, live odds
- **Flashscore scraping** - Match data and statistics
- **Tesseract OCR** - Image-based stats extraction
- **Automated validation** - Data integrity checks

### Database Schema (Turso/LibSQL)

#### **users** table
```sql
- id (INTEGER PRIMARY KEY)
- email (TEXT UNIQUE)
- password_hash (TEXT) -- bcrypt
- name (TEXT)
- role (TEXT) -- 'user' or 'admin'
- created_at (TEXT)
```

#### **leagues** table
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT)
- key (TEXT UNIQUE) -- 'premier_league', 'la_liga', etc.
- country (TEXT)
- flag (TEXT) -- emoji
- games_count (INTEGER)
```

#### **teams** table
```sql
- id (INTEGER PRIMARY KEY)
- league_key (TEXT)
- name (TEXT)
- logo_url (TEXT)
- api_id (TEXT) -- external API reference
```

#### **games** table (30+ columns)
```sql
-- Basic Match Info
- id, league_key, round, date, status
- home_id, away_id, home_name, away_name
- home_goals, away_goals

-- Advanced Statistics (Enriched Data)
- possession_home, possession_away
- shots_home, shots_away
- shots_on_target_home, shots_on_target_away
- corners_home, corners_away
- yellow_cards_home, yellow_cards_away
- red_cards_home, red_cards_away
- fouls_home, fouls_away
- passes_home, passes_away
- xg_home, xg_away (expected goals)
- days_rest_home, days_rest_away

-- Predictions & Odds
- win_odds, draw_odds, away_odds
- over_25_odds, under_25_odds
- btts_yes_odds, btts_no_odds

-- Meta
- flashscore_url, image_path
- created_at, updated_at
```

---

## 📱 Application Features (Detailed)

### 🎯 Core Features

#### 1. **User Authentication System**
- ✅ Login/Registration with bcrypt password hashing
- ✅ Session management with HTTP-only cookies
- ✅ Protected routes via middleware
- ✅ Account management page
- **Files:**
  - `pages/login.vue` - Login/register interface
  - `pages/account.vue` - User profile & password change
  - `middleware/auth.ts` - Route protection
  - `server/api/auth/*` - Auth endpoints
  - `tools/setup_user_auth.sql` - Database schema

#### 2. **League Management System**
- ✅ Multi-league support (Premier League, La Liga, Serie A, Bundesliga, Ligue 1)
- ✅ User preferences for league selection
- ✅ Dynamic league data loading
- **Files:**
  - `pages/leagues.vue` - League selection dashboard
  - `pages/preferences.vue` - User league preferences
  - `components/LeagueCard.vue` - League display cards
  - `server/api/user/preferences.*.ts` - Preference management

#### 3. **League Detail Views** (Fully Optimized & Tabbed)

##### **Tab 1: Rounds & Fixtures**
- ✅ Round-by-round match display
- ✅ Match scores and status
- ✅ Previous/Next round navigation
- **Component:** `components/league/RoundsView.vue`

##### **Tab 2: Standings**
- ✅ Live standings calculation from game results
- ✅ Home/Away/Overall filters
- ✅ Over/Under 2.5 filter
- ✅ Full statistics (W/D/L, GF/GA, GD, Points)
- **Component:** `components/league/StandingsView.vue`

##### **Tab 3: Statistics**
- ✅ Overall Statistics (8 compact cards)
- ✅ Round Statistics table (goals, clean sheets, BTTS, O/U 2.5)
- ✅ Team Performance Patterns table
- ✅ **REMOVED:** Position tracker (cleaned up)
- **Component:** `components/league/StatisticsView.vue`

##### **Tab 4: Charts** (Recently Refactored with Tabs)
**Overview Cards:**
- ✅ League Overview section (6 metrics in single row)
- ✅ Top Teams section (5 performers in single row)
- ✅ Compact design with proper data correlation

**Sub-Tabs:**
- ✅ **Goals Analysis Tab:**
  - Goals Distribution (vertical bar chart, optimized)
  - Home vs Away Comparison (horizontal bars)
  - Over/Under 2.5 Trends (vertical stacked bars, all rounds)
  
- ✅ **Match Trends Tab:**
  - Win Rate Evolution (SVG line chart)
  - BTTS Heatmap (color-coded grid)

- ✅ **Team Performance Tab:**
  - Average Corners by Team (top 10, horizontal bars)
  - Average Cards by Team (top 10, horizontal bars)
  - Average Possession by Team (top 10, horizontal bars)
  - Average Shots by Team (top 10, horizontal bars)

**Component Structure:**
- `components/league/ChartsView.vue` - Main tabs orchestrator
- `components/league/charts/GoalsDistribution.vue`
- `components/league/charts/HomeAwayComparison.vue`
- `components/league/charts/OverUnderTrends.vue`
- `components/league/charts/WinRateEvolution.vue`
- `components/league/charts/BttsHeatmap.vue`
- `components/league/charts/TeamMetrics.vue`

##### **Tab 5: Predictions**
- ✅ Next round match predictions
- ✅ Win/Draw/Away probabilities
- ✅ Over/Under 2.5 predictions
- ✅ BTTS predictions
- ✅ Confidence scores
- ✅ Odds comparison
- ✅ Parlay generator
- **Components:**
  - `components/league/PredictionsView.vue`
  - `components/league/ParlayGenerator.vue`

#### 4. **Admin Panel**
- ✅ Match data management
- ✅ Schedule fetching from external sources
- ✅ Advanced stats editor (possession, shots, corners, cards, xG)
- ✅ Round image OCR upload
- ✅ Odds management
- **Files:**
  - `pages/admin.vue`
  - `components/admin/*` (7 components)
  - `server/api/admin/*` (5+ endpoints)

#### 5. **Database Schema** (Turso/LibSQL)

**Tables:**
- ✅ `users` - Authentication and preferences
- ✅ `leagues` - League metadata
- ✅ `teams` - Team information with logos
- ✅ `games` - Comprehensive match data with 30+ columns:
  - Basic: home/away teams, goals, round, date
  - Advanced stats: possession, shots, shots_on_target, corners
  - Discipline: yellow_cards, red_cards, fouls
  - Analytics: xG, passes, days_rest
  - Predictions: win/draw/away odds, over/under, BTTS
  - Meta: flashscore_url, image_path

**Files:**
- `tools/setup_turso_schema.js`
- `tools/migrate_add_advanced_stats.sql`
- `tools/setup_user_auth.sql`

#### 6. **Prediction System**
- ✅ Advanced statistical model using:
  - Recent form (last 5 games)
  - Home/away performance
  - Head-to-head history
  - Goals scored/conceded trends
  - Over/Under patterns
  - BTTS frequency
- ✅ Alpha optimization for model weights
- ✅ Calibration analysis
- ✅ Odds comparison (user odds vs predicted)
- **Files:**
  - `tools/advanced_prediction_model.py`
  - `tools/improved_prediction_model.py`
  - `tools/optimize_alpha.py`
  - `tools/calibration_analysis.py`

#### 7. **Data Pipeline**
- ✅ Multi-source data fetching
- ✅ Scheduled game updates
- ✅ Live odds integration
- ✅ Flashscore data extraction
- ✅ OCR for extracting stats from Flashscore images
- **Files:**
  - `tools/fetch_multi_source.py`
  - `tools/fetch_scheduled_games.py`
  - `tools/fetch_live_odds.py`
  - `tools/extract_match_stats_ocr.py`

---

## 🧹 Recent Cleanup (Completed January 8, 2026)

**Total Files Cleaned:** 54 files organized and archived

### ✅ Phase 1: Backup Files
- Removed 6 backup/test files (ChartsView.vue.backup/.old, test scripts)

### ✅ Phase 2: Documentation
- Archived 27 markdown strategy docs to `archive/docs/`
- Kept only: README.md, CORRELATION_ANALYSIS_STRATEGY.md, PROJECT_SUMMARY_CLEANUP.md

### ✅ Phase 3: Migration Scripts
- Moved 15 one-time migration scripts to `tools/archive/migrations/`
- Kept 22 active tools (prediction models, data fetchers, validators)

### ✅ Phase 4: Component Cleanup
- Archived 6 unused root components to `components/archive/`
- Kept only actively used components (Sidebar, LoginForm)

**Current Clean State:**
- 📄 3 markdown files in root
- 🔧 22 active tool scripts
- 📦 Organized component structure
- 🗂️ All legacy code archived, not deleted

---

## 🚀 Next Major Feature: Statistical Correlation Analysis

### Overview & Motivation

The platform currently has rich data (possession, shots, corners, cards, xG, fouls) but doesn't exploit **correlations between these metrics**. The goal is to implement statistical correlation analysis to:

1. **Discover Hidden Patterns**
   - Which stats most strongly predict goals?
   - Do corners correlate with possession?
   - Does xG accurately predict actual goals?
   - How does possession relate to win probability?

2. **Improve Prediction Model**
   - Weight features by correlation strength
   - Identify multicollinearity (redundant predictors)
   - Feature selection for better model performance
   - Create composite metrics from correlated features

3. **Provide Insights to Users**
   - Interactive correlation heatmaps
   - Scatter plots showing relationships
   - Statistical significance indicators
   - Actionable insights for bettors

### Academic Foundation

**Correlation Methods:**
1. **Pearson Correlation** (r)
   - Measures linear relationships between continuous variables
   - Range: -1 (perfect negative) to +1 (perfect positive)
   - Example: Shots on Target → Goals (r ≈ 0.65-0.75)

2. **Spearman Correlation** (ρ)
   - Non-parametric, rank-based correlation
   - Handles non-linear monotonic relationships
   - Better for ordinal data or non-normal distributions

3. **Chi-Square Test** (χ²)
   - Tests independence of categorical variables
   - Example: Home/Away status vs Win/Loss outcome
   - Provides p-values for statistical significance

**Research-Backed Correlations:**
- Shots on Target → Goals: r = 0.65-0.75 (strong)
- xG → Actual Goals: r = 0.70-0.80 (strong)
- Possession → Wins: r = 0.45-0.55 (moderate)
- Corners → Goals: r = 0.30-0.40 (weak-moderate)
- Cards → Goals: r = -0.15 to -0.25 (weak negative)

### Technical Implementation Plan

#### **Challenge: Turso/LibSQL Limitations**

Turso (SQLite-based) **lacks native correlation functions**:
- ❌ No `CORR()` function
- ❌ No `STDDEV()` or `VARIANCE()` functions
- ✅ Has window functions (RANK, ROW_NUMBER)
- ✅ Has CTEs (Common Table Expressions)
- ✅ Has aggregates (AVG, SUM, COUNT)

**Solution: Application-Layer Computation**

#### **Phase 1: SQL Data Extraction (Turso)**

Extract raw data for analysis:

```sql
-- Get all enriched match data for correlation analysis
SELECT 
  home_goals + away_goals as total_goals,
  shots_home + shots_away as total_shots,
  shots_on_target_home + shots_on_target_away as total_shots_on_target,
  corners_home + corners_away as total_corners,
  yellow_cards_home + yellow_cards_away as total_cards,
  fouls_home + fouls_away as total_fouls,
  possession_home,
  xg_home + xg_away as total_xg,
  CASE 
    WHEN home_goals > away_goals THEN 1 
    WHEN home_goals < away_goals THEN -1 
    ELSE 0 
  END as result,
  league_key,
  round
FROM games
WHERE status = 'played'
  AND home_goals IS NOT NULL
  AND shots_home IS NOT NULL  -- ensure enriched data
ORDER BY date DESC
LIMIT 500;  -- last 500 matches
```

#### **Phase 2: Backend Correlation API (Node.js + simple-statistics)**

Create `/api/analytics/correlations` endpoint:

```javascript
// server/api/analytics/correlations.post.ts
import { defineEventHandler, readBody } from 'h3'
import { sampleCorrelation, sampleCovariance } from 'simple-statistics'
import { useDatabase } from '~/server/utils/database'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { leagueKey, metrics } = body // metrics = ['shots', 'goals', 'possession', etc.]
  
  // 1. Fetch data from Turso
  const db = useDatabase()
  const games = await db.execute(`
    SELECT 
      shots_home + shots_away as shots,
      home_goals + away_goals as goals,
      possession_home as possession,
      corners_home + corners_away as corners,
      xg_home + xg_away as xg
    FROM games
    WHERE league_key = ? AND status = 'played'
    AND shots_home IS NOT NULL
  `, [leagueKey])
  
  // 2. Build arrays for each metric
  const data = {
    shots: games.rows.map(r => r.shots),
    goals: games.rows.map(r => r.goals),
    possession: games.rows.map(r => r.possession),
    corners: games.rows.map(r => r.corners),
    xg: games.rows.map(r => r.xg)
  }
  
  // 3. Calculate correlation matrix
  const correlations = {}
  const metricKeys = Object.keys(data)
  
  for (let i = 0; i < metricKeys.length; i++) {
    for (let j = i; j < metricKeys.length; j++) {
      const key1 = metricKeys[i]
      const key2 = metricKeys[j]
      const correlationKey = `${key1}_${key2}`
      
      // Pearson correlation coefficient
      const r = sampleCorrelation(data[key1], data[key2])
      
      correlations[correlationKey] = {
        r: r.toFixed(3),
        strength: getStrength(r),
        n: data[key1].length
      }
    }
  }
  
  return {
    success: true,
    correlations,
    sampleSize: games.rows.length
  }
})

function getStrength(r: number): string {
  const abs = Math.abs(r)
  if (abs > 0.7) return 'strong'
  if (abs > 0.4) return 'moderate'
  if (abs > 0.2) return 'weak'
  return 'very weak'
}
```

#### **Phase 3: Frontend Visualization (Vue Component)**

Create correlation heatmap component:

```vue
<!-- components/analytics/CorrelationHeatmap.vue -->
<template>
  <Card class="p-6">
    <h3 class="text-lg font-semibold mb-4">Statistical Correlations</h3>
    
    <div class="grid grid-cols-6 gap-1">
      <!-- Header row -->
      <div></div>
      <div v-for="metric in metrics" :key="metric" class="text-xs text-center font-medium">
        {{ metric }}
      </div>
      
      <!-- Data rows -->
      <template v-for="(metric1, i) in metrics" :key="metric1">
        <div class="text-xs font-medium py-2">{{ metric1 }}</div>
        <div 
          v-for="(metric2, j) in metrics" 
          :key="`${metric1}-${metric2}`"
          :class="getCellClass(i, j)"
          :style="getCellStyle(getCorrelation(metric1, metric2))"
          class="aspect-square flex items-center justify-center text-xs font-semibold rounded"
        >
          {{ formatCorrelation(getCorrelation(metric1, metric2)) }}
        </div>
      </template>
    </div>
    
    <!-- Legend -->
    <div class="mt-4 flex items-center gap-2 text-xs">
      <div class="w-4 h-4 bg-red-500 rounded"></div>
      <span>Negative</span>
      <div class="w-4 h-4 bg-gray-300 rounded"></div>
      <span>No correlation</span>
      <div class="w-4 h-4 bg-green-500 rounded"></div>
      <span>Positive</span>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  correlations: Record<string, { r: string, strength: string, n: number }>
  metrics: string[]
}>()

const getCorrelation = (metric1: string, metric2: string) => {
  const key = `${metric1}_${metric2}`
  const reverseKey = `${metric2}_${metric1}`
  return props.correlations[key] || props.correlations[reverseKey] || { r: '1.000' }
}

const getCellStyle = (correlation: any) => {
  const r = parseFloat(correlation.r)
  if (r > 0) {
    const intensity = Math.floor(r * 255)
    return { backgroundColor: `rgb(${255-intensity}, 255, ${255-intensity})` } // green gradient
  } else {
    const intensity = Math.floor(Math.abs(r) * 255)
    return { backgroundColor: `rgb(255, ${255-intensity}, ${255-intensity})` } // red gradient
  }
}

const getCellClass = (i: number, j: number) => {
  return i === j ? 'bg-slate-900 text-white' : ''
}

const formatCorrelation = (correlation: any) => {
  return parseFloat(correlation.r).toFixed(2)
}
</script>
```

#### **Phase 4: Python Integration (Advanced Analysis)**

For deeper analysis, use Python scripts:

```python
# tools/correlation_analysis.py
import pandas as pd
import numpy as np
from scipy.stats import pearsonr, spearmanr
import matplotlib.pyplot as plt
import seaborn as sns
import sqlite3

# Connect to Turso
conn = sqlite3.connect('turso.db')

# Load data
query = """
SELECT 
  shots_home + shots_away as shots,
  home_goals + away_goals as goals,
  possession_home as possession,
  corners_home + corners_away as corners,
  xg_home + xg_away as xg,
  yellow_cards_home + yellow_cards_away as cards,
  league_key
FROM games
WHERE status = 'played' AND shots_home IS NOT NULL
"""

df = pd.read_sql_query(query, conn)

# Calculate Pearson correlations
metrics = ['shots', 'goals', 'possession', 'corners', 'xg', 'cards']
correlation_matrix = df[metrics].corr(method='pearson')

print("\n=== Pearson Correlation Matrix ===")
print(correlation_matrix.round(3))

# Statistical significance (p-values)
print("\n=== Statistical Significance (p-values) ===")
for i, metric1 in enumerate(metrics):
    for metric2 in metrics[i+1:]:
        r, p = pearsonr(df[metric1], df[metric2])
        sig = "***" if p < 0.001 else "**" if p < 0.01 else "*" if p < 0.05 else "ns"
        print(f"{metric1} × {metric2}: r={r:.3f}, p={p:.4f} {sig}")

# Generate heatmap
plt.figure(figsize=(10, 8))
sns.heatmap(correlation_matrix, annot=True, fmt='.2f', cmap='RdYlGn', center=0)
plt.title('Football Statistics Correlation Matrix')
plt.tight_layout()
plt.savefig('public/correlation_heatmap.png')
print("\nHeatmap saved to public/correlation_heatmap.png")

# Scatter plots for strong correlations
strong_pairs = [('shots', 'goals'), ('xg', 'goals'), ('possession', 'shots')]
fig, axes = plt.subplots(1, 3, figsize=(15, 5))

for ax, (x, y) in zip(axes, strong_pairs):
    ax.scatter(df[x], df[y], alpha=0.5)
    ax.set_xlabel(x.capitalize())
    ax.set_ylabel(y.capitalize())
    r, _ = pearsonr(df[x], df[y])
    ax.set_title(f'{x} vs {y} (r={r:.3f})')
    
    # Add regression line
    z = np.polyfit(df[x], df[y], 1)
    p = np.poly1d(z)
    ax.plot(df[x].sort_values(), p(df[x].sort_values()), "r--", alpha=0.8)

plt.tight_layout()
plt.savefig('public/correlation_scatter.png')
print("Scatter plots saved to public/correlation_scatter.png")
```

### Implementation Roadmap

#### **Week 1: Backend Foundation**
- [ ] Install `simple-statistics` npm package
- [ ] Create `/api/analytics/correlations` endpoint
- [ ] Write SQL queries for data extraction
- [ ] Implement Pearson correlation calculation
- [ ] Add caching layer (compute once per day)

#### **Week 2: Frontend Visualization**
- [ ] Create `CorrelationHeatmap.vue` component
- [ ] Add to league detail page (new "Analytics" tab)
- [ ] Implement interactive tooltips (show p-value, sample size)
- [ ] Add metric selection dropdown
- [ ] Export correlation matrix as CSV

#### **Week 3: Python Deep Analysis**
- [ ] Create `tools/correlation_analysis.py` script
- [ ] Generate publication-quality heatmaps
- [ ] Compute statistical significance (p-values)
- [ ] Create scatter plots for top correlations
- [ ] Document findings in markdown report

#### **Week 4: Integration & Insights**
- [ ] Update prediction model weights based on correlations
- [ ] Add "Correlation Insights" section to predictions
- [ ] Create user-facing insights ("Shots on Target is the #1 predictor of goals")
- [ ] Performance testing with real data
- [ ] Documentation and testing

### Expected Outcomes

1. **Quantified Relationships**
   - Know exactly which stats matter most
   - Numerical correlation coefficients (r values)
   - Statistical significance testing (p-values)

2. **Improved Predictions**
   - Weight features by correlation strength
   - Remove redundant features (multicollinearity)
   - Better model accuracy and calibration

3. **User Insights**
   - Visual heatmaps showing relationships
   - Scatter plots for exploration
   - Actionable insights in plain English

4. **Research Foundation**
   - Academic-quality analysis
   - Reproducible methodology
   - Basis for future machine learning models

---

## 📂 Project Structure

### 🗑️ Immediate Cleanup Candidates

#### **1. Old Backup Files**
```
components/league/ChartsView.vue.backup  ← Remove
components/league/ChartsView.vue.old     ← Remove
```
**Action:** Delete - we have the current refactored version

#### **2. Root-Level Test Scripts**
```
check_rounds.js              ← Remove (use tools/validate_data.js)
check_rounds_simple.js       ← Remove (duplicate)
check_turso_data.js          ← Remove (use tools/test_turso.js)
test_position_data.js        ← Remove (position tracker removed)
local.db                     ← Remove (if not actively used)
eng.traineddata              ← Move to tools/ or remove
```

#### **3. Unused Root Components**
These appear to be legacy/unused:
```
components/Sidebar.vue       ← Check usage, likely unused
components/Header.vue        ← Check usage, likely unused
components/TeamRow.vue       ← Check usage, might be old
components/TeamModal.vue     ← Check usage, might be old
components/MatchPrediction.vue ← Check if used
components/LeaguePreferences.vue ← Might be duplicate of preferences page
components/LoginForm.vue     ← Likely unused (login is in page)
```

**Action:** Search for imports/usage, remove if not referenced

#### **4. Documentation Files (Archive or Update)**
```
ACADEMIC_MODEL_IMPLEMENTATION.md     ← Archive
ACADEMIC_RESEARCH_IMPROVEMENTS.md    ← Archive
ADVANCED_STATS_RESEARCH.md           ← Archive
KELLY_CRITERION_IMPLEMENTATION.md    ← Archive
OCR_STATS_GUIDE.md                   ← Keep or integrate into README
STATS_SYSTEM_COMPLETE.md             ← Archive
TURSO_AI_PREDICTION_ANALYSIS.md      ← Archive
USER_AUTH_IMPLEMENTATION.md          ← Archive
LEAGUE_PREFERENCES.md                ← Archive
match_analysis.md                    ← Archive
```

**Action:** Move to `/archive/docs/` folder

#### **5. Tools Scripts (Consolidate/Remove)**

**Keep (Active):**
- `fetch_scheduled_games.py`
- `fetch_live_odds.py`
- `advanced_prediction_model.py`
- `setup_turso_schema.js`
- `validate_data.js`
- `recalculate_standings.js`

**Review/Archive:**
```
tools/add_flashscore_url.js          ← One-time migration
tools/add_round_21_games.js          ← One-time task
tools/apply_auth_schema.js           ← Already applied
tools/check_users.js                 ← Test script
tools/cleanup_fake_odds.js           ← One-time cleanup
tools/fix_passwords.js               ← One-time fix
tools/generate_logo_map.py           ← Already generated
tools/import_logo_map.py             ← One-time import
tools/migrate_league_format.py       ← Already migrated
tools/migrate_to_turso.js            ← Already migrated
tools/normalize_data.py              ← One-time normalization
tools/test_api.py                    ← Test script
tools/test_password.js               ← Test script
tools/test_turso.js                  ← Test script
tools/update_all.sh                  ← Review if still relevant
```

**Action:** Move one-time scripts to `tools/archive/migrations/`

#### **6. Middleware Files**
Check what's in `middleware/` - may have unused route guards

#### **7. Archive Folder Content**
Review `archive/` and `tools/archive/` - consolidate or remove entirely


```
protero/
├── components/
│   ├── ui/                          # Reusable UI components
│   │   ├── Card.vue                # Card wrapper (all views use this)
│   │   ├── Button.vue              # Button component
│   │   ├── LoadingSpinner.vue      # Loading states
│   │   └── PageHeader.vue          # Page header component
│   ├── league/                      # League-specific components
│   │   ├── ChartsView.vue          # Charts orchestrator (3 tabs)
│   │   ├── RoundsView.vue          # Fixtures by round
│   │   ├── StandingsView.vue       # League table
│   │   ├── StatisticsView.vue      # Statistics overview
│   │   ├── PredictionsView.vue     # Match predictions
│   │   ├── ParlayGenerator.vue     # Parlay builder
│   │   ├── TabNavigation.vue       # Tab switcher
│   │   ├── MatchEditorModal.vue    # Admin: edit match data
│   │   └── charts/                 # Modular chart components
│   │       ├── GoalsDistribution.vue      # Vertical bar chart
│   │       ├── HomeAwayComparison.vue     # Horizontal bars
│   │       ├── OverUnderTrends.vue        # Stacked bars
│   │       ├── WinRateEvolution.vue       # Line chart
│   │       ├── BttsHeatmap.vue            # Color grid
│   │       └── TeamMetrics.vue            # 4 horizontal bars
│   ├── admin/                       # Admin panel components
│   │   ├── AdminHeader.vue         # Admin navigation
│   │   ├── FetchScheduledModal.vue # Fetch games modal
│   │   ├── MatchStatsEditor.vue    # Edit match stats
│   │   ├── RoundImageUpload.vue    # OCR upload
│   │   └── OddsManager.vue         # Manage odds
│   ├── dashboard/                   # Dashboard components
│   │   ├── LeagueList.vue          # League selection
│   │   └── StatsOverview.vue       # Quick stats
│   ├── Sidebar.vue                  # App sidebar navigation
│   ├── LoginForm.vue                # Login/register form
│   └── archive/                     # Unused components (don't delete yet)
├── composables/                     # Vue composables
│   ├── useAuth.ts                  # Authentication logic
│   ├── useGlobalData.js            # Global data fetching
│   ├── useLeagueData.js            # League data fetching
│   ├── useLeagueStats.js           # Stats calculations
│   ├── useMatchUtils.js            # Match utilities
│   ├── usePredictions.js           # Prediction logic
│   └── README.md                   # Composables documentation
├── middleware/
│   └── auth.ts                     # Route protection
├── pages/
│   ├── index.vue                   # Landing page
│   ├── leagues.vue                 # League dashboard
│   ├── login.vue                   # Login page
│   ├── account.vue                 # User account
│   ├── preferences.vue             # User preferences
│   ├── admin.vue                   # Admin panel
│   └── league/
│       └── [slug].vue              # League detail page (main page, 916 lines)
├── server/
│   ├── api/
│   │   ├── auth/                   # Auth endpoints
│   │   │   ├── login.post.ts
│   │   │   ├── logout.post.ts
│   │   │   ├── register.post.ts
│   │   │   └── me.get.ts
│   │   ├── admin/                  # Admin endpoints
│   │   │   ├── fetch-scheduled.post.ts
│   │   │   ├── fetch-scores.post.ts
│   │   │   ├── update-match.post.ts
│   │   │   ├── upload-stats.post.ts
│   │   │   └── league-stats.get.ts
│   │   ├── league/
│   │   │   └── [slug].get.ts       # League data endpoint
│   │   └── user/
│   │       ├── preferences.get.ts
│   │       └── preferences.post.ts
│   └── utils/
│       ├── database.ts             # Turso connection
│       ├── auth.ts                 # Auth utilities
│       └── validation.ts           # Data validation
├── tools/                          # Active scripts (22 total)
│   ├── advanced_prediction_model.py       # Main ML model
│   ├── improved_prediction_model.py       # Alternative model
│   ├── optimize_alpha.py                  # Hyperparameter tuning
│   ├── calibration_analysis.py            # Model calibration
│   ├── analyze_prediction_accuracy.py     # Performance metrics
│   ├── backtest_advanced_model.py         # Historical testing
│   ├── compare_predictions_odds.py        # Odds comparison
│   ├── fetch_scheduled_games.py           # Fetch fixtures
│   ├── fetch_live_odds.py                 # Fetch odds
│   ├── fetch_multi_source.py              # Multi-source aggregation
│   ├── fetch_next_round_odds.py           # Next round odds
│   ├── fetch_2025_season.py               # Season data
│   ├── extract_match_stats_ocr.py         # OCR extraction (Flashscore images)
│   ├── setup_turso_schema.js              # Database setup
│   ├── recalculate_standings.js           # Standings recalc
│   ├── validate_data.js                   # Data validation
│   ├── validate_leagues.py                # League validation
│   ├── check_odd_leagues.py               # Check odds
│   ├── check_odds_status.py               # Odds status
│   ├── set_default_odds.py                # Default odds
│   ├── update_optimal_predictions.py      # Update predictions
│   ├── README.md                          # Tools documentation
│   └── archive/
│       └── migrations/                    # One-time scripts (15 archived)
├── layouts/
│   └── default.vue                 # App layout with sidebar
├── public/
│   ├── data/                       # Static data files
│   └── readme.txt
├── archive/
│   └── docs/                       # Archived documentation (27 files)
├── assets/
│   └── css/
│       └── tailwind.css            # Tailwind entry point
├── .env                            # Environment variables
├── nuxt.config.ts                  # Nuxt configuration
├── tailwind.config.cjs             # Tailwind configuration
├── package.json                    # Dependencies
├── README.md                       # Main readme
├── CORRELATION_ANALYSIS_STRATEGY.md  # Correlation strategy doc
└── PROJECT_SUMMARY_CLEANUP.md      # This file
```

---

## 🔑 Critical Files for Understanding the App

### **1. pages/league/[slug].vue** (916 lines)
The heart of the application. This single-page component:
- Fetches all league data on mount
- Computes standings, statistics, and predictions
- Manages 5 tabs (Rounds, Standings, Statistics, Charts, Predictions)
- Provides data to all child components via props
- Uses 8+ composables for data management

**Key Computed Properties:**
- `liveStandings` - Real-time standings calculation
- `teamStatisticsFiltered` - Team stats with filters
- `roundStatistics` - Statistics by round
- `overallStats` - Aggregate statistics
- `topPerformers` - Top 5 teams by various metrics
- `homeAwayComparison` - Home vs away performance
- `winRateEvolution` - Win rates over time

### **2. components/league/ChartsView.vue**
Recently refactored (Jan 2026) with modular architecture:
- Overview cards (League Overview + Top Teams)
- 3 sub-tabs: Goals Analysis, Match Trends, Team Performance
- Imports 6 specialized chart components
- Uses Card wrapper for consistent design
- Compact, optimized layout

### **3. tools/advanced_prediction_model.py**
Machine learning prediction model:
- Features: recent form, home/away, goals, possession, shots, xG
- Outputs: Win/Draw/Away probabilities, Over/Under 2.5, BTTS
- Alpha-weighted ensemble approach
- Saves predictions to database

### **4. server/api/league/[slug].get.ts**
Main data endpoint serving:
- All matches for the league
- Team information
- Enriched statistics
- Cached for performance

### **5. composables/useLeagueStats.js**
Core statistics calculations:
- Standings algorithm (points, GD, goals)
- Team statistics (W/D/L, clean sheets, BTTS)
- Performance patterns (home/away splits)
- O/U 2.5 calculations

---

## 🎓 Key Concepts for AI Understanding

### **1. Live Standings Calculation**
The app **does not rely on external APIs for standings**. It calculates them in real-time from match results:
- 3 points for win, 1 for draw, 0 for loss
- Sort by: Points → Goal Difference → Goals For → Head-to-Head
- Filters: Overall, Home, Away, Over 2.5, Under 2.5

### **2. Enriched Match Statistics**
Each match has 30+ data points beyond just the score:
- **Performance:** possession, shots, shots on target, passes
- **Discipline:** yellow cards, red cards, fouls
- **Set Pieces:** corners
- **Advanced:** xG (expected goals), days rest
- **Betting:** odds for various markets

### **3. Prediction Methodology**
Multi-factor approach:
- **Recent Form:** Last 5 games performance
- **Home/Away Splits:** Separate home and away records
- **Head-to-Head:** Historical matchups
- **Statistical Trends:** Goals scored/conceded patterns
- **Advanced Metrics:** xG, possession, shots correlation
- **Alpha Weights:** Tuned coefficients for each factor

### **4. Odds Comparison**
- Fetches odds from external sources
- Compares to model predictions
- Identifies "value bets" (model disagrees with bookmaker)
- Confidence scoring based on agreement

### **5. Data Pipeline Flow**
```
External APIs → fetch_scheduled_games.py → Database (Turso)
                                                ↓
Flashscore → Scraping/OCR → Match Stats → Database
                                                ↓
OCR Upload → extract_match_stats_ocr.py → Stats → Database
                                                ↓
Python Model → advanced_prediction_model.py → Predictions → Database
                                                ↓
Nuxt Frontend ← server/api/league/[slug].get.ts ← Database
```

---

## 📋 Development Guidelines

### **Code Style**
- **Vue:** Composition API with `<script setup>`
- **TypeScript:** Used in most files, but not enforced everywhere
- **Imports:** Nuxt auto-imports for useState, computed, useFetch, navigateTo
- **CSS:** Tailwind utility classes, slate color palette
- **Components:** Card wrapper pattern for consistent design

### **Data Flow**
1. **Page loads** → `pages/league/[slug].vue` fetches from `/api/league/[slug]`
2. **API endpoint** → Queries Turso database
3. **Page computes** → Standings, stats, predictions in computed properties
4. **Components receive** → Data via props
5. **User interacts** → Filters, tabs, modals update reactive state

### **Adding a New Feature**
1. **Database:** Add columns to `games` table if needed (via SQL migration)
2. **Data Fetch:** Update `server/api/league/[slug].get.ts` to include new data
3. **Computation:** Add computed property in `pages/league/[slug].vue`
4. **Component:** Create new component in `components/league/`
5. **Integration:** Add to appropriate tab/section

### **Performance Considerations**
- **Computed properties cache** automatically (Vue 3)
- **API responses should be cached** (consider Redis for production)
- **Large datasets:** Filter and slice before rendering
- **Charts:** Use virtual scrolling for large lists

---

## 🚀 How to Proceed with Correlation Analysis

### **Immediate Next Steps (Week 1)**

1. **Install Dependencies**
```bash
npm install simple-statistics
```

2. **Create Backend Endpoint**
Create `server/api/analytics/correlations.post.ts` with:
- Data extraction from Turso (SQL query for enriched stats)
- Correlation calculation using `simple-statistics`
- Return correlation matrix as JSON

3. **Test with cURL**
```bash
curl -X POST http://localhost:3000/api/analytics/correlations \
  -H "Content-Type: application/json" \
  -d '{"leagueKey": "premier_league", "metrics": ["shots", "goals", "possession", "corners", "xg"]}'
```

4. **Create Frontend Component**
Create `components/analytics/CorrelationHeatmap.vue`:
- Accept `correlations` prop (matrix data)
- Render as color-coded grid
- Add interactive tooltips

5. **Add to League Page**
Update `pages/league/[slug].vue`:
- Add "Analytics" as 6th tab
- Fetch correlations on tab activation
- Display heatmap component

### **Follow-Up Tasks (Weeks 2-4)**

- **Python Integration:** Run `tools/correlation_analysis.py` for deep analysis
- **Visualization Enhancements:** Scatter plots, regression lines
- **Statistical Significance:** Add p-values to heatmap tooltips
- **Model Integration:** Update prediction weights based on correlations
- **User Insights:** Generate plain-English insights ("Shots on Target predicts goals 73% of the time")

### **Success Metrics**
- ✅ Correlation matrix computed and displayed
- ✅ Statistical significance calculated (p-values < 0.05)
- ✅ Improved prediction accuracy (measured via backtest)
- ✅ User-facing insights generated
- ✅ Documentation updated with findings

---

## 📚 Additional Resources

### **Documentation Files**
- `CORRELATION_ANALYSIS_STRATEGY.md` - Full correlation implementation guide
- `README.md` - Project setup and overview
- `composables/README.md` - Composables documentation
- `tools/README.md` - Tools usage guide

### **External References**
- **Turso Docs:** https://docs.turso.tech/
- **Nuxt 3 Docs:** https://nuxt.com/docs
- **simple-statistics:** https://simplestatistics.org/docs/
- **Flashscore:** https://www.flashscore.com/ (primary data source)

---

## 🎯 Summary for Claude Opus

**What Protero Is:**
A comprehensive football analytics platform combining real-time data, machine learning predictions, and interactive visualizations for 5 major European leagues. It calculates standings from scratch, predicts match outcomes, compares odds, and provides deep statistical insights.

**Current State:**
- ✅ Fully functional with 5 tabs per league
- ✅ Rich database with 30+ stats per match
- ✅ Python ML model for predictions
- ✅ Clean codebase (54 files organized Jan 2026)
- ✅ Admin panel for data management

**Next Major Feature:**
Implement **statistical correlation analysis** to discover relationships between metrics (shots, possession, xG, corners, etc.) and improve prediction accuracy.

**Technical Approach:**
1. Extract data from Turso via SQL
2. Compute correlations in Node.js (`simple-statistics` library)
3. Visualize as interactive heatmap (Vue component)
4. Integrate findings into prediction model
5. Python scripts for deep analysis

**Your Role:**
Implement the correlation analysis feature following the detailed plan in this document. Start with the backend endpoint, then frontend visualization, then Python analysis, then model integration.

---

**Last Updated:** January 8, 2026  
**Maintained By:** AI Development Team  
**Status:** Ready for Correlation Analysis Implementation
