# CLAUDE.md — ΠροΤερο Frontend

Nuxt 3 SPA (no SSR) with Tailwind CSS, Nuxt UI v2, and a Capacitor Android wrapper. Dark-mode only. Mobile-first design with bottom nav on small screens, sidebar on desktop.

Read the root `../CLAUDE.md` before any cross-cutting work.

> **Data source: LOCAL Supabase only.** `.env` sets `SUPABASE_URL=http://127.0.0.1:54321` and is
> labelled `LOCAL ADMIN TOOL`; the cloud keys are commented out. The cloud Supabase project is
> inactive and out of scope (owner decision 2026-08-20, root CD #34) — `common/db.py` raises
> `CloudParked` and both pipelines skip their sync steps. This file previously claimed the frontend
> read "exclusively from cloud Supabase", which was wrong in both directions. Do not plan cloud
> work, dual-write, or Edge Function deploys against the parked project.

> **Open question — is this still a consumer product?** The Nuxt app was built to ship web + APK
> from one codebase (root CD #17). **Resolved 2026-08-22: this is an operator console, not a
> consumer product.** The credit/subscription/paywall/onboarding surface was removed
> (`refactor: remove the consumer scaffolding`, 2026-08-22) — see the brief at
> `docs/plans/frontend-operator-console-deepseek.md`. Capacitor's fate is documented in
> `docs/plans/capacitor-decision.md` (pending owner call). Do not re-add consumer surface.

## Closed Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **SSR disabled (`ssr: false`)** | App is SPA-only. All rendering is client-side. Nitro server handles API routes only. |
| 2 | **Nuxt UI v2 + heroicons** | Component library is `@nuxt/ui` v2. Icons come from `heroicons` set. `lucide-vue-next` is also installed but secondary. |
| 3 | ~~**Web → local Supabase, APK → cloud Supabase**~~ **SUPERSEDED 2026-08-20** | The cloud project is parked (root CD #34). Local Supabase (`127.0.0.1:54321`, all seasons) is the only backend. The APK's cloud path points at a database nothing writes to — establish which half is live before building on it. |
| 4 | **Custom JWT (HS256) + bcrypt** | Custom `users`/`sessions` tables. Web uses Nitro endpoints + httpOnly cookie. APK uses Edge Functions + Bearer JWT in localStorage. Same JWT contract (`iss:'protero'`, `role:'authenticated'`, `user_id`). Shared HS256 secret (`JWT_SECRET` on Nitro, `APP_JWT_SECRET` on Edge Functions). |
| 5 | **Dark mode only** | Color mode preference is `dark`. UI is designed exclusively for dark backgrounds. `tailwind.config.cjs` has custom dark surface/edge colors. |
| 6 | **No icons in new components** | Do not use inline `<svg>`, emoji, or symbol characters as icons in component templates. Text labels only. If an icon is truly needed, use `<UIcon>` from Nuxt UI — but prefer plain text. |
| 7 | **Schema changes go through migrations only** | Schema edits live in `supabase-local/supabase/migrations/`. Never click-edit columns in the Studio UI. (The old "apply to cloud via the Dashboard SQL Editor" step is dead — the cloud is parked.) |

## Unified Frontend Architecture (Web + APK)

Single Nuxt codebase ships two products. **The APK row is historical** — its backend is the
parked cloud project (see the banner above), so an APK built today talks to a database nothing
writes to. The Web row is the live path.

| Target | Data backend | Auth transport | Build command |
|---|---|---|---|
| **Web** (`npm run dev`) | Local Supabase `127.0.0.1:54321` | `/api/auth/*` Nitro endpoints + httpOnly cookie | `nuxi dev` / `nuxi build` |
| **APK** (`protero-release.apk`) | Cloud Supabase `twkhmatgjeiribbjxkis.supabase.co` | `/functions/v1/auth-*` Edge Functions + localStorage Bearer JWT | `CAPACITOR_BUILD=true nuxi generate && npx cap sync android && gradlew assembleRelease` |

- `useAuthEndpoint(action)` routes auth calls: returns `/api/auth/${action}` in web mode, `${supabaseUrl}/functions/v1/auth-${action}` when `runtimeConfig.public.capacitor` is true (set by the `CAPACITOR_BUILD=true` env var).
- `useSupabaseClient()` attaches the stored JWT (from `useAuthToken()` → `localStorage['protero.access_token']`) on every Supabase call via the `accessToken` callback.
- All data reads go through `useApi` composable helpers — direct Supabase queries, gated by RLS.
- Edge Function sources live in `supabase-local/supabase/functions/auth-{login,register,logout,me}/` + `_shared/{jwt.ts,util.ts}`. Not deployed — the cloud project they target is parked (CD #34).
- APK artifacts: `protero-debug.apk` (18MB) + `protero-release.apk` (17MB, signed with `android/protero-release.keystore`). Git-ignored; see `docs/plans/capacitor-decision.md`.

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
├── components/             66 components organized by domain
│   ├── admin/              6 — admin panel components
│   ├── dashboard/          12 — home page cards, calendar, stats (incl. DashboardWalletCard, DashboardToolbar)
│   ├── game/               17 — match detail views, stats, predictions
│   ├── league/             18 (incl. predictions/) — league detail tabs
│   ├── twin/               1 — entity/blind-spot layer
│   ├── wallet/             6 — roster, hero, bet rows
│   ├── ui/                 5 — shared primitives (Card, EmptyState, LoadingSpinner, etc.)
│   └── (root)              7 — Sidebar, BottomNav, etc.

├── composables/            13 — useApi, useAuth, useAuthEndpoint, useAuthToken,
│                           useSupabaseClient, useCapacitor, useSwr, useTwins,
│                           useLeagueStats, useStoiximanOcr, useStoiximanParser
├── layouts/                1 — default (sidebar + bottom nav)
├── middleware/             1 — auth (redirects to /login when unauthenticated)
├── plugins/                2 — auth.client, capacitor.client
├── types/                  1 — database.ts (Supabase schema types)
├── utils/                  9 — cache, constants, dateTime, design-tokens,
│                           formatters, season, teamLogo, wallet-meta, bet-label
│
├── server/
│   ├── api/                37 endpoints (auth, admin, game, leagues, predictions, wallet, user-real-bets, gates)
│   └── utils/              7 — supabase, cache, auth, jwt, elo, operations, wallet-models
│
├── database/migrations/    20 SQL files (schema history, not actively run)
├── supabase/functions/     Edge Function sources live in supabase-local/ (repo root)
├── public/data/            Team logos (basketball only), league logos, manifest
├── assets/css/             tailwind.css with Capacitor mobile overrides
├── tools/audit/            Playwright page-audit harness (crawl.mjs, check.mjs)
└── archive/                Old OCR components, scraping tools, 50+ legacy docs
```

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | `index.vue` (~221L) | Dashboard — toolbar (sport/wallet dropdowns), wallet card, calendar/date-bar, games, predictions, bets, sport filter |
| `/login` | `login.vue` (18L) | Login form (no layout) |
| `/leagues` | `leagues.vue` (~165L) | Grid of all leagues with game counts |
| `/league/[slug]` | `league/[slug].vue` (659L) | League detail — tabs: Overview, Analysis, Predictions |
| `/game/[id]` | `game/[id].vue` (~467L) | Game detail — timeline/stats/players (completed) or analysis/h2h/prediction (scheduled) |
| `/player/[id]` | `player/[id].vue` (~467L) | Player season page |
| `/team/[id]` | `team/[id].vue` (~225L) | Digital-twin team page |
| `/wallet` | `wallet.vue` (~308L) | Operator wallet console — roster + per-wallet performance |
| `/entities` | `entities.vue` (~321L) | Twin entity layer — clubs with no history in their division |
| `/gates` | `gates.vue` (~129L) | Pipeline health + CLI-gate status (honest, no fabricated greens) |
| `/my-real-bets` | `my-real-bets.vue` (~518L) | Operator real-money slip log (`user_real_bets`, CD #31) |
| `/account` | `account.vue` (17L) | Profile card |
| `/admin` | `admin.vue` (~531L) | Admin panel — operations, scraping, scoring, wallet management |

## Server API (37 endpoints)

| Group | Endpoints | Key routes |
|-------|-----------|------------|
| **auth/** | 5 | `login.post`, `logout.post`, `register.post`, `me.get`, `cleanup-sessions.post` |
| **admin/** | 6 | `bets.get`, `fetch-scheduled.post`, `fetch-scores.post`, `games/[id].delete/patch`, `operation-logs.get` |
| **analytics/** | 1 | `predictive-insights.post` |
| **game/** | 3 | `[id].get`, `[id]/player-props.get/post` |
| **games/** | 1 | `all.ts` |
| **gates** | 1 | `gates.get` — pipeline health + CLI-gate status |
| **h2h/** | 1 | `[homeTeam]/[awayTeam].get` |
| **leagues/** | 2 | `index.get`, `[slug].get` |
| **predictions/** | 3 | `[gameId].get`, `accuracy.get`, `bulk-regenerate.post` |
| **user-real-bets/** | 4 | `index.get/post`, `[id].patch/delete` |
| **wallet/** | 5 | `bets.get`, `list.get`, `settle-bets.post`, `stats.get`, `status.get` |
| **misc** | 4 | `parlays.get`, `player/[id]/season.get`, `seasons/[leagueKey].get`, `sports.get`, `update-match.post` |

> The credit/subscription/picks/user-bets routes were removed 2026-08-22 with the
> consumer scaffolding. `operation_logs` does not exist as a table — see `gates.get.ts`.

## Server Utils

| File | Purpose |
|------|---------|
| `supabase.ts` | **Primary DB layer.** `getSupabase()` singleton (service-role client). |
| `cache.ts` | In-memory TTL cache. `getCached(key)`, `setCache(key, data, ttl)`. |
| `auth.ts` | `getOptionalUserId()` / `requireUserId()` — dual-mode (Bearer JWT + session cookie). |
| `jwt.ts` | HS256 `signUserToken` / `verifyUserToken` (supabase-compatible, `iss:'protero'`). |
| `elo.ts` | Elo ratings. K=30, home advantage=100. |
| `operations.ts` | `logOperation()` + `getRecentOperations()` — note: `operation_logs` table does not exist. |
| `wallet-models.ts` | `WALLET_MODEL_MAP` + `pickBestPrediction()` — prediction gating. Admin passes `null` for "all models". |

## Composables

| Composable | Key exports |
|------------|------------|
| `useApi()` | **The single data layer.** All client-side Supabase queries — `fetchWallets`, `fetchWalletPerformance`, `fetchGames`, `fetchLeague`, `fetchWalletStats`, etc. Numeric wallet figures come from `get_wallet_performance` RPC only. |
| `useAuth()` | `user`, `isAuthenticated`, `isAdmin`, `login()`, `logout()`, `register()`, `checkAuth()`. Session stored as httpOnly cookie. |
| `useAuthEndpoint()` | Routes auth calls: `/api/auth/*` on web, `${supabaseUrl}/functions/v1/auth-*` when `CAPACITOR_BUILD=true`. |
| `useAuthToken()` | JWT storage in `localStorage['protero.access_token']`. |
| `useSupabaseClient()` | Supabase client with the stored JWT attached via `accessToken` callback. |
| `useLeagueStats()` | `computedStandings`, `roundStatistics`, `overallStats`. Pure computation from games array. |
| `useSwr()` | SWR cache (memory + `@capacitor/preferences` persist). |
| `useTwins()` | Entity-layer fetchers for `twin_*`. |

## Key Patterns

**Data provider pattern.** `DashboardDataProvider.vue` fetches all dashboard data and exposes it via scoped slot. Pages consume it without managing fetch logic. Wallet stats are fetched for **all users** (not just admin) — every user now sees wallet data.

**Supabase singleton.** `server/utils/supabase.ts` creates one client per Nitro lifecycle via `getSupabase()`. All API routes import from there.

**In-memory server cache.** TTL-based cache in `server/utils/cache.ts`. Used for leagues, games lists, etc. Default 5-min expiry.

**Operator-first.** The owner is the only user. No subscription gate, no credits — the operator sees everything. Optimise for information density, not onboarding.

**Mobile-first.** Capacitor wraps the SPA for Android. Safe-area CSS, bottom nav on mobile, sidebar on desktop, no-scroll-bounce, viewport-locked.

**Sport filtering (client-side).** Use `sportOf()` from `utils/constants.ts`, not ad-hoc `league_key IN [...]` checks.

**Component splitting rule.** Each component should have a single responsibility. The two former giants (`PredictionsView.vue` 1,539L, `BasketballPlayerStats.vue` 1,012L) were split 2026-08-22 into `BasketballPredictions`, `FootballMatchCard`, `PlayerSeasonModal` + slim orchestrators. Keep doing this.

## Wallet Stats

- **Never compute ROI in the client.** `get_wallet_performance(p_wallet_id)` RPC reproduces `common.wallet_significance.py` exactly (profit/turnover, parlay = one wager). `(balance − initial_balance) / initial_balance` is bankroll return — it rendered W7 as +69.7% where its ROI is +11.5%. This was the single most-bitten bug in the app.
- `fetchWalletStats` / `fetchWalletPerformance` in `useApi.ts` are the only read paths. Render `p_luck` + `verdict` beside ROI, never ROI alone.
- `GET /api/wallet/status` is dead (no caller); it reads the stale `wallets.roi`/`total_bets` columns. Do not use.

## Dashboard Component Map

| Component | Purpose |
|-----------|---------|
| `DashboardDataProvider.vue` | Data fetcher — exposes games, predictions, bets, walletStats via scoped slot |
| `DashboardToolbar.vue` | Top bar: wallet dropdown (left), sport filter dropdown (right, only when multi-sport) |
| `DashboardWalletCard.vue` | Compact wallet card — balance, ROI, W/L, win-rate bar, verdict + p(luck) |
| `GamesCalendar.vue` | Desktop calendar grid |
| `MobileDateBar.vue` | Mobile horizontal date scroller |
| `DashboardGameCard.vue` | Individual game row — O/U chips, stake badges, prediction chip |
| `DayMatchesPanel.vue` | Desktop side panel for selected day's matches |
| `EmptyStateCard.vue` | Empty state when no leagues subscribed |

## Auth Flow

1. `POST /api/auth/login` — verify email/password against `users` table (bcrypt)
2. Server creates `sessions` row with 30-day token, sets `session_id` httpOnly cookie
3. Client `useAuth().checkAuth()` calls `GET /api/auth/me` to hydrate user state
4. `auth` middleware runs on every protected route — redirects to `/login` when unauthenticated
5. Admin check: `user.role === 'admin'`

## Environment

```bash
# Required — LOCAL Supabase (the cloud project is parked, root CD #34)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_JWT_SECRET=<openssl rand -base64 32>
```

## Commands

```bash
# Development
npm install
npm run dev          # nuxi dev — http://localhost:3000

# Production build
npm run build        # nuxi build
npm run start        # nuxi preview (serves .output/)

# Mobile (Android via Capacitor)
npm run apk:generate       # CAPACITOR_BUILD=true nuxi generate (static .output/public)
npm run apk:sync           # npx cap sync android
npm run apk:open           # opens Android Studio
npm run apk:build:debug    # gradlew assembleDebug  → app-debug.apk (~18MB)
npm run apk:build:release  # gradlew assembleRelease → app-release.apk (~17MB, signed)

# Edge Functions (cloud auth for APK) — DEAD while the cloud is parked (CD #34).
# The cloud project is inactive; do not deploy. See docs/plans/capacitor-decision.md.
```

## Agent Failure Modes

**The fabricated-ROI trap (the big one).** Five sites computed `(balance − initial_balance) / initial_balance` and labelled it ROI — that is bankroll return. W7 rendered +69.7% where its ROI is +11.5%. All five are gone as of 2026-08-22; the only read path is `get_wallet_performance` RPC (profit/turnover, parlay = one wager). If you are about to divide by `initial_balance`, stop.

**The silent-failure pattern.** The league route swallowed a PostgREST error into `games: []` for months — a select referencing `home_possession` (the column is `home_possession_pct`). Fail loud: throw on `.error`, never fall through to an empty array.

**The auto-import naming trap.** `components/foo/Bar.vue` registers as `<FooBar>`, not `<Bar>`, unless the filename already starts with the folder name. This broke two pages and one modal during the 2026-08-22 session.

**The SSR assumption.** `ssr: false` — no server-side rendering. The Nitro server only serves API routes. Don't add SSR-specific features.

**The scraping deps in frontend.** `puppeteer`, `cheerio`, `jsdom`, `tesseract.js` are in `package.json` because some admin API routes do server-side scraping. NOT used in client components.

**The custom auth trap.** No Supabase Auth — custom `users`/`sessions` tables + bcrypt. Don't call `supabase.auth.*` methods.

**The archive black hole.** `archive/` has 50+ old docs and dead components. Don't reference them for current architecture.

**The icon trap.** No inline `<svg>`, no emoji, no Unicode symbol icons. Plain text, or `<UIcon>` if truly needed.

**The string-from-API trap.** Numeric fields may arrive as strings. Wrap with `Number(val)` / a `toNum()` helper before arithmetic.

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
- No references to the legacy raw-SQL DB in new code

**Needs another pass means:**
- New API route without error handling
- Component added without mobile responsiveness
- Hardcoded values that should come from DB config
- Dead imports or unused components left behind

---

## Wallet Console (operator surface, 2026-08-22)

`pages/wallet.vue` is an operator roster backed by `get_wallet_performance` — not a
discovery/subscribe flow (that was deleted). Key facts:

- **Prediction gating:** `server/utils/wallet-models.ts` — `WALLET_MODEL_MAP` (wallet → model_versions) + `pickBestPrediction()` (V6 hybrid > V18 > V20 football; V6 AIF > V5 TS > V4 RL basketball). **Admin passes `null` for "all models"** — an empty subscription set must never strip the operator's predictions (the 2026-08-22 bug).
- **Auth helpers:** `server/utils/auth.ts` — `getOptionalUserId()` / `requireUserId()` (dual-mode: Bearer JWT + session cookie).

## Standing Constraints (learned from redesign sessions)

- Never `.single()` for nullable lookups — always `.maybeSingle()`.
- Nuxt auto-imports composables/components — don't add explicit imports for app code. Nitro does NOT auto-import `utils/` in `server/` — use `import { … } from '~/utils/…'` there.
- New fetchers use `useSwr` ([composables/useSwr.ts](composables/useSwr.ts)).
- `WALLET_MODEL_MAP` (server) and `utils/wallet-meta.ts` (client) must stay in sync — adding a wallet means updating both.
- Use `python3` (never `python`) in any spawned processes/shebangs.
- Match football prediction families on **suffix**, never equality (`matchesFamily()` in `server/utils/wallet-models.ts`).

## Pending Work

| Item | Status | Notes |
|---|---|---|
| APK safe-area / notch clipping | known bug | `pt-[env(safe-area-inset-top)]` missing on top bar in `layouts/default.vue`; logo clips because `overlaysWebView: true` — only relevant if mobile is revived (see `docs/plans/capacitor-decision.md`) |
| Dashboard request budget | queued | RPC `get_dashboard_bundle(...)` — today's dashboard fires several requests |

