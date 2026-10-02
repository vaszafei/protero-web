/**
 * Known failures, one entry per route. Each names the #38 ticket that removes it; the ticket
 * that merges deletes its own entry, so this file shrinks to nothing.
 *
 * `overflow`  maximum `main.scrollHeight - clientHeight` tolerated (default 0)
 * `requests`  maximum data requests tolerated (default `DEFAULT_REQUEST_BUDGET`)
 */
export interface Allowed { overflow?: number, requests?: number, ticket: string }

export const DEFAULT_REQUEST_BUDGET = 25

/**
 * Empty since 2026-10-02: every route measures overflow 0 and is inside its request budget.
 * A route that regresses is either fixed or listed here with the ticket that will fix it.
 */
export const allowlist: Record<string, Allowed> = {}
