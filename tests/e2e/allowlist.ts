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
  '/fantasy': { overflow: 1500, ticket: '#50' },
  '/fantasy/:slate': { overflow: 2000, ticket: '#50' },
}
