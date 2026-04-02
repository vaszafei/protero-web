# Turso + AI Prediction Implementation Checklist

## Phase 1: Database Optimization & Persistence ✅ (Priority: HIGH)

### 1.1 SQL Views for Statistics
- [ ] Create `team_recent_form` view (last 5 games, weighted)
- [ ] Create `h2h_stats` view (head-to-head history)
- [ ] Create `venue_performance` view (home/away specific stats)
- [ ] Create `rolling_averages` view (goals, xG, etc.)

### 1.2 Prediction Storage
- [ ] Verify `predictions` table exists (✅ already exists)
- [ ] Create `prediction_results` table for accuracy tracking
- [ ] Add indexes for fast lookups

### 1.3 Server-Side Prediction API
- [ ] Create `/api/predictions/[gameId].get.ts` - Fetch existing prediction
- [ ] Create `/api/predictions/generate.post.ts` - Generate new predictions
- [ ] Move prediction logic from `PredictionsView.vue` to server composable
- [ ] Add caching layer (1 hour TTL)

### 1.4 Enhanced Feature Extraction
- [ ] Add H2H statistics query
- [ ] Add venue-specific performance query  
- [ ] Add motivation/stakes calculation (league position)
- [ ] Add fatigue indicators (days since last match)

---

## Phase 2: Advanced Features (Priority: MEDIUM)

### 2.1 Feature Engineering
- [ ] Exponentially weighted moving averages (EWMA)
- [ ] Momentum indicators (3-game win streak = boost)
- [ ] Strength of schedule adjustments
- [ ] Squad depth/rotation impact

### 2.2 Backtesting Framework
- [ ] Create backtest script
- [ ] Test on historical data (last season)
- [ ] Measure accuracy by prediction type (1X2, O/U, BTTS)
- [ ] Track ROI with Kelly Criterion staking

### 2.3 Prediction Tracking Dashboard
- [ ] Show prediction accuracy over time
- [ ] Profit/Loss tracking
- [ ] Best performing bet types
- [ ] Model performance by league

---

## Phase 3: ML Integration (Priority: LOW - Optional)

### 3.1 Model Selection
- [ ] Research: TensorFlow.js vs ONNX vs Python microservice
- [ ] Prepare training dataset
- [ ] Split data: train (70%), validation (15%), test (15%)

### 3.2 Model Training
- [ ] Feature engineering pipeline
- [ ] Train classification model (Win/Draw/Loss)
- [ ] Train regression model (exact score)
- [ ] Hyperparameter tuning

### 3.3 Deployment
- [ ] Save model weights
- [ ] Create inference API
- [ ] A/B test vs statistical model

---

## Phase 4: Edge Optimization (Priority: MEDIUM)

### 4.1 Turso Embedded Replicas
- [ ] Set up local replica for edge reads
- [ ] Configure sync interval
- [ ] Test latency improvements

### 4.2 Cloudflare Workers
- [ ] Deploy prediction API to Workers
- [ ] Configure Turso connection
- [ ] Set up caching strategy

### 4.3 Performance Monitoring
- [ ] Add response time tracking
- [ ] Monitor database query performance
- [ ] Set up alerts for errors

---

## Quick Wins (Do First)

1. ✅ Create analysis document
2. [ ] Add SQL view for team form
3. [ ] Store predictions in database
4. [ ] Create prediction API endpoint
5. [ ] Add H2H statistics to predictions

---

## Current Issues to Fix

1. ❌ Predictions recalculated on every page load (SLOW)
2. ❌ No prediction history or accuracy tracking
3. ❌ Missing H2H statistics in predictions
4. ❌ No venue-specific adjustments
5. ❌ Client-side only (can't scale)

---

## Success Metrics

### Accuracy Goals
- [ ] 1X2 Prediction Accuracy: >55% (current unknown)
- [ ] Over/Under 2.5 Accuracy: >65%
- [ ] BTTS Accuracy: >60%

### Performance Goals
- [ ] Prediction generation: <100ms (currently ~500ms)
- [ ] API response time: <50ms with caching
- [ ] Database query time: <10ms

### Business Goals
- [ ] Track ROI with Kelly Criterion: Target +10% over 100 bets
- [ ] Build confidence in predictions (show past performance)
- [ ] Professional system that can scale

---

## Technical Debt

1. Current prediction logic is in Vue component (should be server-side)
2. No error handling for missing odds data
3. No validation of prediction confidence
4. Recalculating same predictions repeatedly
5. Not utilizing Turso's full capabilities

---

## Resources Needed

- Turso Pro plan (if scaling beyond free tier): $29/month
- Optional: OpenAI API for LLM-enhanced analysis: $20-100/month
- Optional: ML compute (if training models): Variable
- Development time: 1-2 weeks for Phase 1 & 2

---

## Next Action Items (In Order)

1. ✅ Review analysis document
2. [ ] Create SQL views for statistics
3. [ ] Build prediction storage API
4. [ ] Implement H2H feature extraction
5. [ ] Move predictions to server-side
6. [ ] Add basic tracking dashboard
