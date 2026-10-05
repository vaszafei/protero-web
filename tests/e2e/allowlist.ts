/**
 * Known failures, one entry per route. Each names the #38 ticket that removes it; the ticket
 * that merges deletes its own entry, so this file shrinks to nothing.
 *
 * `overflow`  maximum `main.scrollHeight - clientHeight` tolerated (default 0)
 * `requests`  maximum data requests tolerated (default `DEFAULT_REQUEST_BUDGET`)
 */
export interface Allowed { overflow?: number, requests?: number, ticket: string }

export const DEFAULT_REQUEST_BUDGET = 25

/** Requests every page makes before its own data (auth/me, shell, sidebar): `/account` measures it. */
export const BASELINE_REQUESTS = 8

/**
 * Pages that read through one Edge Function bundle (#55) are budgeted by what they add over the
 * baseline: the game page ≤ 3 data requests, the wallet page ≤ 2.
 */
const OVER_BASELINE: Record<string, number> = {
  '/game/scheduled-football': 3,
  '/game/completed-lineup': 3,
  '/game/completed-no-lineup': 3,
  '/game/completed-basketball': 3,
  // The bundle + one ledger page sized to the measured panel. W29 also polls the props-slate job
  // runner (`/api/props/slate/status`), which is Nitro by design — it spawns host processes.
  // +2 on every wallet page: `useRealtimeRefetch` re-reads the bundle and the ledger once on SUBSCRIBED,
  // to catch rows written between the first read and the subscription landing (#52).
  '/wallet/26': 4, '/wallet/29': 5, '/wallet/40': 4, '/wallet/54': 4, '/wallet/55': 4,
}

export const requestBudget = (routeKey: string): number =>
  routeKey in OVER_BASELINE ? BASELINE_REQUESTS + OVER_BASELINE[routeKey] : DEFAULT_REQUEST_BUDGET

/**
 * Empty since 2026-10-02: every route measures overflow 0 and is inside its request budget.
 * A route that regresses is either fixed or listed here with the ticket that will fix it.
 */
export const allowlist: Record<string, Allowed> = {}
