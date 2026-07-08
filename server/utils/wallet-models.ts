/**
 * Wallet → model_version mapping.
 *
 * Each subscription wallet maps to one or more `predictions.model_version`
 * strings. This single source of truth is used to gate which predictions a
 * user sees on league pages, dashboard, and game detail.
 *
 * Keep in sync with utils/wallet-meta.ts (client-side display catalogue) and
 * with the model_version strings emitted by the ML pipelines.
 */
export const WALLET_MODEL_MAP: Record<number, string[]> = {
  // Football
  2:  ['v18'],                              // V18 (legacy)
  3:  ['v20'],                              // V20 (retired but historical predictions exist)
  10: ['football_v6_aif'],                  // Football V6 Hybrid — production
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

export function pickBestPrediction<T extends { model_version?: string | null }>(
  predictions: T[] | null | undefined,
  allowed: Set<string>,
): T | null {
  if (!predictions || predictions.length === 0) return null
  const filtered = predictions.filter(p => p.model_version && allowed.has(p.model_version))
  if (filtered.length === 0) return null
  filtered.sort((a, b) => {
    const ai = PRIORITY.indexOf(a.model_version!)
    const bi = PRIORITY.indexOf(b.model_version!)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
  return filtered[0]
}
