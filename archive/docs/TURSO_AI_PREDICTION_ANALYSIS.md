# Turso + AI Prediction System Analysis & Implementation Plan

## Current State Assessment

### ✅ What We Have
1. **Database Structure (Turso/LibSQL)**
   - `games` table with match results (180 completed games across 18 rounds)
   - `standings` table with team statistics
   - `odds` table for betting odds (with over/under lines)
   - `predictions` table (currently empty - not being used)
   - `teams` and `leagues` tables for organization

2. **Statistical Engine**
   - Dixon-Coles Bivariate Poisson model implementation
   - Exponential time weighting for recent form
   - Kelly Criterion for optimal bet sizing
   - Expected Value calculations
   - Ensemble approach (60% model + 40% market odds)
   - Over/Under probability calculations

3. **Data Flow**
   - API fetches data from Turso via `/server/api/leagues/[slug].get.ts`
   - Data is processed client-side in `PredictionsView.vue`
   - Predictions are calculated in real-time (not stored)

### ❌ What We're Missing
1. **No prediction persistence** - Predictions are recalculated every page load
2. **No historical prediction tracking** - Can't measure accuracy
3. **No ML model training** - Using pure statistical models
4. **No feature engineering** - Basic stats only
5. **Limited data utilization** - Not using all available Turso features
6. **No prediction API** - Everything is client-side

---

## Turso Features We Can Leverage

### 1. **Embedded Replicas** (Edge Caching)
- **What**: Create local replicas of the database at the edge
- **Benefit**: Ultra-fast reads (sub-millisecond latency)
- **Use Case**: Cache historical match data and team stats for instant predictions

```typescript
// Example implementation
import { createClient } from '@libsql/client'

const db = createClient({
  url: 'file:local.db', // Local replica
  syncUrl: process.env.TURSO_DB_URL, // Sync with Turso
  authToken: process.env.TURSO_AUTH_TOKEN,
  syncInterval: 60 // Sync every 60 seconds
})
```

### 2. **SQL Views for Feature Engineering**
Create materialized views for common statistical calculations:

```sql
-- Team attacking strength (last 5 games, exponentially weighted)
CREATE VIEW team_attack_strength AS
SELECT 
  t.id,
  t.name,
  AVG(CASE WHEN g.home_team_id = t.id THEN g.home_goals ELSE g.away_goals END) as avg_goals,
  -- More complex calculations here
FROM teams t
JOIN games g ON (g.home_team_id = t.id OR g.away_team_id = t.id)
GROUP BY t.id;

-- Head-to-head statistics
CREATE VIEW h2h_stats AS
SELECT 
  home_team_id,
  away_team_id,
  COUNT(*) as matches,
  AVG(home_goals) as avg_home_goals,
  AVG(away_goals) as avg_away_goals,
  SUM(CASE WHEN home_goals > away_goals THEN 1 ELSE 0 END) as home_wins
FROM games
GROUP BY home_team_id, away_team_id;
```

### 3. **Window Functions for Time-Series Analysis**
Calculate rolling averages, form trends, and momentum:

```sql
SELECT 
  g.*,
  -- Rolling average of last 5 games
  AVG(g.home_goals) OVER (
    PARTITION BY g.home_team_id 
    ORDER BY g.date 
    ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
  ) as home_rolling_avg,
  -- Exponential moving average
  -- Form streak
  ROW_NUMBER() OVER (
    PARTITION BY g.home_team_id 
    ORDER BY g.date DESC
  ) as recency_rank
FROM games g
WHERE g.status = 'completed';
```

### 4. **Turso + Cloudflare Workers (Edge Computing)**
Move prediction logic to the edge:

```typescript
// Deploy on Cloudflare Workers
export default {
  async fetch(request: Request, env: Env) {
    const db = createClient({
      url: env.TURSO_DB_URL,
      authToken: env.TURSO_AUTH_TOKEN
    })
    
    // Run ML inference at the edge
    const predictions = await generatePredictions(db)
    
    return new Response(JSON.stringify(predictions), {
      headers: { 'content-type': 'application/json' }
    })
  }
}
```

### 5. **Batch Predictions with Transactions**
Store predictions atomically:

```typescript
await db.batch([
  {
    sql: 'INSERT INTO predictions (game_id, prediction, confidence, recommended_bet, explanation) VALUES (?, ?, ?, ?, ?)',
    args: [gameId, prediction, confidence, bet, explanation]
  },
  // More predictions...
], 'write')
```

---

## AI/ML Integration Strategies

### Option 1: **Enhanced Statistical Model (No External ML)**
Improve current Dixon-Coles model with more features from Turso:

**Features to Add:**
- Head-to-head history (h2h win rate, avg goals)
- Venue-specific stats (home advantage varies by team)
- Fatigue indicators (days since last match, fixture congestion)
- Squad value/ratings (if available)
- Referee tendencies (if available)
- Weather conditions (if available)
- Motivation/stakes (league position, relegation battle)

**Implementation:**
```typescript
// Enhanced feature extraction
async function extractFeatures(db, homeTeamId, awayTeamId, gameDate) {
  // 1. Recent form (last 5 games, exponentially weighted)
  const recentForm = await db.execute({
    sql: `
      SELECT team_id,
        SUM(points * weight) / SUM(weight) as weighted_points
      FROM (
        SELECT 
          CASE WHEN home_team_id = ? THEN home_team_id ELSE away_team_id END as team_id,
          CASE 
            WHEN (home_team_id = ? AND home_goals > away_goals) OR 
                 (away_team_id = ? AND away_goals > home_goals) THEN 3
            WHEN home_goals = away_goals THEN 1
            ELSE 0
          END as points,
          EXP(-0.0065 * (JULIANDAY(?) - JULIANDAY(date))) as weight
        FROM games
        WHERE (home_team_id = ? OR away_team_id = ?) 
          AND status = 'completed'
          AND date < ?
        ORDER BY date DESC
        LIMIT 5
      )
      GROUP BY team_id
    `,
    args: [homeTeamId, homeTeamId, homeTeamId, gameDate, homeTeamId, homeTeamId, gameDate]
  })
  
  // 2. Head-to-head
  const h2h = await db.execute({
    sql: `
      SELECT 
        COUNT(*) as total_matches,
        AVG(CASE WHEN home_team_id = ? THEN home_goals ELSE away_goals END) as home_avg,
        AVG(CASE WHEN home_team_id = ? THEN away_goals ELSE home_goals END) as away_avg,
        SUM(CASE 
          WHEN (home_team_id = ? AND home_goals > away_goals) OR
               (away_team_id = ? AND away_goals > home_goals) 
          THEN 1 ELSE 0 
        END) as home_wins
      FROM games
      WHERE ((home_team_id = ? AND away_team_id = ?) OR 
             (home_team_id = ? AND away_team_id = ?))
        AND status = 'completed'
        AND date < ?
    `,
    args: [homeTeamId, homeTeamId, homeTeamId, homeTeamId, 
           homeTeamId, awayTeamId, awayTeamId, homeTeamId, gameDate]
  })
  
  // 3. Venue-specific performance
  const venueStats = await db.execute({
    sql: `
      SELECT 
        AVG(home_goals) as home_venue_avg,
        AVG(away_goals) as away_venue_avg
      FROM games
      WHERE home_team_id = ?
        AND status = 'completed'
        AND date < ?
    `,
    args: [homeTeamId, gameDate]
  })
  
  // 4. Motivation (standings position)
  const standings = await db.execute({
    sql: `
      SELECT 
        t.id,
        s.pts,
        s.gp,
        (SELECT COUNT(*) FROM standings s2 WHERE s2.league_key = s.league_key AND s2.pts > s.pts) + 1 as position
      FROM teams t
      JOIN standings s ON t.id = s.team_id
      WHERE t.id IN (?, ?)
    `,
    args: [homeTeamId, awayTeamId]
  })
  
  return {
    recentForm: recentForm.rows,
    h2h: h2h.rows[0],
    venue: venueStats.rows[0],
    standings: standings.rows
  }
}
```

### Option 2: **Hybrid: Statistical + Simple ML (Gradient Boosting)**
Use XGBoost/LightGBM trained on historical data:

**Training Data Structure:**
```javascript
// Feature vector for each match
const trainingData = {
  features: [
    // Team strength features
    home_avg_goals_last_5,
    away_avg_goals_last_5,
    home_defense_rating,
    away_defense_rating,
    home_form_points,
    away_form_points,
    
    // H2H features
    h2h_home_win_rate,
    h2h_avg_total_goals,
    
    // Venue features
    home_venue_advantage,
    
    // Motivation features
    home_position_diff_from_goal, // e.g., distance from top 4
    away_position_diff_from_goal,
    
    // Market features (if available)
    implied_prob_home_win,
    implied_prob_over_25,
    
    // Time features
    days_since_last_match_home,
    days_since_last_match_away,
  ],
  target: {
    home_goals: 2,
    away_goals: 1,
    // Or classification: 'home_win' / 'draw' / 'away_win'
  }
}
```

**Implementation:**
```typescript
// server/api/train-model.post.ts
export default defineEventHandler(async (event) => {
  const db = getDB()
  
  // 1. Extract all completed games with features
  const trainingData = await db.execute({
    sql: `
      SELECT 
        g.*,
        h.name as home_name,
        a.name as away_name,
        -- Feature engineering in SQL
        (SELECT AVG(home_goals) FROM games WHERE home_team_id = g.home_team_id AND date < g.date LIMIT 5) as home_recent_avg,
        -- ... more features
      FROM games g
      JOIN teams h ON g.home_team_id = h.id
      JOIN teams a ON g.away_team_id = a.id
      WHERE g.status = 'completed'
      ORDER BY g.date
    `
  })
  
  // 2. Format for ML library (could use TensorFlow.js or ONNX Runtime)
  const X = [] // Feature matrix
  const y = [] // Labels
  
  trainingData.rows.forEach(game => {
    X.push([
      game.home_recent_avg,
      // ... all features
    ])
    y.push(game.home_goals > game.away_goals ? 1 : (game.home_goals === game.away_goals ? 0 : -1))
  })
  
  // 3. Train model (pseudo-code, would need actual ML library)
  const model = await trainXGBoost(X, y)
  
  // 4. Save model weights to file or database
  await saveModel(model)
  
  return { success: true, accuracy: model.accuracy }
})
```

### Option 3: **Full AI: Embed LLM for Analysis (Turso + OpenAI/Claude)**
Use Turso as knowledge base + LLM for prediction reasoning:

```typescript
// server/api/predict-with-ai.post.ts
export default defineEventHandler(async (event) => {
  const { homeTeam, awayTeam, round } = await readBody(event)
  const db = getDB()
  
  // 1. Get comprehensive stats from Turso
  const stats = await db.execute({
    sql: `
      SELECT 
        -- Team stats, recent form, h2h, standings, etc.
      FROM games g
      JOIN teams h ON g.home_team_id = h.id
      -- ... complex query
    `
  })
  
  // 2. Prepare context for LLM
  const context = `
  You are a football analytics expert. Predict the match between ${homeTeam} and ${awayTeam}.
  
  Historical Data:
  ${JSON.stringify(stats.rows, null, 2)}
  
  Recent Form:
  - ${homeTeam}: ${stats.homeForm}
  - ${awayTeam}: ${stats.awayForm}
  
  H2H Last 5 Meetings: ${stats.h2h}
  
  Provide:
  1. Most likely score
  2. Win probabilities (Home/Draw/Away)
  3. Over/Under 2.5 probability
  4. Recommended bet with reasoning
  `
  
  // 3. Call LLM
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are a football prediction expert.' },
        { role: 'user', content: context }
      ],
      response_format: { type: 'json_object' }
    })
  })
  
  const prediction = await response.json()
  
  // 4. Store prediction in Turso
  await db.execute({
    sql: 'INSERT INTO predictions (game_id, prediction, confidence, explanation) VALUES (?, ?, ?, ?)',
    args: [gameId, prediction.score, prediction.confidence, prediction.reasoning]
  })
  
  return prediction
})
```

---

## Recommended Implementation Plan

### Phase 1: **Optimize Current System with Turso Features** (1-2 days)

1. **Create SQL Views for Common Calculations**
   - Team form (last 5 games weighted)
   - H2H statistics
   - Venue-specific performance
   - Rolling averages

2. **Add Prediction Persistence**
   ```typescript
   // Store predictions in database
   await db.execute({
     sql: 'INSERT OR REPLACE INTO predictions (game_id, prediction, confidence, recommended_bet, explanation, created_at) VALUES (?, ?, ?, ?, ?, ?)',
     args: [gameId, score, confidence, bet, analysis, new Date().toISOString()]
   })
   ```

3. **Create Prediction API Endpoint**
   - Move prediction logic from client to server
   - `/api/predictions/[gameId].get.ts` - Get stored prediction
   - `/api/predictions/generate.post.ts` - Generate new predictions

4. **Add Prediction Tracking**
   ```sql
   -- Track accuracy
   CREATE TABLE prediction_results (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     prediction_id INTEGER NOT NULL,
     actual_result TEXT,
     was_correct BOOLEAN,
     profit_loss REAL,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (prediction_id) REFERENCES predictions(id)
   );
   ```

### Phase 2: **Enhanced Feature Engineering** (2-3 days)

1. **Implement Advanced SQL Queries**
   - Exponentially weighted moving averages
   - Momentum indicators
   - Strength of schedule adjustments

2. **Add New Features**
   - Days rest between matches
   - Fixture congestion (3 games in 7 days?)
   - League position pressure (top 4 race, relegation battle)
   - Streak analysis (winning/losing streaks)

3. **Backtesting Framework**
   ```typescript
   async function backtest(db, startDate, endDate) {
     const games = await db.execute({
       sql: 'SELECT * FROM games WHERE date BETWEEN ? AND ? ORDER BY date',
       args: [startDate, endDate]
     })
     
     let correct = 0
     let total = 0
     let profit = 0
     
     for (const game of games.rows) {
       // Generate prediction using data available before game
       const prediction = await generatePrediction(db, game.id, game.date)
       
       // Check if prediction was correct
       const actualResult = game.home_goals > game.away_goals ? 'H' : 
                          game.home_goals === game.away_goals ? 'D' : 'A'
       
       if (prediction.result === actualResult) correct++
       total++
       
       // Calculate profit using Kelly Criterion staking
       profit += calculateProfit(prediction, game)
     }
     
     return {
       accuracy: (correct / total) * 100,
       profitLoss: profit,
       roi: (profit / total) * 100
     }
   }
   ```

### Phase 3: **Machine Learning Integration** (3-5 days)

1. **Choose ML Framework**
   - Option A: TensorFlow.js (runs in Node.js)
   - Option B: ONNX Runtime (pre-trained models)
   - Option C: Python microservice (separate service)

2. **Feature Engineering Pipeline**
   ```typescript
   function engineerFeatures(game, historicalData) {
     return {
       // Aggregated features
       home_avg_goals_last_5: calculateRollingAvg(historicalData.home, 5),
       home_avg_goals_last_10: calculateRollingAvg(historicalData.home, 10),
       home_form_last_5: calculateFormPoints(historicalData.home, 5),
       
       // Differential features
       goal_diff_advantage: homeStats.avgGoals - awayStats.avgGoals,
       form_diff: homeStats.form - awayStats.form,
       
       // Interaction features
       expected_goals_product: homeStats.attack * awayStats.defense,
       
       // Temporal features
       days_since_last_home: daysSinceLastMatch(historicalData.home),
       is_weekend: isWeekend(game.date),
       
       // Contextual features
       league_position_diff: homePos - awayPos,
       points_from_relegation: Math.min(homePoints - 40, awayPoints - 40),
     }
   }
   ```

3. **Model Training Script**
   ```bash
   # Create training script
   touch server/scripts/train-model.ts
   
   # Run training
   npx tsx server/scripts/train-model.ts
   ```

### Phase 4: **Production Deployment** (1-2 days)

1. **Edge Deployment**
   - Deploy on Cloudflare Workers
   - Use embedded replicas for low latency

2. **Caching Strategy**
   ```typescript
   // Cache predictions for 1 hour
   const cachedPrediction = await cache.get(`prediction:${gameId}`)
   if (cachedPrediction) return cachedPrediction
   
   const prediction = await generatePrediction(db, gameId)
   await cache.set(`prediction:${gameId}`, prediction, 3600)
   ```

3. **Monitoring**
   - Track prediction accuracy in real-time
   - Alert if accuracy drops below threshold
   - Monitor API performance

---

## Cost-Benefit Analysis

### Current Approach (Client-Side Calculation)
- ✅ Zero server costs
- ✅ Simple implementation
- ❌ Slow (recalculates every load)
- ❌ No history tracking
- ❌ Can't improve over time
- ❌ Limited by browser compute

### Turso-Enhanced Approach
- ✅ Fast (pre-computed predictions)
- ✅ Historical tracking
- ✅ Continuous improvement
- ✅ Better accuracy with more features
- ✅ Professional system
- ⚠️ Small Turso cost ($0-29/month)
- ⚠️ Development time (1-2 weeks)

### Full ML Approach
- ✅ Best accuracy potential
- ✅ Learns from data
- ✅ Scalable
- ⚠️ Higher costs (compute for training)
- ⚠️ More complex maintenance
- ⚠️ Longer development (2-4 weeks)

---

## Next Steps - Quick Wins

### Immediate (Today):
1. Add prediction persistence to database
2. Create SQL views for team statistics
3. Move predictions to server-side API

### This Week:
1. Implement H2H statistics
2. Add backtest framework
3. Track prediction accuracy

### This Month:
1. Add advanced features (momentum, fatigue, motivation)
2. Experiment with simple ML (if needed)
3. Optimize with Turso edge features

---

## Conclusion

**Recommended Path**: Start with **Phase 1 & 2** (Turso optimization + enhanced features)

This approach:
- Provides immediate improvements (80% of value)
- Low risk and cost
- Fast to implement
- Can add ML later if needed

**Current system is already sophisticated** (Dixon-Coles + Kelly Criterion), so focus on:
1. Better data utilization (SQL views, window functions)
2. More features (H2H, motivation, fatigue)
3. Prediction persistence and tracking
4. Moving compute to server/edge

ML/AI is optional and should only be added if statistical model plateaus.
