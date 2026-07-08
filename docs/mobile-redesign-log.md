# Mobile-First Redesign — Session Log (moved from CLAUDE.md, Jul 2026)

> Historical record of the Apr 23–24 2026 mobile redesign phases and the May 2 2026 parlay-toggle fix. The living rules extracted from these sessions are in ../CLAUDE.md. Architecture details here (RPC contracts, component inventories) are accurate as of the dates noted.

## Mobile-First Redesign — Session Log (Apr 23-24 2026)

Goal: turn the Capacitor APK into a polished, native-feeling app while keeping web parity. Single Nuxt codebase, no `/m/*` fork; mobile divergence via responsive Tailwind + `useCapacitor()` platform checks.

### Phase 0 — Foundation (DONE)

**0.1 Bottom nav** — `BottomNav.vue` rendered in `layouts/default.vue` under mobile viewport (`lg:hidden`). `<main>` gets `pb-16 lg:pb-0`. Top bar gets `env(safe-area-inset-top)` padding (status bar overlaps logo on notch devices because `capacitor.config.json` has `overlaysWebView: true`).

**0.2 Caching layer** — three-layer SWR cache:
- [utils/cache.ts](utils/cache.ts): `getMem/setMem/getPersist/setPersist/invalidate/dedupFetch/__cacheSize`. Memory `Map` + lazy `@capacitor/preferences` import (falls back to `localStorage`). `PERSIST_PREFIX = 'protero.cache.'`. Wildcard invalidation via `invalidate('foo:*')`.
- [composables/useSwr.ts](composables/useSwr.ts): `useSwr<T>(key, fetcher, opts)` returns `{data, pending, error, stale, refresh, invalidate, load}`. Default `memoryTtl=60_000`, `persistTtl=0`. Reads cache first; revalidates only on miss/refresh. In-flight promise dedup map.
- TTL policy lives per-call (no global table). Examples: `fetchSports` 30 min mem + 24h persist; `fetchGames` 2 min mem; `fetchWalletStats` 1 min mem.

**0.4 Capacitor native plugins** — installed `@capacitor/haptics@^6.0.2` and `@capacitor/preferences@^6.0.3`.
- [composables/useCapacitor.ts](composables/useCapacitor.ts): `{isNative, haptic, setStatusBar, hideSplash, onBackButton, onResume}`. All native plugins dynamically imported with try/catch — web-safe no-ops.
- [plugins/capacitor.client.ts](plugins/capacitor.client.ts): boot wiring. Status bar `#14161b` dark style. Splash hides after `requestAnimationFrame`. Hardware back chain: dispatches `protero:back-pressed` (cancelable) → `router.back()` if history → `App.exitApp()`. Resume hook emits `protero:resume`.
- [capacitor.config.json](capacitor.config.json): SplashScreen `launchShowDuration: 0, launchAutoHide: false, backgroundColor: '#14161b'`. StatusBar `style: dark, backgroundColor: '#14161b', overlaysWebView: true`.

### Phase 3 — Wallet Subscription Redesign (DONE)

The wallet page is now a full subscription marketplace. Users pay credits to subscribe to AI strategy wallets and follow their picks for a fixed duration.

**Migration: [supabase-local/supabase/migrations/20260423000004_wallet_subscriptions_credits.sql](../supabase-local/supabase/migrations/20260423000004_wallet_subscriptions_credits.sql)** — applied locally AND pasted into cloud Dashboard SQL Editor (per closed decision #18 in root CLAUDE.md):
- Extended `user_wallet_subscriptions` with `expires_at, credits_spent, is_active, last_renewed_at` + index `idx_uws_active_expires`.
- Seeded `credits_config` with `wallet_subscription_cost=500` and `wallet_subscription_duration_days=30` (admin-tunable).
- RPC `subscribe_to_wallet(p_wallet_id INTEGER) RETURNS JSONB` SECURITY DEFINER. Atomic: locks balance row (`FOR UPDATE`), deducts credits, upserts subscription with `GREATEST(now, existing_expires) + duration` (extends rather than replaces during active period), writes `credit_transactions` row (`type='wallet_subscription'`, `reference_id=wallet_id::TEXT`). Returns `{success, balance_after, expires_at}` or `{success:false, error:'insufficient_credits'|'wallet_not_found'|'unauthenticated'}`.
- RPC `unsubscribe_from_wallet(p_wallet_id INTEGER)` — soft-deactivates (no refund). Idempotent.
- View `v_wallet_balance_history` — cumulative balance over time per `(user_id, wallet_id)` derived from settled `bets`. GRANTed to anon/authenticated.

**Client utilities:**
- [utils/wallet-meta.ts](utils/wallet-meta.ts): `getWalletMeta(id) → WalletMeta`, `listAllWalletMeta()`. Hardcoded entries for IDs 4 (NBA V4-RL), 6 (NBA V5-TS), 7 (Euro V5-TS), 8 (NBA V6-AIF), 9 (Euro V6-AIF), 10 (Football V6-Hybrid). Each has `sport, league, shortName, longName, blurb, seedAmount, badge`. **TODO**: extend with wallets 2, 3, 5, 11, 12, 13, 14, 15, 16 once names/blurbs are decided.
- [utils/bet-label.ts](utils/bet-label.ts): `betLabelShort(bet)` ≤14 chars for chips. `betLabelLong(bet)` for rows. Maps cover HOME_WIN/AWAY_WIN/DRAW/BTTS_YES/BTTS_NO/OVER_*/UNDER_*/SPREAD_*/SGP_*/XGAME_PARLAY.

**[composables/useApi.ts](composables/useApi.ts) — 4 new helpers in WALLET SUBSCRIPTIONS section:**
- `fetchWalletSubscriptions()` → `{subscriptions:[{wallet_id,expires_at,is_active,credits_spent,...}], wallets:[...], pricing:{cost_credits,duration_days}}`. Uses `user.value.id` to query `user_wallet_subscriptions` where `is_active=true`. Pricing extracted from `credits_config` rows.
- `subscribeToWallet(walletId)` → `supabase.rpc('subscribe_to_wallet', {p_wallet_id:walletId})`.
- `unsubscribeFromWallet(walletId)` → `supabase.rpc('unsubscribe_from_wallet', {p_wallet_id:walletId})`.
- `fetchWalletBalanceHistory(walletId, days=30)` → queries `v_wallet_balance_history`, anchors with `wallets.initial_balance`. Returns `{points:[{ts,balance}], initial_balance, current_balance}`. `days=0` for all-time.

**6 new components in `components/wallet/`:**
- `WalletDiscovery.vue` — Mode A grid. Sorts wallets by ROI desc. Each card: badge box, longName + ROI%, blurb (line-clamp-2), WR/bets/balance, Subscribe button with `pricing.cost_credits`.
- `WalletHero.vue` — Subscribed-mode header. Badge + longName + blurb, optional "Expires {N}d" (amber if ≤3). Big balance with PnL pill. Inline SVG sparkline (viewBox 100x30, polyline, color = green/red based on PnL). 4-tile stats grid: ROI / Win / Bets / Seed.
- `WalletPerformanceChart.vue` — SVG 300x120 with PADX=4, PADY=6. Range buttons 7d/30d/90d/All. Renders grid line, seed reference dashed line, area path, polyline, last-point dot. Y-axis labels overlaid. Footer: Start / range PnL ($ + %) / Now. Color = green/red by sign.
- `WalletBetFilterBar.vue` — Pills: All/Pending/Won/Lost. Total badge on right.
- `WalletBetRow.vue` — Status dot (green/red/amber-pulse/zinc), `${home_name} vs ${away_name}`, short bet label (emerald) + date + league, stake@odds, profit OR "Pending". Click → `/game/${bet.game_id}`.
- `WalletSubscribeModal.vue` — UModal. Strategy blurb, Cost/Duration/Balance rows (balance red if insufficient), warning box if balance < cost, Cancel/Confirm buttons.

**[pages/wallet.vue](pages/wallet.vue) — fully rewritten (~360 lines):**
- State machine: `mode = computed(() => subscribedWallets.length > 0 ? 'subscribed' : 'discovery')`.
- **Discovery mode** (no subs): renders `<WalletDiscovery>` over the full catalogue.
- **Subscribed mode**: pill row of subscribed wallets (with ROI%) + "Subscribe" pill (opens discovery modal) + `<WalletHero>` + `<WalletPerformanceChart>` + bets card with `<WalletBetFilterBar>` and `<WalletBetRow>` list. Two modals: discovery (`UModal` listing unsubscribed wallets) + `<WalletSubscribeModal>` for confirmation.
- `loadAll()` runs `fetchWalletSubscriptions` + `fetchCredits` in parallel. `confirmSubscribe(w)` calls `api.subscribeToWallet(w.id)`, on success refreshes subs and reselects.

### Phase 5 — Subscription-gated Predictions (PARTIAL — football done, basketball UI pending)

**[server/utils/auth.ts](server/utils/auth.ts) — NEW:**
- `getOptionalUserId(event): Promise<number|null>` — dual-mode auth check (Bearer JWT + session cookie). Returns null when not authenticated (lets endpoints serve both auth and anon users).
- `requireUserId(event): Promise<number>` — same but throws 401. Reusable for any endpoint that needs auth.

**[server/utils/wallet-models.ts](server/utils/wallet-models.ts) — NEW (single source of truth for wallet → model_version):**
- `WALLET_MODEL_MAP: Record<number, string[]>` covering all 12 active wallets:
  - Football: 2→`v18`, 3→`v20`, 10→`football_v6_aif`, 11→`v18`, 12→`football_v6_aif`
  - NBA: 4→`nba_v4_rl`, 6→`nba_v5_ts`, 8→`nba_v6_aif`
  - EuroLeague + other: 5→`euroleague_v4_rl`, 7→`euroleague_v5_ts`, 9→`euroleague_v6_aif`, 13→`gbl_v6_aif`, 14→`acb_v6_aif`, 15→`eurocup_v6_aif`, 16→`bcl_v6_aif`
- `modelVersionsForWallets(walletIds: number[]): Set<string>` — flatten subscribed wallets to allowed model versions.
- `fetchActiveSubscribedWalletIds(supabase, userId)` — pulls active, non-expired subs.
- `pickBestPrediction<T>(predictions, allowed)` — sport-aware priority: V6 hybrid > V18 > V20 (football); V6 AIF > V5 TS > V4 RL (basketball). Returns the highest-priority prediction the user is subscribed to, or null.

**[server/api/leagues/\[slug\].get.ts](server/api/leagues/[slug].get.ts) — UPDATED:**
- Resolves user's active wallet subscriptions early (`getOptionalUserId` → `fetchActiveSubscribedWalletIds`).
- Cache key now includes the sub-set: `league:${slug}:${round}:${season}:${subKey}` (so two users with different wallets don't pollute each other's payloads). Existing `invalidateLeagueCache(leagueKey)` still works because `invalidateCache` uses substring match.
- Replaced hardcoded `model_version === 'v18'` filter with `pickBestPrediction(game.predictions, allowedModelVersions)`. Subscribers see V6 hybrid (production football model) when subscribed to wallet 10/12. Anonymous users see games but no AI prediction.

### Pending work — current todos

| # | Status | Work |
|---|--------|------|
| 12 | next | **Phase 5 Analysis redesign.** 7 sections (key metrics, score dist, home vs away, scoring trends, form table, top scorers, referee impact). Likely needs RPC `get_league_analysis(league_key, season)` to bundle everything in one round-trip. |
| 13 | queued | **Phase 6 Account.** 5-section card stack (Profile / Subscriptions / Credits / Notifications / Danger). Migration: `ALTER TABLE user_prefs ADD COLUMN notification_prefs JSONB NOT NULL DEFAULT '{}'`. New `pages/notifications.vue`. |
| 14 | queued | **Phase 1 Dashboard redesign.** Sport dropdown, date strip swipe (Capacitor haptic on date change), pick chips on game rows (use `betLabelShort`), wallet-bet stake badges, PullToRefresh. |
| 15 | queued | **Phase 2 Game detail redesign.** Back arrow header, stat bar fix, player sheet (bottom-sheet on mobile), Analysis enrichment, Prediction card redesign (pull from V6 hybrid for football, V6 AIF for basketball), Fantasy toggle, Props admin-only, RPC `get_game_detail(game_id)`. |

### Pending — basketball predictions UI

Phase 5 server work is done — V4/V5/V6 basketball predictions now flow through the league endpoint payload when the user is subscribed. But [components/league/PredictionsView.vue](components/league/PredictionsView.vue) currently has a separate basketball branch (`isBball`) that shows projected scores from team stats with a disclaimer ("No ML predictions available yet"). That disclaimer is now stale. Next session needs to:
- Detect `isBball && match.prediction` (will be populated from subscription gate).
- Render an AI prediction block matching the football one (confidence, expected total, market chips for ML/spread/total).
- Keep the projected-score panel as fallback when no prediction exists or user isn't subscribed.

This work is naturally rolled into Todo 15 (Game detail redesign) because the same components will be reused.

### Forward plan — remaining phases (NOT yet started)

| Phase | Scope |
|-------|-------|
| **0.3** | Dashboard request budget ≤3. Build RPC `get_dashboard_bundle(p_user_id, p_wallet_id, p_from, p_to)` returning `{sports, wallets, leagues_summary, games, wallet_stats, accuracy}` in one round-trip. Today's dashboard fires 5-15 requests. |
| **0.5** | PullToRefresh component (touchstart/touchmove + haptic). Pages: `/`, `/leagues`, `/wallet`, `/my-bets`, `/picks`, `/league/[slug]`. |
| **4** | My Bets redesign — group by date, status filter, swipe-to-delete (Capacitor haptic). Empty state CTAs route to subscription discovery. |
| **7** | Picks page — reuse `WalletBetRow` and `WalletBetFilterBar` for consistent visuals. Drop the bespoke admin layout. |
| **8** | Onboarding rebuild — collapse from 4 steps to 2 (sports + wallet). Use the new wallet discovery card pattern instead of the legacy preferences picker. |

### Migration deployment checklist

- ✅ `20260423000004_wallet_subscriptions_credits.sql` applied locally
- ✅ Same SQL pasted into cloud Supabase Dashboard SQL Editor
- ⏳ `notification_prefs` column on `user_prefs` (Todo 13)
- ⏳ `get_league_analysis` RPC (Todo 12)
- ⏳ `get_dashboard_bundle` RPC (Phase 0.3)
- ⏳ `get_game_detail` RPC (Todo 15)

### Key constraints to remember

- No emoji / inline SVG icons — use `<UIcon>` from Nuxt UI or plain text.
- Dark mode only — design exclusively for dark backgrounds.
- Never use `.single()` for nullable lookups — always `.maybeSingle()`.
- Nuxt auto-imports composables and components from their respective folders — don't add explicit imports for them.
- Use `python3` (never `python`) in any spawned processes / shebangs.
- Migrations to local first, then paste into cloud Dashboard SQL Editor (closed decision #18). Edge Functions still call cloud DB.
- New fetchers should use `useSwr` from day one rather than bare API calls — the SWR layer is the production caching strategy now.
- `WALLET_MODEL_MAP` (server) and `wallet-meta.ts` (client) must stay in sync. When adding a new wallet, update both.
- Anonymous users see games on league pages but **no AI predictions** — predictions are now subscription-gated. The `pred-card` still renders, just empty.
- **Wallets 19 and 20 are parlay-only** (root CLAUDE.md CD #22). Their bets must NEVER render as standalone chips on game cards — `DayMatchesPanel.vue` + `DashboardGameCard.vue` filter them via `PARLAY_ONLY_WALLETS = new Set([19, 20])`. They surface only under the per-date `Parlays (N)` toggle.

---

## May 2 2026 — Dashboard Parlay Toggle Wiring + Bet-Chip Filter

### Symptom
APK Props V2 wallet rendered the same `ML @ 2.10` / `Over (alt) @ 2.77` chips 13× on a single match. Pending pill showed "1110" while web showed "3". Root cause was two separate bugs (one frontend, one backend cloud sync — see root CLAUDE.md May 2 entry for the cloud side).

### Frontend changes shipped

| File | Change |
|------|--------|
| [composables/useApi.ts](composables/useApi.ts) | `fetchWalletParlays(walletId, opts)` accepts `from`/`to` window for date-bounded fetch. `fetchGames` strips parlay-leg bets (`notes.parlay_id` / `pick_type='prop_parlay_leg'` / `leg_number`) from the embedded `bets` array — they belong in the parlays toggle, not as standalone chips. |
| [components/dashboard/DashboardDataProvider.vue](components/dashboard/DashboardDataProvider.vue) | Now fetches wallet-scoped parlays for **all users** (was admin-only via `fetchParlays`). Windowed to last 30 days, capped at 200. Drives the existing toggle in `DayMatchesPanel.vue`. |
| [components/dashboard/DayMatchesPanel.vue](components/dashboard/DayMatchesPanel.vue) | `getGameBets` filters out parlay legs and `PARLAY_ONLY_WALLETS = new Set([19, 20])`. Existing `Games | Parlays (N)` toggle UI now actually receives data. |
| [components/dashboard/DashboardGameCard.vue](components/dashboard/DashboardGameCard.vue) | Same filter applied to the `gameBets` computed. |

### Why the toggle UI already existed
[DayMatchesPanel.vue](components/dashboard/DayMatchesPanel.vue) had the `viewMode: 'games' \| 'parlays'` toggle and `dayParlays` computed (filtering by `parlay_legs[i].bets.game_id ∈ day's games`) since a prior session — it was just empty for non-admin users. This session only had to feed it data and plug the chip-leak.

### Verified
`npm run dev` starts clean, `/` returns 200, no compile errors from the edits. Empirical: dedupe guard in basketball post scripts confirmed working (root CLAUDE.md May 2). The parlays toggle remains "if any parlays exist for this wallet on this date" — hidden when N=0, no disabled state.

### Not done this session (forward)
- **APK safe-area / notch clipping.** `pt-[env(safe-area-inset-top)]` still missing on the top bar in [layouts/default.vue](layouts/default.vue). Toolbar pills truncate ungracefully (logo clipped on notch devices because `capacitor.config.json` has `overlaysWebView: true`).
- **`Parlays (N)` button placement.** User originally described it under the date carousel next to the date header (`April 30, 2026 · 8 matches`). The current toggle lives inside `DayMatchesPanel.vue`'s panel header — same place visually, just a different DOM nesting. If the user wants it elevated to the page-level header above league groups, that's a small refactor (lift `viewMode` up to `pages/index.vue`).
- **Singles from non-19/20 wallets** (V5/V6 NBA, V6 football) still chip on game cards as designed. Those are real per-game singles and the user has not asked to move them.
