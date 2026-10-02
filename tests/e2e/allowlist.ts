/**
 * Known failures, one entry per route. Each names the #38 ticket that removes it; the ticket
 * that merges deletes its own entry, so this file shrinks to nothing.
 *
 * `overflow`  maximum `main.scrollHeight - clientHeight` tolerated (default 0)
 * `requests`  maximum data requests tolerated (default `DEFAULT_REQUEST_BUDGET`)
 */
export interface Allowed { overflow?: number, requests?: number, ticket: string }

export const DEFAULT_REQUEST_BUDGET = 25

/** Measured 2026-10-02 at 1918x989; ceilings are rounded up so data drift does not flap them. */
export const allowlist: Record<string, Allowed> = {
  '/leagues': { overflow: 1700, ticket: '#48' },
  '/league/football': { overflow: 1300, requests: 65, ticket: '#48 (overflow), #49 (requests)' },
  '/league/basketball': { overflow: 300, requests: 50, ticket: '#48 (overflow), #49 (requests)' },
  '/team': { overflow: 1800, ticket: '#48' },
  '/game/completed-lineup': { overflow: 1400, ticket: '#48' },
  '/game/completed-basketball': { overflow: 350, ticket: '#48' },
  '/fantasy': { overflow: 1500, ticket: '#50' },
  '/fantasy/:slate': { overflow: 2000, ticket: '#50' },
}
