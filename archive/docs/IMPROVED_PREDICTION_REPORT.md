# Premier League Prediction Accuracy Report

**Model:** Advanced Dixon-Coles with Form Weighting & Shot Quality

**Generated:** 2025-12-30 19:27:39

**Data:** Complete stats (shots, possession, corners) + odds for all 180 matches

## Overall Performance

- **Total Matches Analyzed:** 150
- **1X2 Accuracy:** 79/150 (52.7%)
- **Over/Under 2.5 Accuracy:** 75/150 (50.0%)

**Baseline Comparison:**
- Random Guess (1X2): 33.3%
- Random Guess (O/U): 50.0%
- **Model vs Random (1X2):** 19.4% improvement
- **Model vs Random (O/U):** 0.0% improvement

## Accuracy by Round

| Round | 1X2 Correct | O/U Correct | Total | 1X2 % | O/U % |
|-------|-------------|-------------|-------|-------|-------|
| 4 | 7 | 8 | 10 | 70.0% | 80.0% |
| 5 | 3 | 4 | 10 | 30.0% | 40.0% |
| 6 | 4 | 4 | 10 | 40.0% | 40.0% |
| 7 | 6 | 3 | 10 | 60.0% | 30.0% |
| 8 | 5 | 5 | 10 | 50.0% | 50.0% |
| 9 | 7 | 4 | 10 | 70.0% | 40.0% |
| 10 | 5 | 7 | 10 | 50.0% | 70.0% |
| 11 | 4 | 5 | 10 | 40.0% | 50.0% |
| 12 | 5 | 5 | 10 | 50.0% | 50.0% |
| 13 | 5 | 4 | 10 | 50.0% | 40.0% |
| 14 | 5 | 5 | 10 | 50.0% | 50.0% |
| 15 | 6 | 3 | 10 | 60.0% | 30.0% |
| 16 | 5 | 6 | 10 | 50.0% | 60.0% |
| 17 | 6 | 7 | 10 | 60.0% | 70.0% |
| 18 | 6 | 5 | 10 | 60.0% | 50.0% |

## Sample Correct Predictions (Last 10)

| Round | Match | Score | Prediction | Probabilities |
|-------|-------|-------|------------|---------------|
| 17 | Tottenham vs Liverpool | 1-2 | AWAY | H:37% D:24% A:39% |
| 17 | Everton vs Arsenal | 0-1 | AWAY | H:16% D:26% A:58% |
| 17 | Aston Villa vs Manchester United | 2-1 | HOME | H:53% D:21% A:26% |
| 17 | Fulham vs Nottingham Forest | 1-0 | HOME | H:47% D:24% A:29% |
| 18 | Manchester United vs Newcastle | 1-0 | HOME | H:44% D:22% A:34% |
| 18 | Nottingham Forest vs Manchester City | 1-2 | AWAY | H:9% D:16% A:76% |
| 18 | Liverpool vs Wolves | 2-1 | HOME | H:85% D:12% A:4% |
| 18 | Arsenal vs Brighton | 2-1 | HOME | H:65% D:23% A:12% |
| 18 | West Ham vs Fulham | 0-1 | AWAY | H:22% D:21% A:57% |
| 18 | Brentford vs Bournemouth | 4-1 | HOME | H:47% D:24% A:30% |

## Sample Incorrect Predictions (Last 10)

| Round | Match | Score | Predicted | Actual | Probabilities |
|-------|-------|-------|-----------|--------|---------------|
| 16 | Brentford vs Leeds | 1-1 | HOME | DRAW | H:52% D:21% A:27% |
| 16 | Manchester United vs Bournemouth | 4-4 | HOME | DRAW | H:62% D:20% A:18% |
| 17 | Newcastle vs Chelsea | 2-2 | AWAY | DRAW | H:30% D:29% A:41% |
| 17 | Bournemouth vs Burnley | 1-1 | HOME | DRAW | H:64% D:19% A:18% |
| 17 | Brighton vs Sunderland | 0-0 | HOME | DRAW | H:43% D:27% A:30% |
| 17 | Leeds vs Crystal Palace | 4-1 | AWAY | HOME | H:28% D:26% A:47% |
| 18 | Burnley vs Everton | 0-0 | AWAY | DRAW | H:28% D:28% A:44% |
| 18 | Chelsea vs Aston Villa | 1-2 | HOME | AWAY | H:39% D:26% A:35% |
| 18 | Sunderland vs Leeds | 1-1 | HOME | DRAW | H:43% D:26% A:31% |
| 18 | Crystal Palace vs Tottenham | 0-1 | HOME | AWAY | H:37% D:27% A:36% |