/**
 * Wallet → model_version FAMILY mapping.
 *
 * Each wallet maps to one or more prediction families. This gates which
 * predictions are shown on league pages, dashboard, and game detail.
 *
 * These are FAMILIES, not literal `predictions.model_version` values. The ML
 * posters derive the stored value per league, so the football V6 family is
 * written as `{league}_football_v6_aif` — `liga_portugal_football_v6_aif`,
 * `la_liga_football_v6_aif`, and so on. protero-ml/wallets.yaml states the rule
 * outright: "Match football on suffix, never on equality."
 *
 * This file matched on equality until 2026-08-22, so `allowed.has(model_version)`
 * was tested against a Set holding `'football_v6_aif'` — a string that appears
 * ZERO times in the predictions table. Every football prediction was therefore
 * invisible to every user, while basketball worked because its values
 * (`nba_v5_ts`, `gbl_v6_aif`) happen to be stored unprefixed. Use
 * matchesFamily() below, never Set.has(), for anything derived from this map.
 *
 * Keep in sync with utils/wallet-meta.ts (client-side display catalogue) and
 * with the model_version strings emitted by the ML pipelines.
 */
export const WALLET_MODEL_MAP: Record<number, string[]> = {
  // ─── Trader personas — the live roster since the 2026-07-28 cutover (CD #35).
  // These were absent entirely until 2026-08-22, so subscribing to the wallets
  // the pipelines actually write to granted access to nothing.
  26: ['football_v6_aif'],                  // Trader: Football Value (succeeds W10)
  28: ['nba_v5_ts'],                        // Trader: NBA Thompson
  29: ['props_v2_manual'],                  // Trader: Props Analyst
  31: ['euroleague_v5_ts'],                 // Trader: EuroLeague Thompson
  32: ['euroleague_v6_aif', 'gbl_v6_aif', 'acb_v6_aif'], // Trader: Niche Leagues
  // W27 (The Banker) and W30 (The Sniper) have no production picker and emit no
  // predictions — wallets.yaml records both as dormant. No entry, deliberately.
  // W33-36 are external tipsters: mirrored picks, not model output.

  // ─── Legacy — frozen, but historical predictions still exist.
  2:  ['v18'],                              // V18 (legacy)
  3:  ['v20'],                              // V20 (retired but historical predictions exist)
  10: ['football_v6_aif'],                  // Football V6 Hybrid — superseded by W26
  11: ['v18'],                              // V18 Revival
  12: ['football_v6_aif'],                  // Football V6 Parlays (shares V6 predictions)

  // NBA
  4:  ['nba_v4_rl'],
  6:  ['nba_v5_ts'],
  8:  ['nba_v6_aif'],

  // EuroLeague + other Euro basketball
  5:  ['euroleague_v4_rl'],   // legacy — may not exist
  7:  ['euroleague_v5_ts'],
  9:  ['euroleague_v6_aif'],
  13: ['gbl_v6_aif'],
  14: ['acb_v6_aif'],
  15: ['eurocup_v6_aif'],
  16: ['bcl_v6_aif'],

  // Player Props (NBA + EuroLeague — same wallet covers both leagues)
  19: ['props_v2_aif'],
  20: ['props_v2_manual'],
}

/**
 * Resolve subscribed wallet IDs → set of allowed model_version strings.
 * Returns an empty Set if the user has no subscriptions.
 */
export function modelVersionsForWallets(walletIds: number[]): Set<string> {
  const out = new Set<string>()
  for (const id of walletIds) {
    const versions = WALLET_MODEL_MAP[id]
    if (versions) versions.forEach(v => out.add(v))
  }
  return out
}

/**
 * Fetch the user's currently active wallet subscriptions.
 * Returns an array of wallet IDs that are active and not expired.
 */
export async function fetchActiveSubscribedWalletIds(
  supabase: any,
  userId: number,
): Promise<number[]> {
  const { data, error } = await supabase
    .from('user_wallet_subscriptions')
    .select('wallet_id, is_active, expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !data) return []

  const now = new Date()
  return data
    .filter((s: any) => !s.expires_at || new Date(s.expires_at) > now)
    .map((s: any) => s.wallet_id)
}

/**
 * Sport-aware priority order — when multiple subscriptions yield multiple
 * predictions for the same game, we pick the highest-priority model.
 * Lower index = higher priority.
 */
const PRIORITY: string[] = [
  // Football
  'football_v6_aif',
  'v18',
  'v20',
  // NBA
  'nba_v6_aif',
  'nba_v5_ts',
  'nba_v4_rl',
  // EuroLeague + other Euro basketball
  'euroleague_v6_aif',
  'euroleague_v5_ts',
  'euroleague_v4_rl',
  'gbl_v6_aif',
  'acb_v6_aif',
  'eurocup_v6_aif',
  'bcl_v6_aif',
  // Player props
  'props_v2_manual',
  'props_v2_aif',
]

/**
 * Does a stored `model_version` belong to `family`?
 *
 * Exact match, or the league-prefixed form the football posters write
 * (`liga_portugal_football_v6_aif` belongs to `football_v6_aif`). The `_`
 * boundary matters: without it `v6_aif` would swallow `nba_v6_aif`.
 */
export function matchesFamily(modelVersion: string, family: string): boolean {
  return modelVersion === family || modelVersion.endsWith(`_${family}`)
}

/** Rank within PRIORITY, matching families rather than literal strings. */
function priorityIndex(modelVersion: string): number {
  const i = PRIORITY.findIndex(f => matchesFamily(modelVersion, f))
  return i === -1 ? 999 : i
}

export function pickBestPrediction<T extends { model_version?: string | null }>(
  predictions: T[] | null | undefined,
  allowed: Set<string>,
): T | null {
  if (!predictions || predictions.length === 0) return null
  const families = [...allowed]
  const filtered = predictions.filter(
    p => p.model_version && families.some(f => matchesFamily(p.model_version!, f)),
  )
  if (filtered.length === 0) return null
  filtered.sort((a, b) => priorityIndex(a.model_version!) - priorityIndex(b.model_version!))
  return filtered[0]
}
