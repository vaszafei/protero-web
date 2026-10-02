/**
 * P&L over a window of a wallet's equity curve.
 *
 * `points` is the settled-wager balance series (`fetchWalletBalanceHistory`);
 * `seed` is the wallet's starting balance; `windowStartBalance` is the balance
 * just BEFORE the window opens. "All" has no window start and measures from the
 * seed. Measuring from `points[0]` instead drops the first wager in the window:
 * on W26 that was the -7.45 opening bet, so the chart said +55 against the RPC's
 * +47.24.
 */
export interface BalancePoint {
  ts: string
  balance: number
}

export function rangePnl(
  points: BalancePoint[],
  seed: number,
  windowStartBalance?: number | null,
): number {
  if (!points.length) return 0
  const base = windowStartBalance ?? seed
  return points[points.length - 1].balance - base
}

/** The same window as a share of the balance it started from — bankroll return, not ROI. */
export function rangePnlPct(
  points: BalancePoint[],
  seed: number,
  windowStartBalance?: number | null,
): number {
  const base = windowStartBalance ?? seed
  if (!points.length || !base) return 0
  return (rangePnl(points, seed, windowStartBalance) / base) * 100
}
