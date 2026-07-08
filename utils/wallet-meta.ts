/**
 * Wallet metadata — strategy descriptions, sport assignments, badges.
 * Single source of truth for what each admin wallet is.
 *
 * Update this when a new wallet/strategy goes live. Keep in sync with:
 *   - server/utils/wallet-models.ts (model_version mapping)
 *   - composables/useApi.ts          (WALLET_LEAGUE_MAP — league access gate)
 */

export type WalletKind = 'singles' | 'parlays' | 'props'

export type WalletBadge =
  | 'V4-RL'
  | 'V5-TS'
  | 'V6-AIF'
  | 'V6-Hybrid'
  | 'V18'
  | 'V20'
  | 'Parlays'
  | 'Props-AIF'
  | 'Props-Manual'

export interface WalletMeta {
  id: number
  sport: 'basketball' | 'football'
  league: string
  shortName: string
  longName: string
  blurb: string
  seedAmount: number
  badge: WalletBadge
  kind: WalletKind
}

const WALLET_META: Record<number, WalletMeta> = {
  // ─── Football ──────────────────────────────────────────
  2: {
    id: 2,
    sport: 'football',
    league: 'multi',
    shortName: 'V18',
    longName: 'Football V18 (legacy)',
    blurb: 'Per-league O/U-only model. Historical wallet. $500 seed.',
    seedAmount: 500,
    badge: 'V18',
    kind: 'singles',
  },
  3: {
    id: 3,
    sport: 'football',
    league: 'multi',
    shortName: 'V20',
    longName: 'Football V20 (retired)',
    blurb: 'Pooled cross-league ensemble. Retired Apr 2026. $1000 seed.',
    seedAmount: 1000,
    badge: 'V20',
    kind: 'singles',
  },
  10: {
    id: 10,
    sport: 'football',
    league: 'multi',
    shortName: 'Football V6',
    longName: 'Football V6 Hybrid',
    blurb: 'ML ensemble (XGB+LGB+CAT) feeding an Active Inference agent. 8 active leagues. $1000 seed.',
    seedAmount: 1000,
    badge: 'V6-Hybrid',
    kind: 'singles',
  },
  11: {
    id: 11,
    sport: 'football',
    league: 'multi',
    shortName: 'V18 Revival',
    longName: 'Football V18 Revival',
    blurb: 'V18 backtest revival on current season. O/U focus. $500 seed.',
    seedAmount: 500,
    badge: 'V18',
    kind: 'singles',
  },
  12: {
    id: 12,
    sport: 'football',
    league: 'multi',
    shortName: 'Football Parlays',
    longName: 'Football V6 Parlays',
    blurb: 'Cross-game parlays from V6 hybrid singles. Dormant — currently unprofitable. $1000 seed.',
    seedAmount: 1000,
    badge: 'Parlays',
    kind: 'parlays',
  },

  // ─── NBA ───────────────────────────────────────────────
  4: {
    id: 4,
    sport: 'basketball',
    league: 'nba',
    shortName: 'NBA V4',
    longName: 'NBA V4 RL',
    blurb: 'Deep-Q reinforcement learning agent for NBA bet selection. $100 seed.',
    seedAmount: 100,
    badge: 'V4-RL',
    kind: 'singles',
  },
  6: {
    id: 6,
    sport: 'basketball',
    league: 'nba',
    shortName: 'NBA V5',
    longName: 'NBA V5 Thompson',
    blurb: 'Thompson sampling bandit. Self-learning after every settlement. $100 seed.',
    seedAmount: 100,
    badge: 'V5-TS',
    kind: 'singles',
  },
  8: {
    id: 8,
    sport: 'basketball',
    league: 'nba',
    shortName: 'NBA V6',
    longName: 'NBA V6 Active Inference',
    blurb: 'Bayesian beliefs about every team. Free-energy bet selection. OVER_ALT mask only. $100 seed.',
    seedAmount: 100,
    badge: 'V6-AIF',
    kind: 'singles',
  },

  // ─── EuroLeague + Euro basketball ──────────────────────
  5: {
    id: 5,
    sport: 'basketball',
    league: 'euroleague',
    shortName: 'Euro V4',
    longName: 'EuroLeague V4 RL (dormant)',
    blurb: 'Reinforcement-learning experiment for EuroLeague. Dormant — superseded by V5/V6. $100 seed.',
    seedAmount: 100,
    badge: 'V4-RL',
    kind: 'singles',
  },
  7: {
    id: 7,
    sport: 'basketball',
    league: 'euroleague',
    shortName: 'EuroLeague V5',
    longName: 'EuroLeague V5 Thompson',
    blurb: 'Thompson sampling for EuroLeague. Self-learning bandit. $100 seed.',
    seedAmount: 100,
    badge: 'V5-TS',
    kind: 'singles',
  },
  9: {
    id: 9,
    sport: 'basketball',
    league: 'euroleague',
    shortName: 'EuroLeague V6',
    longName: 'EuroLeague V6 Active Inference',
    blurb: 'Active Inference for EuroLeague. Bayesian team beliefs. Totals-only mask. $100 seed.',
    seedAmount: 100,
    badge: 'V6-AIF',
    kind: 'singles',
  },
  13: {
    id: 13,
    sport: 'basketball',
    league: 'greek_basket_league',
    shortName: 'GBL V6',
    longName: 'Greek Basket League V6 AIF',
    blurb: 'Active Inference for the Greek Basket League. $100 seed.',
    seedAmount: 100,
    badge: 'V6-AIF',
    kind: 'singles',
  },
  14: {
    id: 14,
    sport: 'basketball',
    league: 'acb',
    shortName: 'ACB V6',
    longName: 'Spanish ACB V6 AIF',
    blurb: 'Active Inference for the Spanish ACB. $100 seed.',
    seedAmount: 100,
    badge: 'V6-AIF',
    kind: 'singles',
  },
  15: {
    id: 15,
    sport: 'basketball',
    league: 'eurocup',
    shortName: 'EuroCup V6',
    longName: 'EuroCup V6 AIF',
    blurb: 'Active Inference for the EuroCup. $100 seed.',
    seedAmount: 100,
    badge: 'V6-AIF',
    kind: 'singles',
  },
  16: {
    id: 16,
    sport: 'basketball',
    league: 'bcl',
    shortName: 'BCL V6',
    longName: 'Basketball Champions League V6 AIF',
    blurb: 'Active Inference for the BCL. $100 seed.',
    seedAmount: 100,
    badge: 'V6-AIF',
    kind: 'singles',
  },

  // ─── Player Props (NBA + EuroLeague, both leagues per wallet) ──
  19: {
    id: 19,
    sport: 'basketball',
    league: 'multi',
    shortName: 'Props AIF',
    longName: 'Player Props V2 — Automated AIF',
    blurb: 'Active Inference player props (NBA + EuroLeague). NegBin beliefs, calibrated bias, single-leg + correlated parlays. €100 seed.',
    seedAmount: 100,
    badge: 'Props-AIF',
    kind: 'props',
  },
  20: {
    id: 20,
    sport: 'basketball',
    league: 'multi',
    shortName: 'Props Manual',
    longName: 'Player Props V2 — Curated',
    blurb: '7-Layer + Game Theory hand-analyzed props (NBA + EuroLeague). STRONG/LOCK tier only. €100 seed.',
    seedAmount: 100,
    badge: 'Props-Manual',
    kind: 'props',
  },
}

const FALLBACK: Omit<WalletMeta, 'id'> = {
  sport: 'football',
  league: 'unknown',
  shortName: 'Wallet',
  longName: 'Strategy wallet',
  blurb: 'Active strategy wallet.',
  seedAmount: 0,
  badge: 'V6-AIF',
  kind: 'singles',
}

export function getWalletMeta(walletId: number): WalletMeta {
  return WALLET_META[walletId] ?? { id: walletId, ...FALLBACK }
}

export function listAllWalletMeta(): WalletMeta[] {
  return Object.values(WALLET_META)
}
