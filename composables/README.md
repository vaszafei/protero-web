# 🎯 Composables Guide

Centralized, reusable logic for the Protero application.

**Last Updated:** January 13, 2026

---

## 📚 Active Composables

### 1. `useLeagueStats` - League statistics and standings calculator
**Purpose:** Compute standings, statistics, and performance metrics from game data

```javascript
import { useLeagueStats } from '~/composables/useLeagueStats'

const { computedStandings, roundStatistics, overallStats } = useLeagueStats(games)

// computedStandings.value - Live calculated standings
// roundStatistics.value - Statistics by round
// overallStats.value - Aggregate league statistics
```

**Features:**
- ✅ Live standings calculation (W/D/L, GF/GA, GD, Points)
- ✅ Round-by-round statistics
- ✅ Overall league statistics
- ✅ Optimized single-pass algorithm
- ✅ Automatic reactivity with Vue computed properties

# 🎯 Composables Guide

Centralized, reusable logic for the Protero application.

**Last Updated:** January 13, 2026

---

## 📚 Active Composables

### 1. `useLeagueStats` - League statistics and standings calculator
**Purpose:** Compute standings, statistics, and performance metrics from game data

```javascript
import { useLeagueStats } from '~/composables/useLeagueStats'

const { computedStandings, roundStatistics, overallStats } = useLeagueStats(games)

// computedStandings.value - Live calculated standings
// roundStatistics.value - Statistics by round
// overallStats.value - Aggregate league statistics
```

**Features:**
- ✅ Live standings calculation (W/D/L, GF/GA, GD, Points)
- ✅ Round-by-round statistics
- ✅ Overall league statistics
- ✅ Optimized single-pass algorithm
- ✅ Automatic reactivity with Vue computed properties

**Used in:** `pages/league/[slug].vue`

---

### 2. `useAuth` - Authentication utilities
**Purpose:** Handle user authentication and session management

```typescript
import { useAuth } from '~/composables/useAuth'

const { user, isAuthenticated, login, logout } = useAuth()

// Auto-imported by Nuxt
```

**Features:**
- ✅ User session management
- ✅ Authentication state
- ✅ Auto-imported by Nuxt

**Used in:** Auth middleware, protected pages

---

## 🏗️ Architecture Notes

### Why Only Two Composables?

The application has been refactored to use a **server-side data fetching** pattern with **inline computed properties** for better performance and simpler architecture.

**Previous approach (removed):**
- ❌ Multiple heavy composables (`useChartsData`, `useGlobalData`, `useLeagueData`, etc.)
- ❌ Complex client-side data fetching
- ❌ Duplicate logic across components

**Current approach:**
- ✅ Single source of truth: `pages/league/[slug].vue` fetches all data
- ✅ Computed properties for derived data
- ✅ Props passed to child components
- ✅ Only `useLeagueStats` for heavy calculations
- ✅ `useAuth` for authentication

---

## 📖 Architecture Decision

**Why only 2 composables?**

The application was refactored (Jan 2026) to simplify the data flow:

1. **Main page fetches once** - `pages/league/[slug].vue` fetches all data via API
2. **Compute inline** - Most calculations done directly in the page component
3. **Extract heavy logic** - Only `useLeagueStats` extracted for reusability
4. **Authentication** - `useAuth` handles all auth logic

This approach:
- ✅ Reduces complexity (no unnecessary abstractions)
- ✅ Better performance (fewer function calls)
- ✅ Easier debugging (all logic in one place)
- ✅ Clearer data flow (explicit props instead of shared state)

---

## 🧹 Removed Composables (January 13, 2026)

The following composables were removed as they were no longer used after refactoring:
- `useChartsData.js` - Chart calculations now done inline
- `useGlobalData.js` - Replaced with direct API calls
- `useLeagueData.js` - Replaced with useFetch in pages
- `useMatchUtils.js` - Functions moved inline
- `usePredictions.js` - Replaced by server-side predictions API
- `useStandingsCalculator.js` - Merged into useLeagueStats

---

## 🏗️ Architecture Notes

**Current Pattern (Simplified):**
- Pages fetch data via `useFetch` from API endpoints
- `useLeagueStats` computes standings and statistics
- `useAuth` handles authentication
- Everything else computed inline in components

**Why the cleanup?**
The previous architecture had 6 composables handling data fetching, caching, and calculations. This was refactored to:
1. Use Nuxt's built-in `useFetch` for data loading
2. Compute everything inline in `pages/league/[slug].vue`
3. Keep only `useLeagueStats` for the heavy lifting
4. Remove ~1,300 lines of unused abstraction code

---

## 🏗️ Architecture Notes

**Current Approach (2026):**
- Main page (`pages/league/[slug].vue`) fetches data via `useFetch`
- All calculations done inline with computed properties
- Only `useLeagueStats` extracted for reusability
- Simple, direct, and performant

**Previous Architecture (Pre-Jan 2026):**
- Had 6+ composables handling data fetching and caching
- Split logic across multiple files
- More complex but less maintainable
- **All deprecated composables removed January 13, 2026**

---

## 🏗️ Architecture Notes

### Why Only Two Composables?

The current architecture favors **simplicity and directness**:

1. **Data fetching** is handled by `useFetch()` directly in pages
2. **Calculations** are done inline in computed properties
3. **Shared logic** is extracted only when needed (`useLeagueStats`)

This approach:
- ✅ Reduces indirection and complexity
- ✅ Makes data flow more explicit
- ✅ Easier to debug and maintain
- ✅ Better TypeScript inference
- ✅ Less abstraction overhead

### When to Create a New Composable

Only create a new composable when:
1. **Logic is reused** across 3+ components
2. **Complexity is high** (>100 lines of logic)
3. **Testing isolation** is needed
4. **State sharing** is required across unrelated components

---

## 🔄 Migration Notes

**January 13, 2026 Cleanup:**
- ❌ Removed `useChartsData.js` - Calculations moved inline to pages
- ❌ Removed `useGlobalData.js` - Using direct API calls instead
- ❌ Removed `useLeagueData.js` - Replaced by useFetch in pages
- ❌ Removed `useMatchUtils.js` - Logic moved inline
- ❌ Removed `usePredictions.js` - Logic moved to server/utils
- ❌ Removed `useStandingsCalculator.js` - Merged into useLeagueStats
- ✅ Kept `useLeagueStats.js` - Active and heavily used
- ✅ Kept `useAuth.ts` - Authentication composable

**Reason:** Simplified architecture - all calculations now happen in the main league page with only `useLeagueStats` for complex computations. This reduces indirection and makes the code easier to follow.

---

## 🏗️ Architecture Decision

The app has migrated from a highly modular composable-based architecture to a **single-page computation model**:

- **Old approach:** Multiple composables (`useChartsData`, `useGlobalData`, `useLeagueData`, etc.) with complex dependencies
- **New approach:** All data fetched via `useFetch` API calls, computations done inline in `pages/league/[slug].vue`
- **Kept:** Only `useLeagueStats` for complex standings calculations and `useAuth` for authentication

**Benefits:**
- Simpler data flow
- Easier debugging
- Better TypeScript support
- Less abstraction overhead
- Single source of truth in main page component

---

## 🏗️ Architecture Notes

**Current Pattern (2026):**
- Main league page fetches raw data from API
- Computes all derived data using `useLeagueStats`
- Passes computed data to child components via props
- No intermediate data layers or caching composables

**Why the change:**
- Simpler mental model (data flows down, events up)
- Better performance (single source of truth)
- Easier debugging (all logic in one place)
- Nuxt's built-in caching handles API responses

---

## 🔄 Migration Notes

**Removed Composables (Jan 13, 2026):**
- ❌ `useChartsData.js` - Chart calculations moved inline
- ❌ `useGlobalData.js` - Data now fetched directly in components
- ❌ `useLeagueData.js` - Replaced by direct API calls with `useFetch`
- ❌ `useMatchUtils.js` - Utilities moved inline or to components
- ❌ `usePredictions.js` - Prediction logic in server-side utilities
- ❌ `useStandingsCalculator.js` - Merged into `useLeagueStats`

**If you need these features:**
- See `pages/league/[slug].vue` for current implementation patterns
- Check `server/utils/predictions.ts` for server-side utilities
const logoUrl = await getTeamLogo('Arsenal')

// Get league info by slug
const leagueInfo = await getLeagueInfo('premier_league')
```

**Features:**
- ✅ Global state caching (shared across app)
- ✅ Logo lookup with fuzzy matching
- ✅ League info retrieval
- ✅ Cache invalidation

**Use in:** Headers, sidebars, team displays

---

### 3. `useLeagueStats` - Statistics calculations
**Purpose:** Compute standings and statistics from match data

```javascript
import { useLeagueStats } from '~/composables/useLeagueStats'

const games = computed(() => data.value?.games || [])
const { computedStandings, roundStatistics, overallStats } = useLeagueStats(games)

// computedStandings.value - Calculated league table
// roundStatistics.value - Stats by round
// overallStats.value - Aggregate statistics
```

**Features:**
- ✅ Auto-computed standings (live updates)
- ✅ Home/away splits
- ✅ Form calculations (last 5 games)
- ✅ Over/under statistics
- ✅ Round-by-round analysis

**Use in:** Standings views, statistics pages

---

### 4. `useMatchUtils` - Match data utilities
**Purpose:** Common functions for working with matches

```javascript
import { useMatchUtils } from '~/composables/useMatchUtils'

const {
  getFirstUnplayedRound,
  getGamesByRound,
  getUpcomingGames,
  formatScore,
  hasOdds,
  getOverUnder
} = useMatchUtils()

// Find next round to play
const nextRound = getFirstUnplayedRound(games)

// Get matches for round 16
const round16 = getGamesByRound(games, 16)

// Format score: "2-1" or "vs"
const score = formatScore(match)

// Check if over 2.5 goals
const result = getOverUnder(match, 2.5) // 'over' | 'under'
```

**Available Functions:**
- `getFirstUnplayedRound(games)` - Find next unplayed round
- `getMaxRound(games)` - Get highest round number
- `getGamesByRound(games, round)` - Filter by round
- `getUpcomingGames(games)` - Unplayed matches
- `getPlayedGames(games)` - Finished matches
- `getOverUnder(game, threshold)` - Check O/U
- `getMatchResult(game)` - 'W' | 'D' | 'L'
- `formatScore(game)` - Display score
- `hasOdds(game)` - Check odds availability
- `sortByDate(games)` - Sort chronologically
- `groupByRound(games)` - Group by round

**Use in:** All components working with matches

---

### 5. `usePredictions` - Betting calculations
**Purpose:** Predictions, EV, Kelly Criterion, parlays

```javascript
import { usePredictions } from '~/composables/usePredictions'

const {
  calculateEV,
  calculateKelly,
  calculateEdge,
  hasValue,
  buildParlay,
  getBetRecommendation
} = usePredictions()

// Check if bet has value
if (hasValue(65, 1.85, 2)) {
  // Model: 65%, Odds: 1.85, Min edge: 2%
  const ev = calculateEV(65, 1.85)
  const kelly = calculateKelly(65, 1.85)
  console.log(`EV: ${ev}, Kelly: ${kelly}%`)
}

// Build parlay
const parlay = buildParlay([
  { probability: 70, odds: 1.50 },
  { probability: 65, odds: 1.80 },
  { probability: 60, odds: 2.00 }
])
// Returns: { totalOdds, winProbability, expectedValue, kellyStake }
```

**Available Functions:**

**Probability:**
- `getImpliedProbability(odds)` - Convert odds to probability
- `calculateEdge(modelProb, odds)` - Edge over market
- `hasValue(modelProb, odds, minEdge)` - Value bet check

**Betting:**
- `calculateEV(probability, odds)` - Expected value
- `calculateKelly(prob, odds, fraction, max)` - Kelly stake
- `getBetRecommendation(prob, odds)` - Full recommendation

**Parlays:**
- `calculateParlayOdds(oddsArray)` - Combined odds
- `calculateParlayProbability(probabilities)` - Combined probability
- `buildParlay(picks)` - Complete parlay object

**Formatting:**
- `formatProbability(prob)` - "65.5%"
- `formatOdds(odds)` - "1.85"
- `formatEV(ev)` - "+0.123"

**Use in:** Predictions view, parlay generator

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Pages/Components                                       │
│  ├─ league/[slug].vue                                   │
│  ├─ index.vue                                           │
│  └─ components/                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ import composables
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Composables Layer                                      │
│  ├─ useLeagueData() ─────> JSON files (cached)         │
│  ├─ useGlobalData() ─────> Manifest, logos (cached)    │
│  ├─ useLeagueStats() ────> Computed from games          │
│  ├─ useMatchUtils() ─────> Pure functions               │
│  └─ usePredictions() ────> Pure calculations            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ fetch/compute
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Data Sources                                           │
│  ├─ public/data/leagues/*.json                          │
│  ├─ public/data/manifest.json                           │
│  ├─ public/data/logo_map.json                           │
│  └─ public/data/team_names.json                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📖 Usage Examples

### Example 1: League Page (Simplified)

**Before:**
```vue
<script setup>
const route = useRoute()
const { data } = await useFetch(`/data/leagues/${route.params.slug}.json`)

// Duplicate logic in every component
const maxRound = computed(() => {
  if (!data.value?.games) return 6
  return Math.max(...data.value.games.map(g => g.round || 1))
})

const roundGames = computed(() => {
  if (!data.value?.games) return []
  return data.value.games.filter(g => g.round === selectedRound.value)
})
</script>
```

**After:**
```vue
<script setup>
const route = useRoute()
const { data, loading } = useLeagueData(route.params.slug)
const { getMaxRound, getGamesByRound } = useMatchUtils()

const maxRound = computed(() => getMaxRound(data.value?.games))
const roundGames = computed(() => getGamesByRound(data.value?.games, selectedRound.value))
</script>
```

---

### Example 2: Predictions Component

**Before:**
```vue
<script setup>
// Scattered calculation logic
const calculateEV = (prob, odds) => {
  return (prob / 100 * odds) - 1
}

const calculateKelly = (prob, odds) => {
  // Duplicate Kelly formula everywhere
  const p = prob / 100
  const q = 1 - p
  const b = odds - 1
  return ((b * p - q) / b) * 0.25 * 100
}
</script>
```

**After:**
```vue
<script setup>
import { usePredictions } from '~/composables/usePredictions'

const { calculateEV, calculateKelly, formatEV } = usePredictions()

// Clean, reusable, tested
const ev = calculateEV(probability, odds)
const kelly = calculateKelly(probability, odds)
</script>
```

---

### Example 3: Sidebar Navigation

**Before:**
```vue
<script setup>
onMounted(async () => {
  const { data } = await useFetch('/data/manifest.json')
  leagues.value = data.value
  
  // Load logo for each league manually
  for (let league of leagues.value) {
    // Fetch logo map...
    // Match logic...
  }
})
</script>
```

**After:**
```vue
<script setup>
import { useGlobalData } from '~/composables/useGlobalData'

const { fetchManifest, getTeamLogo } = useGlobalData()

onMounted(async () => {
  leagues.value = await fetchManifest()
  
  // Logos cached and ready
  const logo = await getTeamLogo(teamName)
})
</script>
```

---

## ✨ Benefits

### 1. **Code Reusability**
- Write once, use everywhere
- No duplicate logic
- Consistent behavior

### 2. **Maintainability**
- Single source of truth
- Easy to update
- Clear organization

### 3. **Performance**
- Built-in caching
- Avoid re-fetching
- Shared state

### 4. **Testing**
- Pure functions
- Easy to unit test
- Isolated logic

### 5. **Type Safety** (future)
- Can add TypeScript
- Better IDE support
- Fewer bugs

---

## 🎯 Best Practices

### 1. **Import only what you need**
```javascript
// ✅ Good
const { getMaxRound, formatScore } = useMatchUtils()

// ❌ Avoid (unless using everything)
const matchUtils = useMatchUtils()
```

### 2. **Use reactive data**
```javascript
// ✅ Good
const games = computed(() => data.value?.games || [])
const maxRound = computed(() => getMaxRound(games.value))

// ❌ Avoid (not reactive)
const maxRound = getMaxRound(data.value.games)
```

### 3. **Cache global data**
```javascript
// ✅ Good - fetches once, cached globally
const { fetchManifest } = useGlobalData()
const manifest = await fetchManifest()

// ❌ Avoid - re-fetches every time
const { data } = await useFetch('/data/manifest.json')
```

### 4. **Handle loading states**
```javascript
// ✅ Good
const { data, loading, error } = useLeagueData(slug)

if (loading.value) return 'Loading...'
if (error.value) return 'Error!'

// ❌ Avoid - no loading feedback
const { data } = useLeagueData(slug)
```

---

## 📝 Migration Checklist

To migrate existing components to use composables:

- [ ] Replace inline data fetching with `useLeagueData()`
- [ ] Replace manifest fetches with `useGlobalData()`
- [ ] Replace duplicate match filtering with `useMatchUtils()`
- [ ] Replace inline calculations with `usePredictions()`
- [ ] Use `useLeagueStats()` instead of manual standings computation
- [ ] Remove duplicate helper functions
- [ ] Test reactivity (use `computed()` for derived values)
- [ ] Update imports

---

## 🔮 Future Enhancements

1. **TypeScript migration** - Add types for better DX
2. **Error boundaries** - Better error handling
3. **Offline support** - Service worker integration
4. **Real-time updates** - WebSocket composable
5. **Analytics** - Track usage patterns

---

**Last Updated:** December 19, 2025  
**Composables Count:** 5  
**Total Functions:** 50+
