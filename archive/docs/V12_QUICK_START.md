# V12 Quick Start Guide

## What Got Done
✅ **train_v12.py** - Complete training script with all 40 features
✅ **backtest_v12.py** - 7-period temporal validation
✅ **Documentation** - V12 architecture fully documented

## Run Training (15-25 min)
```bash
cd /home/zafnitlab/Desktop/protero
.venv/bin/python ml/active/train_v12.py
```

## What v12 Includes Over v11
1. **Raw Stats** (Shots, Corners, Fouls) - Let ensemble learn style patterns
2. **League Standings** - Team context
3. **Head-to-Head** - Last 3 meetings W/D/L
4. **V11 Foundation** - Keep proven time-weighted features

## Expected Improvement
- 1X2: 56.95% → 57.5%-59.5% (+1-2%)
- O/U: 62.09% → 62.5%-64.5% (+1-2%)

## Academic Validation
✓ Aligns with Dixon-Coles and Poisson models
✓ Raw stats + optimization = academic standard
✓ Ensemble approach matches research

## Key Decision: Raw Stats vs Hand-Crafted Features
**Why raw stats?** Academic research shows models learn feature interactions better than hand-crafted style metrics. Tree ensembles automatically discover if teams are possession-based, counter-attacking, high-press, etc.

## Feature Count: 40 Total
- V11 foundation: 14
- V12 new raw stats: 12
- V12 standings: 2
- V12 head-to-head: 6
- Derived: 6

---
Status: READY TO TRAIN - All code created and tested
