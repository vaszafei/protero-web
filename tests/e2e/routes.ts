import { discover } from './ids'

export interface Route { key: string, path: string }

/** Every route the suite visits. `key` is what `allowlist.ts` refers to. */
export function routes(): Route[] {
  const id = discover()
  return [
    { key: '/', path: '/' },
    { key: '/calendar', path: '/calendar' },
    { key: '/leagues', path: '/leagues' },
    { key: '/wallet', path: '/wallet' },
    { key: '/gates', path: '/gates' },
    { key: '/my-real-bets', path: '/my-real-bets' },
    { key: '/fantasy', path: '/fantasy' },
    ...(id.slate ? [{ key: '/fantasy/:slate', path: `/fantasy/${id.slate}` }] : []),
    { key: '/admin', path: '/admin' },
    { key: '/account', path: '/account' },
    ...id.wallets.map(w => ({ key: `/wallet/${w}`, path: `/wallet/${w}` })),
    { key: '/league/football', path: `/league/${id.footballLeague}` },
    { key: '/league/basketball', path: `/league/${id.basketballLeague}` },
    { key: '/team', path: `/team/${id.team}` },
    { key: '/game/scheduled-football', path: `/game/${id.scheduledFootball}` },
    { key: '/game/completed-lineup', path: `/game/${id.completedWithLineup}` },
    { key: '/game/completed-no-lineup', path: `/game/${id.completedNoLineup}` },
    { key: '/game/completed-basketball', path: `/game/${id.completedBasketball}` },
  ]
}
