# CLAUDE.md — ΠροΤερο Frontend

Nuxt 3 SPA (no SSR) with Tailwind CSS, Nuxt UI v2, Supabase cloud backend, and Capacitor Android wrapper. Dark-mode only. Mobile-first design with bottom nav on small screens, sidebar on desktop.

Read the root `../CLAUDE.md` before any cross-cutting work. The frontend reads exclusively from **cloud Supabase** — it never touches local Supabase or SQLite.

## Closed Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **SSR disabled (`ssr: false`)** | App is SPA-only. All rendering is client-side. Nitro server handles API routes only. |
| 2 | **Nuxt UI v2 + heroicons** | Component library is `@nuxt/ui` v2. Icons come from `heroicons` set. `lucide-vue-next` is also installed but secondary. |
| 3 | **Cloud Supabase only** | Frontend connects to `twkhmatgjeiribbjxkis.supabase.co`. Local Supabase is for ML/scraping. |
| 4 | **Custom auth, not Supabase Auth** | Auth uses custom `users`/`sessions` tables with bcrypt + JWT cookies. Not Supabase's built-in auth. |
| 5 | **Dark mode only** | Color mode preference is `dark`. UI is designed exclusively for dark backgrounds. `tailwind.config.cjs` has custom dark surface/edge colors. |
| 6 | **No icons in new components** | Do not use inline `<svg>`, emoji, or symbol characters as icons in component templates. Text labels only. If an icon is truly needed, use `<UIcon>` from Nuxt UI — but prefer plain text. |

## Project Map

```
protero-frontend/
├── app.vue                 Shell: SplashScreen + NuxtLayout + NuxtPage + AppToast
├── nuxt.config.ts          Nuxt 3 config (SPA, Nuxt UI, runtime env)
├── app.config.ts           UI theme: primary=blue, gray=neutral
├── tailwind.config.cjs     Custom dark palette (surface, edge colors)
├── capacitor.config.json   Android app: com.protero.app
│
├── pages/                  13 routes (see Routes section)
├── components/             48 components organized by domain
│   ├── admin/              9 — admin panel components
│   ├── dashboard/          13 — home page cards, calendar, stats (incl. DashboardWalletCard, DashboardToolbar)
│   ├── game/               14 — match detail views, stats, predictions
│   ├── league/             11 + predictions/6 — league detail tabs
│   └── ui/                 5 — shared primitives (Card, EmptyState, LoadingSpinner, etc.)
│
├── composables/            3 — useAuth, useCredits, useLeagueStats
├── layouts/                1 — default (sidebar + bottom nav)
├── middleware/             1 — auth (login + onboarding redirect)
├── plugins/                2 — auth.client, capacitor.client
├── types/                  1 — database.ts (630 lines, Supabase schema types)
├── utils/                  1 — design-tokens.ts (colors, spacing, typography)
│
├── server/
│   ├── api/                57 endpoints (auth, admin, games, predictions, user, wallet, credits)
│   └── utils/              5 — supabase, cache, credits, elo, operations
│
├── database/migrations/    20 SQL files (schema history, not actively run)
├── supabase/functions/     3 edge functions (fetch-games, league-stats, trigger-scraper)
├── public/data/            Team logos (NBA SVGs, EuroLeague WebPs), league logos, manifest
├── assets/css/             tailwind.css with Capacitor mobile overrides
└── archive/                Old OCR components, scraping tools, 50+ legacy docs
```

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | `index.vue` (~210L) | Dashboard — toolbar (sport/wallet dropdowns), wallet card, calendar/date-bar, games, predictions, bets, sport filter |
| `/login` | `login.vue` (19L) | Login form (no layout) |
| `/leagues` | `leagues.vue` (125L) | Grid of all leagues with game counts |
| `/league/[slug]` | `league/[slug].vue` (1082L) | **Largest page** — tabs: Overview, Analysis, Predictions, Rounds |
| `/game/[id]` | `game/[id].vue` (347L) | Game detail — timeline/stats/players (completed) or analysis/h2h/prediction (scheduled) |
| `/picks` | `picks.vue` (185L) | Admin picks for subscribed leagues |
| `/my-bets` | `my-bets.vue` (291L) | User's personal bet tracker |
| `/credits` | `credits.vue` (120L) | Credits balance, unlocks, transactions |
| `/contribute` | `contribute.vue` (307L) | Earn credits by submitting match data |
| `/onboarding` | `onboarding.vue` (501L) | Multi-step wizard: profile → sports → leagues → wallet |
| `/preferences` | `preferences.vue` (54L) | League preferences editor |
| `/account` | `account.vue` (144L) | Account info + quick actions |
| `/admin` | `admin.vue` (561L) | Admin panel — operations, scraping, scoring, wallet management |

## Server API (59 endpoints)

| Group | Endpoints | Key routes |
|-------|-----------|------------|
| **auth/** | 5 | `login.post`, `logout.post`, `register.post`, `me.get`, `cleanup-sessions.post` |
| **admin/** | 13 | `fetch-scheduled.post`, `fetch-scores.post`, `generate-predictions-batch.post`, `init-wallet.post`, `scrape-bulk.post`, `system-status.get` |
| **analytics/** | 2 | `correlations.post`, `predictive-insights.post` |
| **credits/** | 4 | `config.get`, `leagues.get`, `tasks.get`, `tasks/contribute.post` |
| **game/** | 1 | `[id].get` |
| **games/** | 1 | `all.ts` |
| **h2h/** | 1 | `[homeTeam]/[awayTeam].get` |
| **leagues/** | 2 | `index.get`, `[slug].get` |
| **predictions/** | 6 | `[gameId].get`, `accuracy.get`, `league/[key].get`, `round/[round].get`, `validate.post`, `bulk-regenerate.post` |
| **user/** | 10+ | `bets.get/post`, `credits.get`, `credits/unlock-league.post`, `picks.get`, `onboarding.post`, `subscriptions.get/post` |
| **wallet/** | 6 | `auto-place-bets.post`, `auto-place-v2-bets.post`, `place-bet.post`, `settle-bets.post`, `stats.get`, `status.get` |

## Server Utils

| File | Purpose |
|------|---------|
| `supabase.ts` (372L) | **Primary DB layer.** `getSupabase()` singleton, `executeQuery()`, `getGamesWithTeams()`, `getPredictionsWithGames()`, `getWalletWithStats()`, `upsertPrediction()`, `placeBet()`, `settleBet()` |
| `cache.ts` | In-memory TTL cache. `getCached(key)`, `setCache(key, data, ttl)`. Auto-cleanup every 5 min. |
| `credits.ts` | Credits economy. `getCreditsConfig()`, `awardCredits()`, `spendCredits()`, `initializeUserCredits()`, `getAuthenticatedUserId()` |
| `elo.ts` | Elo ratings. K=30, home advantage=100. `updateEloRatings()`, `predictByElo()`, `getEloAnalysis()` |
| `operations.ts` | `logOperation()` + `getRecentOperations()` — writes to `operation_logs` table |

## Composables

| Composable | Key exports |
|------------|------------|
| `useAuth()` | `user`, `isAuthenticated`, `isAdmin`, `login()`, `logout()`, `register()`, `checkAuth()`, `completeOnboarding()`. Session stored as httpOnly cookie. |
| `useCredits()` | `credits`, `transactions`, `activeUnlocks`, `fetchCredits()`, `isLeagueAccessible()`, `unlockLeague()` |
| `useLeagueStats()` | `computedStandings`, `roundStatistics`, `overallStats`. Pure computation from games array (299L). |

## Key Patterns

**Data provider pattern.** `DashboardDataProvider.vue` fetches all dashboard data and exposes it via scoped slot. Pages consume it without managing fetch logic. Wallet stats are fetched for **all users** (not just admin) — every user now sees wallet data.

**Supabase singleton.** `server/utils/supabase.ts` creates one client per Nitro lifecycle via `getSupabase()`. All API routes import from there.

**In-memory server cache.** TTL-based cache in `server/utils/cache.ts`. Used for leagues, games lists, etc. Default 5-min expiry.

**Credits economy.** Users earn credits by contributing match data → spend credits to unlock league predictions. Config stored in `credits_config` DB table.

**Dual bet system.** Admin wallet auto-places bets from ML predictions (`auto-place-bets.post`). Users can either follow admin picks or track their own bets.

**Mobile-first.** Capacitor wraps the SPA for Android. Safe-area CSS, bottom nav on mobile, sidebar on desktop, no-scroll-bounce, viewport-locked.

**Sport filtering (client-side).** `games/all.ts` has no sport filter. Use the `capturedGames` + `selectedSport` pattern in `pages/index.vue` — games are captured from the slot into a reactive ref, then `filteredGames` computed filters by sport. Sport is detected via `game.sport` field or derived: `league_key IN ['nba', 'euroleague'] → 'basketball'`, everything else → `'football'`.

**Component splitting rule.** Pages over 200 lines should be split into domain components. Each component should have a single responsibility. Session refactors should look for repeated template blocks and extract them. Examples: `DashboardWalletCard.vue` (wallet mini-card), `DashboardToolbar.vue` (sport + wallet dropdowns). Do this continuously; it is not optional.

## Wallet Stats

- **Working endpoint:** `GET /api/wallet/stats` — uses Supabase query builder, hardcoded wallet ID 2. Returns:
  ```ts
  {
    wallet: { id, balance, initial_balance, season },
    stats: { totalBets, settledBets, wonBets, lostBets, pendingBets, totalStaked, totalProfit, roi, winRate, currentBalance }
  }
  ```
- **Broken endpoint:** `GET /api/wallet/status` — uses `.execute()` Turso pattern. **Do not use.**
- **Display components:** `DashboardWalletCard.vue` (compact horizontal card above calendar) and `DashboardToolbar.vue` (wallet dropdown button on left).

## Dashboard Component Map

| Component | Purpose |
|-----------|---------|
| `DashboardDataProvider.vue` | Data fetcher — exposes games, predictions, bets, walletStats via scoped slot |
| `DashboardToolbar.vue` | Top bar: wallet dropdown (left), sport filter dropdown (right, only when multi-sport) |
| `DashboardWalletCard.vue` | Compact wallet card showing balance, ROI, W/L, win-rate bar |
| `StatsOverview.vue` | Admin stats panels (predictions, accuracy, parlays) |
| `GamesCalendar.vue` | Desktop calendar grid |
| `MobileDateBar.vue` | Mobile horizontal date scroller |
| `DashboardGameCard.vue` | Individual game row — O/U chips, stake badges, prediction chip |
| `DayMatchesPanel.vue` | Desktop side panel for selected day's matches |
| `EmptyStateCard.vue` | Empty state when no leagues subscribed |

## Auth Flow

1. `POST /api/auth/login` — verify email/password against `users` table (bcrypt, auto-upgrades legacy SHA256)
2. Server creates `sessions` row with 30-day token, sets `session_id` httpOnly cookie
3. Client `useAuth().checkAuth()` calls `GET /api/auth/me` to hydrate user state
4. `auth` middleware runs on every protected route — redirects to `/login` or `/onboarding`
5. Admin check: `user.role === 'admin'`

## Environment

```bash
# Required
SUPABASE_URL=https://twkhmatgjeiribbjxkis.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
ADMIN_PASSWORD=<admin panel password>
JWT_SECRET=<openssl rand -base64 32>
```

## Commands

```bash
# Development
npm install
npm run dev          # nuxi dev — http://localhost:3000

# Production build
npm run build        # nuxi build
npm run start        # nuxi preview (serves .output/)

# Mobile (Android)
npm run mobile:build  # nuxi generate + cap sync
npm run mobile:open   # opens Android Studio
npm run mobile:run    # deploy to device/emulator
```

## Agent Failure Modes

**The `.execute()` trap.** ~20 API routes (wallet/*, predictions/round, admin/recalculate-standings, admin/scrape-bulk, admin/scrape-complete, admin/fix-match-statuses, user/leagues, analytics/correlations) call `getSupabase().execute({sql:..., args:...})` — a Turso-style SQL API. But `getSupabase()` returns a `SupabaseClient` which has NO `.execute()` method. These routes are **broken at runtime**. They need to be rewritten to use the Supabase query builder (`.from().select()`, `.from().insert()`, etc.). This is a known tech debt item.

**The SSR assumption.** `ssr: false` means there is no server-side rendering. Pages are client-rendered SPAs. The Nitro server only serves API routes under `server/api/`. Don't add SSR-specific features (server components, `useAsyncData` with server-only logic, etc.).

**The scraping deps in frontend.** `puppeteer`, `cheerio`, `jsdom`, `tesseract.js` are in `package.json` because some admin API routes do server-side scraping. These are NOT used in client components. If `npm install` fails on puppeteer/chromium, it's a system dependency issue, not a frontend bug.

**The 1082-line league page.** `pages/league/[slug].vue` is the largest and most complex page. It has 4 tabs (Overview, Analysis, Predictions, Rounds) each with substantial logic. When modifying league features, changes often touch both this page and multiple `components/league/` files. Read the whole page before editing.

**The custom auth trap.** This app does NOT use Supabase Auth. It has custom `users`/`sessions` tables and bcrypt password hashing. Don't try to integrate `@supabase/auth-helpers-nuxt` or call `supabase.auth.*` methods — they won't work.

**The archive black hole.** `archive/` has 50+ old docs and dead components from the Turso/OCR era. Don't reference these for current architecture. They document abandoned approaches.

**The icon trap.** Do not use inline `<svg>` icons, emoji (💰 🏀 ⚽), or Unicode symbols (▼ ✓) as icons in component templates. Use plain text labels only. If an icon is truly needed, use `<UIcon name="..." />` from Nuxt UI. This rule came from multiple crashes caused by inline SVGs and user preference against emoji in UI.

**The string-from-API trap.** API endpoints may return numeric fields as strings (e.g. `roi: "12.5"` instead of `roi: 12.5`). Always wrap with `Number(val)` before calling `.toFixed()`, comparison operators, or arithmetic. Use a `toNum()` helper: `function toNum(val: any): number { const n = Number(val); return isNaN(n) ? 0 : n }`.

## Design System

- **Theme:** Dark only. `surface` base `#14161b`, `edge` borders `#2a2f3a`
- **Primary:** Blue (Nuxt UI `primary: 'blue'`)
- **Gray:** Neutral (Nuxt UI `gray: 'neutral'`)
- **Icons:** `heroicons` (primary), `lucide-vue-next` (secondary)
- **Components:** Nuxt UI v2 primitives (`UButton`, `UCard`, `UTable`, `UModal`, etc.)
- **Custom tokens:** `utils/design-tokens.ts` — colors, spacing, typography, shadows

## Database Types

`types/database.ts` (630 lines) defines the full Supabase schema as TypeScript types:
- **Tables:** `teams`, `games`, `lineups`, `model_versions`, `predictions`, `wallets`, `bets`, `strategy_performance`, `users`, `sessions`
- **Views:** `v_active_predictions`, `v_model_comparison`, `v_wallet_performance`, `v_recent_bets`
- **Functions:** `execute_sql`, `execute_transaction`

When schema changes happen in Supabase, update this file to keep types in sync.

## Quality Bar

**Done means:**
- Page renders without console errors in dev
- API routes return proper error responses (not 500s with stack traces)
- Mobile layout tested (responsive, no overflow, safe areas respected)
- Types match current Supabase schema
- No dead imports or unused legacy code
- No references to Turso/legacy DB in new code

**Needs another pass means:**
- New API route without error handling
- Component added without mobile responsiveness
- Hardcoded values that should come from DB config
- Dead imports or unused components left behind
