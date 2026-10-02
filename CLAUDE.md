# CLAUDE.md — ΠροΤερο Frontend

Nuxt 3 SPA (no SSR) with Tailwind CSS and Nuxt UI v2. Web only — Capacitor/APK was removed (2026-10-01, owner). Dark-mode only. **Desktop operator console — mobile/small-screen layouts are out of scope (owner, 2026-09-29).**

Read the root `../CLAUDE.md` before any cross-cutting work.

> **Data source: LOCAL Supabase only.** `.env` sets `SUPABASE_URL=http://127.0.0.1:54321` and is
> labelled `LOCAL ADMIN TOOL`; the cloud keys are commented out. The cloud Supabase project is
> inactive and out of scope (owner decision 2026-08-20, root CD #34) — `common/db.py` raises
> `CloudParked` and both pipelines skip their sync steps. This file previously claimed the frontend
> read "exclusively from cloud Supabase", which was wrong in both directions. Do not plan cloud
> work or dual-write against the parked project. Edge Functions run **locally only** (below) and
> are never deployed to it.

> **Open question — is this still a consumer product?** The Nuxt app was built to ship web + APK
> from one codebase (root CD #17, amended 2026-10-01: web only). **Resolved 2026-08-22: this is an operator console, not a
> consumer product.** The credit/subscription/paywall/onboarding surface was removed
> (`refactor: remove the consumer scaffolding`, 2026-08-22) — see the brief at
> `docs/plans/frontend-operator-console-deepseek.md`. Capacitor and the APK were removed
> 2026-10-01 (owner). Do not re-add consumer surface.

## Closed Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **SSR disabled (`ssr: false`)** | App is SPA-only. All rendering is client-side. Nitro server handles API routes only. |
| 2 | **Nuxt UI v2 + heroicons** | Component library is `@nuxt/ui` v2. Icons come from `heroicons` set. `lucide-vue-next` is also installed but secondary. |
| 3 | ~~**Web → local Supabase, APK → cloud Supabase**~~ **SUPERSEDED 2026-08-20; APK removed 2026-10-01** | The cloud project is parked (root CD #34). Local Supabase (`127.0.0.1:54321`, all seasons) is the only backend. |
| 4 | **Custom JWT (HS256) + bcrypt** | Custom `users`/`sessions` tables. Nitro endpoints + httpOnly cookie; the Bearer JWT is kept in localStorage for direct Supabase calls. Same JWT contract (`iss:'protero'`, `role:'authenticated'`, `user_id`). HS256 secret `JWT_SECRET` on Nitro. |
| 5 | **Dark mode only** | Color mode preference is `dark`. UI is designed exclusively for dark backgrounds. `tailwind.config.cjs` has custom dark surface/edge colors. |
| 6 | **No icons in new components** | Do not use inline `<svg>`, emoji, or symbol characters as icons in component templates. Text labels only. If an icon is truly needed, use `<UIcon>` from Nuxt UI — but prefer plain text. |
| 7 | **Schema changes go through migrations only** | Schema edits live in `supabase-local/supabase/migrations/`. Never click-edit columns in the Studio UI. (The old "apply to cloud via the Dashboard SQL Editor" step is dead — the cloud is parked.) |

## Frontend Architecture (web only)

Capacitor, the Android/iOS projects and the APK were removed 2026-10-01 (owner; root CD #17 amended).
The Supabase Edge Functions that served APK auth (`auth-*`) were removed with them.

### Who does what (#55, owner decision 2026-10-01)

| Layer | Owns |
|---|---|
| **Edge Functions** — `supabase-local/supabase/functions/` | The per-page **read bundles** and the compute behind them, read with the **caller's** JWT under RLS: `game-page`, `wallet-page` (sections `roster` / `page` / `history` / `ledger`), `league-round-board`, `dashboard`. Local only (`[edge_runtime]` in `config.toml`, served through Kong at `127.0.0.1:54321/functions/v1/*`); the cloud stays parked. |
| **Nitro** — `server/api/` | **Login** (`/api/auth/*`, unchanged), **every write** (gated by `scripts/check-endpoint-auth.mjs`), and the **job runners that spawn host processes** the Deno container cannot reach: `pipeline/run`, `props/slate/run`, `fantasy/.../generate`, and `game/[id]/correlations` (the Monte-Carlo `ml.slips.slip_sim`). |
| **Postgres** | `get_wallet_performance` as the only ROI source, the materialized views (#51), RLS. |

- A function **verifies** the HS256 token Nitro issued (`verify_jwt = true` per function); it never
  issues, refreshes or revokes one. The anon key is a signed-out caller and gets a 401
  (`_shared/serve.ts`). It builds its Supabase client **per request** from the anon key and the
  caller's `Authorization` header — there is no service-role key under `functions/`, and no write.
- **One implementation of the shared logic.** Pure TypeScript with no Deno or Node API lives in
  `supabase-local/supabase/functions/_shared/` and the frontend imports it through the **`#logic`**
  alias (`nuxt.config.ts`, `vitest.config.ts`; Vite's `server.fs.allow` includes the repo root).
  `_shared` holds the market board, football masks, cohort scoring (`wallet-stats`), prediction codes,
  `sportOf`, and the page loaders (`game-page`, `wallet-page`, `dashboard`, `league-round-board`) that
  both the functions and the browser's `useApi` call. Imports inside it carry the `.ts` extension
  (Deno requires it). A name exported there and defined again in this repo fails the honesty gate
  (`one-implementation`).
- Pages call `useEdge()` (`composables/useEdge.ts`); `useGamePage(id)` shares one `game-page` request
  between the page and the components that read a part of it. A part that failed comes back as its own
  `error` and renders `UiErrorState` — never an empty panel.
- **Request budget** (`tests/e2e/allowlist.ts`): the game page adds ≤ 3 data requests over the
  baseline, the wallet page ≤ 2 (W29 also polls the props-slate runner).

- Backend: local Supabase `127.0.0.1:54321`. Auth: `/api/auth/*` Nitro endpoints + httpOnly cookie (`useAuthEndpoint(action)` returns that path).
- `useSupabaseClient()` attaches the stored JWT (from `useAuthToken()` → `localStorage['protero.access_token']`) on every Supabase call via the `accessToken` callback.
- All data reads go through `useApi` composable helpers — direct Supabase queries, gated by RLS.

## Project Map

```
protero-frontend/
├── app.vue                 Shell: SplashScreen + NuxtLayout + NuxtPage + AppToast
├── nuxt.config.ts          Nuxt 3 config (SPA, Nuxt UI, runtime env)
├── app.config.ts           UI theme: primary=blue, gray=neutral
├── tailwind.config.cjs     Custom dark palette (surface, edge colors)
│
├── pages/                  16 routes (see Routes section)
├── components/             98 components organized by domain
│   ├── account/            1
│   ├── admin/              4 — FetchScheduledModal, MatchCard, MatchList, MatchStatsEditor
│   ├── dashboard/          8 — DashboardDataProvider/Toolbar/WalletCard/GameCard, GamesCalendar, DayMatchesPanel, EmptyStateCard, PipelineRunModal
│   ├── game/               24 — match detail views, stats, predictions, markets (MarketBoard, GamePrediction, PostMortem, GameAnalysis …)
│   ├── league/             11 — league detail tabs (LeagueOverview, LeagueRoundBoard, AnalysisView, LeagueStandingsTable …)
│   ├── ops/                6 — control-room panels (OpsFleet, OpsHealth, OpsLiveSlate, OpsExposureBar, OpsCalibration, OpsBlindSpots)
│   ├── player/             6 — player page panels
│   ├── team/ twin/         1 + 1 — team trajectory; entity/blind-spot banner
│   ├── wallet/             14 — roster, hero, breakdown, provenance, vulnerability, ledger rows, props slate
│   ├── ui/                 15 — shared primitives (PageShell, Tabs, ErrorState, SkeletonPanel, CountUp, Reveal, ProbBar, Tooltip, Card, EmptyState, StatCard …)
│   └── (root)              7 — Sidebar, BottomNav, LoginForm, AppToast, SplashScreen, PickCard, PlayerPropsUpload

├── composables/            16 — useApi, useApiFetch, useEdge, useGamePage, useAuth, useAuthEndpoint, useAuthToken,
│                           useSupabaseClient, useSwr, useTwins, usePropsSlate,
│                           useLeagueStats, useStoiximanOcr, useStoiximanParser,
│                           useCountUp (motion count-up)
├── layouts/                1 — default (sidebar + bottom nav)
├── middleware/             1 — auth (redirects to /login when unauthenticated)
├── plugins/                1 — auth.client
├── types/                  1 — database.ts (Supabase schema types)
├── utils/                  15 — cache, constants, dateTime, error-text, formatters, season, teamLogo,
│                           team-name, league-name, wallet-meta, wallet-pnl, bet-label, props-joint,
│                           viz (chart palette), motion (animation tokens)
│
├── server/
│   ├── api/                44 endpoints (auth, admin, fantasy, game, leagues, predictions, props, wallet, user-real-bets, gates …)
│   └── utils/              10 — supabase, cache, auth, jwt, elo, wallet-models, fixture-search, pipeline, props-slate, slip-sim
│
├── database/migrations/    20 SQL files (schema history, not actively run)
├── (Edge Functions)        live in ../supabase-local/supabase/functions/ — `_shared` is imported here as `#logic`
├── public/data/            Team logos (basketball only), league logos, manifest
├── assets/css/             tailwind.css
├── tools/audit/            Playwright page-audit harness (crawl.mjs, check.mjs)
└── archive/                Old OCR components, scraping tools, 50+ legacy docs
```

## Routes

| Path | Page | Purpose |
|------|------|---------|
| `/` | `index.vue` (~105L) | **Control room** — open exposure, live slate, fleet health, pipeline status, blind spots. All aggregation in the `dashboard` Edge Function. |
| `/calendar` | `calendar.vue` (~221L) | Month calendar — toolbar (sport/wallet dropdowns), wallet card, calendar/date-bar, games, predictions, bets. **This was `/` until 2026-08-22.** |
| `/login` | `login.vue` (18L) | Login form (no layout) |
| `/leagues` | `leagues.vue` (~235L) | **Competitions** — every competition in `games` (37, not the registry's 22), grouped Leagues / Cups / Not fitted, ranked by twin `level`. |
| `/league/[slug]` | `league/[slug].vue` (~900L) | **Overview / Analysis / Predictions.** Overview = the twin AND the round's fixtures in one pane (merged 2026-08-23). Season rail, one-line fixture carousel, twin-merged standings, latest picks. Predictions are gated to the newest season that has fixtures. |
| `/game/[id]` | `game/[id].vue` (~430L) | Game detail — hero + horizontal timeline band + one tabbed panel. Redesigned 2026-08-23. |
| `/player/[id]` | `player/[id].vue` (~467L) | Player season page |
| `/team/[id]` | `team/[id].vue` (~225L) | Digital-twin club page — ratings, season history, squad continuity |
| `/wallet` | `wallet/index.vue` (~125L) | **Wallet roster** — three cohorts (trader / mirrored tipsters / legacy), split fleet totals, mirrored-source provenance. Split from the combined page 2026-08-23. |
| `/wallet/[id]` | `wallet/[id].vue` (~290L) | **One wallet** — hero, equity curve, P&L breakdown (competition / market / price), bets + parlays, sibling picker |
| `/gates` | `gates.vue` (~129L) | Pipeline health + CLI-gate status (honest, no fabricated greens) |
| `/my-real-bets` | `my-real-bets.vue` (~518L) | Operator real-money slip log (`user_real_bets`, CD #31) |
| `/fantasy` | `fantasy/index.vue` | Fantasy slates and the official EuroLeague Fantasy Challenge squad |
| `/fantasy/[slateId]` | `fantasy/[slateId].vue` | One slate — lineups, entries, results |
| `/account` | `account.vue` (17L) | Profile card |
| `/admin` | `admin.vue` (~531L) | Admin panel — operations, scraping, scoring, wallet management |

## Server API (44 endpoints)

| Group | Endpoints | Key routes |
|-------|-----------|------------|
| **auth/** | 5 | `login.post`, `logout.post`, `register.post`, `me.get`, `cleanup-sessions.post` — login stays on Nitro (#55) |
| **admin/** | 4 | `fetch-scheduled.post`, `fetch-scores.post`, `games/[id].delete/patch` |
| **fantasy/** | 9 | slates, entries, `euroleague/elfc` — plus the generate / manual-pick job runners |
| **game/** | 4 | `[id]/correlations.get` (host Python), `[id]/shots.get`, `[id]/player-props.get/post` — the page bundle is the `game-page` Edge Function |
| **games/** `fixtures/` | 1 + 1 | `all.ts`; `search.get` (candidates for hand-entered slips) |
| **gates** | 1 | `gates.get` — pipeline health + CLI-gate status |
| **leagues/** | 3 | `index.get`, `[slug].get`, `overview.get` — every competition + twin + role |
| **pipeline/** `props/` | 2 + 2 | `run.post`, `runs.get`; `slate/run.post`, `slate/status.get` — the job runners that spawn host processes |
| **predictions/** | 2 | `[gameId].get`, `accuracy.get` |
| **user-real-bets/** | 4 | `index.get/post`, `[id].patch/delete` |
| **wallet/** | 2 | `bets.get`, `[id]/real-bet.post` (the wallet reads moved to the `wallet-page` Edge Function) |
| **misc** | 4 | `parlays.get`, `player/[id]/season.get`, `seasons/[leagueKey].get`, `sports.get` |

> The dashboard, game page, wallet page and league round board are Edge Functions (#55), not routes here.
> Removed as dead on 2026-10-02 (#54, no caller anywhere in the repo): `admin/bets`, `admin/operation-logs`,
> `predictions/bulk-regenerate`, `update-match`, `wallet/list`, `wallet/stats`, `wallet/status`, `game/[id].get`,
> `h2h/[homeTeam]/[awayTeam]`.

> The credit/subscription/picks/user-bets routes were removed 2026-08-22 with the
> consumer scaffolding. `operation_logs` does not exist as a table — see `gates.get.ts`.

## Server Utils

| File | Purpose |
|------|---------|
| `supabase.ts` | **Primary DB layer.** `getSupabase()` singleton (service-role client). |
| `cache.ts` | Legacy in-memory TTL cache (`getCached`/`setCache`), kept only for `wallet/bets`, `games/all`, `leagues/[slug]` and `fixture-search`. New reads use Nitro `defineCachedFunction` (see Key Patterns). |
| `auth.ts` | `getOptionalUserId()` / `requireUserId()` — dual-mode (Bearer JWT + session cookie). |
| `jwt.ts` | HS256 `signUserToken` / `verifyUserToken` (supabase-compatible, `iss:'protero'`). |
| `elo.ts` | Elo ratings. K=30, home advantage=100. |
| `wallet-models.ts` | `WALLET_MODEL_MAP` + `pickBestPrediction()` — prediction gating. Admin passes `null` for "all models". |

## Composables

| Composable | Key exports |
|------------|------------|
| `useApi()` | **The single data layer.** All client-side Supabase queries — `fetchWallets`, `fetchWalletPerformance`, `fetchGames`, `fetchLeague`, `fetchWalletStats`, etc. Numeric wallet figures come from `get_wallet_performance` RPC only. |
| `useAuth()` | `user`, `isAuthenticated`, `isAdmin`, `login()`, `logout()`, `register()`, `checkAuth()`. Session stored as httpOnly cookie. |
| `useAuthEndpoint()` | Returns `/api/auth/<action>`. |
| `useAuthToken()` | JWT storage in `localStorage['protero.access_token']`. |
| `useSupabaseClient()` | Supabase client with the stored JWT attached via `accessToken` callback. |
| `useLeagueStats()` | `computedStandings`, `roundStatistics`, `overallStats`. Pure computation from games array. |
| `useSwr()` | SWR cache (memory + localStorage persist). |
| `useTwins()` | Entity-layer fetchers for `twin_*` — incl. `fetchTwinLeague(key)` and `fetchLeagueTransitions(key)` for the league twin. |

## Key Patterns

**Data provider pattern.** `DashboardDataProvider.vue` fetches all dashboard data and exposes it via scoped slot. Pages consume it without managing fetch logic. Wallet stats are fetched for **all users** (not just admin) — every user now sees wallet data.

**Supabase singleton.** `server/utils/supabase.ts` creates one client per Nitro lifecycle via `getSupabase()`. All API routes import from there.

**Realtime (#52).** `[realtime]` is enabled locally (reached through Kong at `/realtime/v1`, no extra published port). `bets`, `parlays`, `pipeline_runs` and `phase_runs` are in the `supabase_realtime` publication; each has a SELECT policy for `authenticated` (an RLS-enabled table with zero policies delivers nothing, silently). `useRealtimeRefetch(name, sources, onChange)` re-runs a page's own read on a change — an event is a nudge, never a data source, and it does not poll: `state` is `connecting` / `live` / `offline` and the page's pill says which. The dashboard watches `bets` + `parlays`, a wallet page its own `wallet_id=eq.<id>` rows, and `PipelineRunModal` re-reads `/api/pipeline/runs` on a phase event and polls (2 s) only after an explicit `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`, labelled `polling`. Never write to `bets`/`parlays` to test it; watch a real settlement or pipeline run.

**Cached reads (#51).** Cache the *data function*, never the handler: `defineCachedFunction(fn, { name, getKey, maxAge, swr: true })` at module level, with `requireUserId` still running in the handler on every request. Used by `game/[id]/{market,preview,analysis,post-mortem}`, `dashboard` (30 s), `wallet/tipsters`, `leagues/index`, `leagues/overview` and `predictions/accuracy`. Anything keyed per user (`leagues/[slug]`) stays on `cache.ts`.

**Precomputed aggregates (#51).** `line_scores_currency()`, `line_scores_model_vs_close()` and `v_user_mirror_wallet_coverage` read from materialized views (`mv_*`) that `common.refresh_frontend_aggregates` rebuilds as the last step of the football, basketball and tipster pipelines (and after the W54 settler in `protero-settle-fast.sh`). The computation lives in the `*_live` objects; the old names are wrappers, so no consumer changed. The `mv_*` are not granted to API roles. A number that looks stale on the dashboard is a failed refresh step, not a bug in the read.

**Operator-first.** The owner is the only user. No subscription gate, no credits — the operator sees everything. Optimise for information density, not onboarding.

**Desktop only — no mobile work (owner, 2026-09-29).** Do not design, test, screenshot or audit mobile/small-screen layouts, and do not fold responsive fixes into a task. The existing bottom nav and safe-area CSS stay as they are but are not maintained.

**One screen, no scroll (owner, 2026-09-29).** It is a web app: a page — and every game tab — should read at 1920×1080 without scrolling. Lay content out in columns (Market = 4 markets in a row; Analysis = 4 cards; Prediction = 3 panels) and move explanations into tooltips instead of paragraphs. Verify by comparing `main.scrollHeight` with `clientHeight`, not by eye.

**Sport filtering (client-side).** Use `sportOf()` from `utils/constants.ts`, not ad-hoc `league_key IN [...]` checks.

**Component splitting rule.** Each component should have a single responsibility. The two former giants (`PredictionsView.vue` 1,539L, `BasketballPlayerStats.vue` 1,012L) were split 2026-08-22 into `BasketballPredictions`, `FootballMatchCard`, `PlayerSeasonModal` + slim orchestrators. Keep doing this.

## Page Contract (root #46)

Every page is built from the same few pieces, so a new page looks and moves like the game and
wallet pages without being copied from them.

1. **`UiPageShell` frames the page.** It is `fit` by default: a flex column exactly the height of
   `<main>`, no `100vh` floor, no bottom padding; the panels inside decide what scrolls. A page that
   is genuinely a long document opts out with `:fit="false"` (the player page). Every page has
   **one root element** — the route transition needs it (`node` check: all 16 pages pass).
2. **Cards are `.panel` / `.panel-head` / `.panel-title`** (`assets/css/panels.css`). No ad-hoc
   `rounded-xl bg-surface border`.
3. **A panel whose data can take over 300 ms renders `UiSkeletonPanel`, not a bare spinner;** a
   failure renders `UiErrorState`. Empty state only after a successful zero-row read. Wrap the
   loading / error / content chain in `<Transition name="swap" mode="out-in">` (`panels.css`) so
   the skeleton crossfades to the content; each branch must be ONE element, not a `<template>`.
4. **Tokens only.** No stock `blue-*`/`emerald-*`/`green-*` for a meaning that is not money (green
   = money-positive only). Colours come from `tokens.css`, `panels.css` and `utils/viz.ts`.
5. **`lang="ts"` on every SFC you touch** (the honesty gate ratchets the count down).
6. **One tab rail: `UiTabs`** (`size="md"` for a section switch, `size="sm"` for a panel head or a
   filter row). Keys are strings; a disabled tab carries a `hint`. Do not write another.
7. **Fit idiom: `.panel panel-fill` + `.panel-scroll`** (`panels.css`). A page is a flex column the
   height of `<main>`; a panel fills the cell its grid gives it and scrolls its own body, the page
   never scrolls. Explanations live in a `UiTooltip` on the panel head ("how to read"), not in a
   paragraph under the table. Tests: `npm run test:e2e` (Playwright, Bearer sign-in, 1918x989 —
   `tests/e2e/`; overflow 0, no 4xx/NaN, request budget, parity specs) — run it before and after a
   page change; `PROTERO_E2E=1 bash scripts/gates.sh` runs it as a gate. A route that cannot meet
   the bar is listed in `tests/e2e/allowlist.ts` with the ticket that will fix it; the list is empty.
8. **One market board.** `#logic/market-board` builds every market number, the status
   line (`fixtureStatus`) and the single-fixture/round payloads; the `game-page` and
   `league-round-board` Edge Functions are shells on it. Never recompute a probability, margin or
   status in a component or a second endpoint — the parity spec compares the two.

**Motion** uses the `--dur*` / `--ease-*` tokens and ships a `prefers-reduced-motion` kill switch,
without exception:

- Route: `app.pageTransition` (`.page-*` in `panels.css`), 160 ms fade + 4 px rise, out-in.
- Lists: add `class="row-in"` and `:style="rowDelay(i)"` (`utils/motion.ts`) to the rows of a list
  that reloads — entrance only, capped at 12 steps, so a filter change never waits on the old rows.
- Numbers: `UiCountUp` with `:decimals` equal to what the format shows and `:format` for money
  (`(n) => formatMoney(n)`). `decimals` rounds every frame, including the last one.
- Bars and heatmap cells fade in (opacity only — their positions and tints are data).
- Splash: cold start only, until the first page resolves, capped at 600 ms, skipped under reduced
  motion.

## Wallet Stats

- **Never compute ROI in the client.** `get_wallet_performance(p_wallet_id)` RPC reproduces `common.wallet_significance.py` exactly (profit/turnover, parlay = one wager). `(balance − initial_balance) / initial_balance` is bankroll return — it rendered W7 as +69.7% where its ROI is +11.5%. This was the single most-bitten bug in the app.
- `fetchWalletStats` / `fetchWalletPerformance` in `useApi.ts` are the only read paths. Render `p_luck` + `verdict` beside ROI, never ROI alone.
- `wallets.roi` / `total_bets` / `win_rate` are stale bankroll-return columns (the `/api/wallet/status` route that read them was deleted, #54). Never select them.

## Dashboard Component Map

`/` (the control room) is built from `components/ops/*` and one `dashboard` Edge Function call. The
`components/dashboard/*` set below belongs to `/calendar`.

| Component | Purpose |
|-----------|---------|
| `DashboardDataProvider.vue` | Data fetcher — exposes games, predictions, bets, walletStats via scoped slot |
| `DashboardToolbar.vue` | Top bar: wallet dropdown (left), sport filter dropdown (right, only when multi-sport) |
| `DashboardWalletCard.vue` | Compact wallet card — balance, ROI, W/L, win-rate bar, verdict + p(luck) |
| `GamesCalendar.vue` | Calendar grid |
| `DashboardGameCard.vue` | Individual game row — O/U chips, stake badges, prediction chip |
| `DayMatchesPanel.vue` | Side panel for the selected day's matches |
| `EmptyStateCard.vue` | Empty state when no leagues subscribed |
| `PipelineRunModal.vue` | Run-pipeline modal (live telemetry, `pipeline_runs`) |

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

# Tests — vitest, pure money/probability utils (tests/*.test.ts, no Nuxt runtime)
npm test
node ../scripts/check-frontend-honesty.mjs   # static honesty gate (also in scripts/gates.sh)
```

## Agent Failure Modes

**The fabricated-ROI trap (the big one).** Five sites computed `(balance − initial_balance) / initial_balance` and labelled it ROI — that is bankroll return. W7 rendered +69.7% where its ROI is +11.5%. All five are gone as of 2026-08-22; the only read path is `get_wallet_performance` RPC (profit/turnover, parlay = one wager). If you are about to divide by `initial_balance`, stop.

**The silent-failure pattern.** The league route swallowed a PostgREST error into `games: []` for months — a select referencing `home_possession` (the column is `home_possession_pct`). Fail loud: throw on `.error`, never fall through to an empty array.

**The silent 1,000-row cap.** PostgREST truncates a response at 1,000 rows and says nothing — no
error, no flag, just a short array. Two league-page fetchers counted what came back:
`/api/seasons/:leagueKey` reported 233 NBA games where there are 1,337 and dropped whole seasons,
and `fetchLeague` lost the last quarter of an NBA schedule. Anything that may exceed 1,000 rows must
page with `.range()`. Aggregates are disabled on this instance (`PGRST123`), and a larger `.limit()`
does not lift the cap.

**RLS enabled with zero policies reads as "no data".** `parlays` and `parlay_legs` had
`rowsecurity = t` and no policy, so PostgREST returned `[]` to the browser while `psql` and the
service-role key saw 1,383 parlays. Every parlay view in the app rendered empty and it looked like
missing data. Fixed 2026-08-23. When a table returns empty from the client but not from `psql`,
check `pg_policies` before checking the query.

**The TS cast in a non-TS SFC.** `($event.target as HTMLImageElement)` inside a template whose
`<script setup>` lacks `lang="ts"` compiles to invalid JS and takes down the **entire** Vite module
graph — every route 404s on its own source URL. Nothing points at the offending file.

**The auto-import naming trap.** `components/foo/Bar.vue` registers as `<FooBar>`, not `<Bar>`, unless the filename already starts with the folder name. This broke two pages and one modal during the 2026-08-22 session.

**The SSR assumption.** `ssr: false` — no server-side rendering. The Nitro server only serves API routes. Don't add SSR-specific features.

**The scraping deps in frontend.** `puppeteer`, `cheerio`, `jsdom`, `tesseract.js` are in `package.json` because some admin API routes do server-side scraping. NOT used in client components.

**The custom auth trap.** No Supabase Auth — custom `users`/`sessions` tables + bcrypt. Don't call `supabase.auth.*` methods.

**The archive black hole.** `archive/` has 50+ old docs and dead components. Don't reference them for current architecture.

**The icon trap.** No inline `<svg>`, no emoji, no Unicode symbol icons. Plain text, or `<UIcon>` if truly needed.

**The string-from-API trap.** Numeric fields may arrive as strings. Wrap with `Number(val)` / a `toNum()` helper before arithmetic.

## Design System

- **Theme:** Dark only. `surface` base `#14161b`, `edge` borders `#2a2f3a`
- **Primary:** `protero` — a 50–950 scale on the logo blue in `tailwind.config.cjs` (Nuxt UI `primary: 'protero'`, 2026-09-29). Not Tailwind's stock blue.
- **Brand rule:** blue = home / the model / a live process, red = away / loss / failing gate, green = money-positive only. `VIZ_HOME`/`VIZ_AWAY` are the logo pair `#4d8fff`/`#f8514f` (validated `--balanced`); the pair does NOT extend to three series. Chrome accents (sidebar active rail, tab underline) use the blue→red gradient — never a lone red, which reads as "loss".
- **Readability floor:** `text-zinc-500/600/700` are remapped in `tailwind.config.cjs` (`textColor` only — bg/border keep stock) to 5.2 / 4.1 / 3.1:1 on the panel; `--ink-mute`/`--ink-faint` mirror them. Stock zinc-600 text was 2.1:1. Don't set text below 10px.
- **Font:** Inter (Google Fonts link in `nuxt.config.ts`, system-ui fallback).
- **Gray:** Neutral (Nuxt UI `gray: 'neutral'`)
- **Icons:** `heroicons` (primary), `lucide-vue-next` (secondary)
- **Components:** Nuxt UI v2 primitives (`UButton`, `UCard`, `UTable`, `UModal`, etc.)
- **Custom tokens:** `assets/css/tokens.css` (the single palette) + `assets/css/panels.css` (panels, buttons, pills). `utils/viz.ts` for anything computed in JS.

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
- Types match current Supabase schema
- No dead imports or unused legacy code
- No references to the legacy raw-SQL DB in new code

**Needs another pass means:**
- New API route without error handling
- Hardcoded values that should come from DB config
- Dead imports or unused components left behind

---

## Wallet Console (`/wallet` + `/wallet/[id]`, split 2026-08-23)

`docs/sessions/2026-08-23-tipster-wallets-projected-wallet-console.md` has the full account. The
rules that will bite a future change:

| File | Owns |
|---|---|
| `pages/wallet/index.vue` | The roster and the split fleet header. Rows navigate; nothing expands in place. |
| `pages/wallet/[id].vue` | One wallet. Loads the WHOLE roster's performance on purpose — see multiplicity below. |
| `#logic/wallet-stats` | `cohortOf(), `scoreFamily()` (Bonferroni + Benjamini-Hochberg), and the verdict vocabulary. **The only definition of the cohort split** — the roster, the detail page and the fleet header all read it, or they will show one wallet two verdicts. |
| `components/wallet/WalletRoster.vue` | Three cohort tables, each corrected for its own k. |
| `components/wallet/WalletBreakdown.vue` | `get_wallet_breakdown` — competition / market / price. Settled singles only. |
| `components/wallet/WalletProvenance.vue` | Mirrored-source coverage. Replaced `TipsterSources.vue`, which is deleted. |

- **W33–W47 are MIRRORS, not our wallets.** They replay an external tipster's published picks at a
  flat 1.00 (`ml/tipsters/project_bets.py`, 2026-08-23). They are real `bets` rows and settle
  through the real engine, but **nobody staked that money**. Every "ours" figure — the fleet
  header here, and exposure / live slate / weekly P&L / fleet on the `dashboard` function — filters
  `archetype !== 'external_tipster'`. Pooling them reports a bankroll that does not exist.
- **Multiplicity is per cohort, and it is not optional.** 15 mirrors are scored at once; at k=11
  Bonferroni needs p<0.0045, and W44's p=0.010 renders as `dies on k`, not EDGE. The RPC returns
  the *uncorrected* p by design — the correction lives in `#logic/wallet-stats`. Never render
  `performance.verdict` raw again.
- **A mirrored ROI never travels without its coverage.** 0%–37% of a source's slips bind to a
  fixture we hold; the ROI describes those. The roster has a `Covered` column and the hero a
  Mirror block. Do not remove either.
- **The equity curve is keyed on when the wager was STRUCK**, not `settled_at`. A backfilled wallet
  settles twenty months in one run — on the old axis that was a single vertical line at today.
  `v_wallet_balance_history` was rekeyed in `20260823020000_wallet_console.sql`, which also added
  parlays to it.
- **Never compute ROI in the client.** `get_wallet_performance` and `get_wallet_breakdown` are the
  only sources. The `%` on the chart footer is bankroll return and is labelled as such.
- **Prediction gating:** `server/utils/wallet-models.ts` — `WALLET_MODEL_MAP` (wallet → model_versions) + `pickBestPrediction()` (V6 hybrid > V18 > V20 football; V6 AIF > V5 TS > V4 RL basketball). **Admin passes `null` for "all models"** — an empty subscription set must never strip the operator's predictions (the 2026-08-22 bug).
- **Auth helpers:** `server/utils/auth.ts` — `getOptionalUserId()` / `requireUserId()` (dual-mode: Bearer JWT + session cookie).

## Standing Constraints (learned from redesign sessions)

- Never `.single()` for nullable lookups — always `.maybeSingle()`.
- Nuxt auto-imports composables/components — don't add explicit imports for app code. Nitro does NOT auto-import `utils/` in `server/` — use `import { … } from '~/utils/…'` there.
- New fetchers use `useSwr` ([composables/useSwr.ts](composables/useSwr.ts)).
- `WALLET_MODEL_MAP` (server) and `utils/wallet-meta.ts` (client) must stay in sync — adding a wallet means updating both.
- Use `python3` (never `python`) in any spawned processes/shebangs.
- Match football prediction families on **suffix**, never equality (`matchesFamily()` in `server/utils/wallet-models.ts`).

## League Page (`/league/[slug]`, redesigned 2026-08-23)

`docs/sessions/2026-08-23-league-page-redesign.md` has the full account. The rules that will bite a
future change:

| Component | Owns |
|---|---|
| `LeagueOverview.vue` | The merged Overview tab. Replaced `LeagueTwin.vue`, which is deleted. |
| `LeagueSeasonBar.vue` | Season picker, round stepper, and the season rail (one segment per round, filled by that round's completion). |
| `LeagueFixtureCard.vue` | One fixture. Reads `odds_home` / `odds_draw` / `odds_away` — **not** `home_odds`. |
| `LeagueMetricCard.vue` | A fitted quantity plus its peer distribution as a strip plot. |
| `LeagueStandingsTable.vue` | Was `OverviewView.vue`. Only for competitions with **no** twin. |
| `utils/viz.ts` | The validated chart palette. Re-run its documented validator command before changing a hex. |

- **A season is "current" when it is the newest one with fixtures**, not when it equals
  `currentSeason()`. That is a calendar rule, and a cup that has not been drawn fails it.
- **Paging follows the data, not the sport.** A competition with no round numbers anywhere is paged
  by match day. Cup football has none — `bin/backfill-rounds.js` fills nothing for it.
- **`g.round || 1` is wrong.** A fixture with no round belongs to no round; it is counted and
  labelled "unmapped". Folding it into round 1 put 189 of Ligue 1's 301 fixtures in a nine-game round.
- **A `bets` row in `parlay_legs` is a LEG, not a wager.** Never derive that from the wallet's
  archetype (NULL on every legacy wallet) or from `wallet-meta.ts` (its id map stops at 20).
- **No ROI is computed on this page.** Latest picks lists wagers; aggregates live on `/wallet`,
  where they travel with `p_luck`.
- **Every rate ships with its n.** Below six completed fixtures Analysis says so in words.

## Pending Work

| Item | Status | Notes |
|---|---|---|
| (none) | — | The dashboard is one `dashboard` Edge Function call since #55. Open work lives in GitHub Issues. |

