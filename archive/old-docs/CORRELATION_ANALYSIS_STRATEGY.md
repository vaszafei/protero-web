# Statistical Correlation Analysis Strategy for Football Predictions

## Academic Foundation

### Key Correlation Methods for Sports Analytics

#### 1. **Pearson Correlation Coefficient**
- Measures linear relationships between variables
- Range: -1 (perfect negative) to +1 (perfect positive)
- Best for: Goals vs Shots, Possession vs Win Rate

#### 2. **Spearman's Rank Correlation**
- Non-parametric measure for monotonic relationships
- Better when data isn't normally distributed
- Best for: League positions, rankings

#### 3. **Chi-Square Test**
- Tests independence between categorical variables
- Best for: Home/Away results, Over/Under outcomes

#### 4. **Multiple Linear Regression**
- Predicts outcomes based on multiple variables
- Best for: Win probability from multiple stats

### Academic Research Findings (Football Statistics)

**Strong Positive Correlations Found in Literature:**
1. **Shots on Target → Goals** (r = 0.65-0.75)
2. **xG (Expected Goals) → Actual Goals** (r = 0.70-0.80)
3. **Possession → Win Rate** (r = 0.45-0.55) - moderate
4. **Corners → Goals** (r = 0.25-0.35) - weak but significant
5. **Yellow Cards → Fouls** (r = 0.60-0.70)

**Negative Correlations:**
1. **Days Rest → Goals Conceded** (r = -0.20 to -0.30)
2. **Red Cards → Win Probability** (r = -0.45 to -0.55)

**Weak/No Correlation:**
1. **Possession → Goals** (r = 0.15-0.25) - weaker than expected
2. **Total Shots → Win Rate** (r = 0.30-0.40) - quality matters more

---

## Turso/LibSQL Capabilities for Correlation Analysis

### Built-in SQL Features (SQLite-based)

Turso is built on LibSQL (SQLite fork), providing:

#### 1. **Window Functions** ✅
```sql
-- Moving averages for form tracking
SELECT 
  team_name,
  round,
  AVG(goals_scored) OVER (
    PARTITION BY team_name 
    ORDER BY round 
    ROWS BETWEEN 5 PRECEDING AND CURRENT ROW
  ) AS avg_last_6_games
FROM games;
```

#### 2. **Common Table Expressions (CTEs)** ✅
```sql
-- Complex correlation calculations
WITH team_stats AS (
  SELECT team_name, AVG(possession) as avg_poss, AVG(goals) as avg_goals
  FROM games
  GROUP BY team_name
)
SELECT 
  CORR(avg_poss, avg_goals) as possession_goals_correlation
FROM team_stats;
```

#### 3. **Aggregate Functions** ✅
- `AVG()`, `SUM()`, `COUNT()`, `MIN()`, `MAX()`
- `GROUP BY` with `HAVING`
- Statistical aggregations

#### 4. **JSON Functions** ✅
- Store complex correlation matrices
- Store prediction model parameters

### What Turso DOESN'T Have Natively

❌ **CORR()** function - not in SQLite/LibSQL
❌ **STDDEV()** / **VARIANCE()** - not native
❌ **PERCENTILE()** functions
❌ **Advanced statistical functions**

### Solutions for Correlation Analysis

#### **Approach 1: Calculate in Application Layer (Recommended)**

**Advantages:**
- Full control over statistical methods
- Access to libraries (JavaScript/Python)
- Can use multiple correlation methods
- Better for complex ML models

**Implementation:**
```javascript
// In your Nuxt/Node.js backend
import { pearsonCorrelation } from 'simple-statistics';

// Fetch data from Turso
const games = await turso.execute(`
  SELECT 
    home_possession_pct,
    home_goals,
    home_shots,
    home_shots_on_target,
    home_corners,
    home_xg
  FROM games
  WHERE home_goals IS NOT NULL
`);

// Calculate correlations
const correlations = {
  possession_goals: pearsonCorrelation(
    games.rows.map(r => r.home_possession_pct),
    games.rows.map(r => r.home_goals)
  ),
  shots_goals: pearsonCorrelation(
    games.rows.map(r => r.home_shots),
    games.rows.map(r => r.home_goals)
  ),
  xg_goals: pearsonCorrelation(
    games.rows.map(r => r.home_xg),
    games.rows.map(r => r.home_goals)
  )
};
```

#### **Approach 2: Custom SQL Functions (Manual Calculation)**

**Variance & Standard Deviation:**
```sql
-- Manual calculation of correlation coefficient
WITH stats AS (
  SELECT 
    AVG(home_possession_pct) as mean_possession,
    AVG(home_goals) as mean_goals,
    COUNT(*) as n
  FROM games
  WHERE home_goals IS NOT NULL
),
deviations AS (
  SELECT 
    (home_possession_pct - stats.mean_possession) as dev_poss,
    (home_goals - stats.mean_goals) as dev_goals
  FROM games, stats
  WHERE home_goals IS NOT NULL
)
SELECT 
  SUM(dev_poss * dev_goals) / (
    SQRT(SUM(dev_poss * dev_poss)) * 
    SQRT(SUM(dev_goals * dev_goals))
  ) as correlation
FROM deviations;
```

#### **Approach 3: Turso + Python Analysis (Best for Deep Analysis)**

Create analysis scripts in `/tools`:
```python
# tools/correlation_analysis.py
import pandas as pd
import numpy as np
from scipy.stats import pearsonr, spearmanr
import libsql_client

# Connect to Turso
client = libsql_client.create_client_sync(
    url=os.getenv("TURSO_DATABASE_URL"),
    auth_token=os.getenv("TURSO_AUTH_TOKEN")
)

# Fetch data
result = client.execute("SELECT * FROM games WHERE home_goals IS NOT NULL")
df = pd.DataFrame(result.rows)

# Calculate correlation matrix
correlation_matrix = df[[
    'home_possession_pct', 'home_shots', 'home_shots_on_target',
    'home_corners', 'home_xg', 'home_goals'
]].corr(method='pearson')

print(correlation_matrix)
```

---

## Recommended Implementation Plan

### Phase 1: Data Quality (Week 1)
✅ Already have enriched stats (possession, shots, corners, cards, xG)
- [ ] Validate data completeness
- [ ] Handle NULL values
- [ ] Normalize data ranges

### Phase 2: Basic Correlations (Week 2)
1. **Create API endpoint** `/api/analytics/correlations`
2. **Calculate key correlations:**
   - Shots → Goals
   - xG → Goals  
   - Possession → Wins
   - Corners → Goals
   - Cards → Results
3. **Store results** in a new `correlation_cache` table

### Phase 3: Advanced Analytics (Week 3)
1. **Form-based correlations:**
   - Last 5 games average vs next game performance
   - Home/Away form patterns
2. **Time-series analysis:**
   - Goals trend by round
   - Possession evolution
3. **Multi-variate analysis:**
   - Combine multiple stats for predictions

### Phase 4: Visual Dashboard (Week 4)
1. Create correlation heatmap component
2. Show strongest predictors
3. Update prediction model with correlation weights

---

## SQL Queries You Can Run Right Now

### 1. Basic Relationship Analysis
```sql
-- Does possession correlate with goals?
SELECT 
  CASE 
    WHEN home_possession_pct >= 60 THEN 'High (60+%)'
    WHEN home_possession_pct >= 50 THEN 'Medium (50-59%)'
    ELSE 'Low (<50%)'
  END as possession_category,
  AVG(home_goals) as avg_goals,
  COUNT(*) as matches
FROM games
WHERE home_goals IS NOT NULL
GROUP BY possession_category
ORDER BY possession_category DESC;
```

### 2. Shot Efficiency Analysis
```sql
-- Shots on target to goals ratio
SELECT 
  team_name,
  SUM(home_shots_on_target + away_shots_on_target) as total_sot,
  SUM(home_goals + away_goals) as total_goals,
  CAST(SUM(home_goals + away_goals) AS REAL) / 
    NULLIF(SUM(home_shots_on_target + away_shots_on_target), 0) as conversion_rate
FROM (
  SELECT home_name as team_name, home_shots_on_target, 0 as away_shots_on_target, 
         home_goals, 0 as away_goals FROM games
  UNION ALL
  SELECT away_name, 0, away_shots_on_target, 0, away_goals FROM games
)
WHERE home_goals IS NOT NULL
GROUP BY team_name
ORDER BY conversion_rate DESC;
```

### 3. Cards vs Aggression
```sql
-- Do teams with more fouls get more cards?
SELECT 
  CASE 
    WHEN home_fouls >= 15 THEN 'High Fouls (15+)'
    WHEN home_fouls >= 10 THEN 'Medium Fouls (10-14)'
    ELSE 'Low Fouls (<10)'
  END as foul_category,
  AVG(home_yellow_cards + home_red_cards) as avg_cards,
  COUNT(*) as matches
FROM games
WHERE home_goals IS NOT NULL
GROUP BY foul_category;
```

### 4. Rest Days Impact
```sql
-- Does rest affect performance?
SELECT 
  CASE 
    WHEN home_days_rest >= 7 THEN 'Well Rested (7+ days)'
    WHEN home_days_rest >= 4 THEN 'Normal (4-6 days)'
    ELSE 'Fatigued (<4 days)'
  END as rest_category,
  AVG(home_goals) as avg_goals_scored,
  AVG(away_goals) as avg_goals_conceded,
  AVG(CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END) as win_rate
FROM games
WHERE home_goals IS NOT NULL
GROUP BY rest_category;
```

### 5. xG Accuracy
```sql
-- How accurate is xG at predicting goals?
SELECT 
  ROUND(home_xg, 0) as expected_goals,
  AVG(home_goals) as actual_avg_goals,
  COUNT(*) as matches,
  ABS(ROUND(home_xg, 0) - AVG(home_goals)) as prediction_error
FROM games
WHERE home_xg > 0 AND home_goals IS NOT NULL
GROUP BY ROUND(home_xg, 0)
ORDER BY expected_goals;
```

---

## Next Steps

### Immediate Actions:
1. ✅ Run the SQL queries above to understand your data relationships
2. Create `/tools/analyze_correlations.py` script
3. Install statistical libraries: `npm install simple-statistics`
4. Create API endpoint for correlation analysis

### Medium-term:
1. Build correlation heatmap component
2. Integrate findings into prediction model
3. Weight features based on correlation strength
4. Add correlation-based insights to Charts view

### Long-term:
1. Machine learning model training using correlation insights
2. Real-time correlation updates as games are played
3. Comparative correlation analysis across different leagues
4. Automated feature selection based on correlation strength

---

## Libraries to Consider

### JavaScript/Node.js:
- **simple-statistics** - Basic statistical functions including correlation
- **jstat** - More advanced statistical operations
- **ml.js** - Machine learning and regression

### Python (for deep analysis):
- **pandas** - Data manipulation
- **scipy** - Statistical tests (pearsonr, spearmanr)
- **scikit-learn** - Machine learning and feature correlation
- **seaborn** - Correlation heatmaps

### Visualization:
- **D3.js** - Custom correlation visualizations
- **Chart.js** - Simpler charts with correlation data
- **Plotly** - Interactive statistical plots
