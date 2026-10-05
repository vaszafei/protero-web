export type GameSport = 'football' | 'basketball'
export type GameState = 'scheduled' | 'completed'

export interface GameTab {
  key: string
  label: string
  badge: number | null
  hint?: string
}

/** What the page knows about a fixture that decides which tabs exist. */
export interface TabInputs {
  state: GameState
  sport: GameSport
  matchEventCount: number
  /** Located shots, or a failed shot load (so a fetch error is not read as "no shots"). */
  hasShots: boolean
  shotCount: number | null
  hasFantasy: boolean
  isAdmin: boolean
}

interface TabSpec {
  key: string
  label: string
  state: GameState
  sports: readonly GameSport[]
  /** A tab appears for a sport only when its data type exists. */
  when?: (i: TabInputs) => boolean
  badge?: (i: TabInputs) => number | null
  hint?: (i: TabInputs) => string | undefined
}

const BOTH: readonly GameSport[] = ['football', 'basketball']

/**
 * The whole tab matrix. Order is the array order, so two sports show the tabs they share in the same
 * place under the same name. Team stats and the players tables live in the side rails and the pitch /
 * court columns (#59, #60), not here, so completed games carry only the panels that need the width.
 */
const MATRIX: readonly TabSpec[] = [
  { key: 'market', label: 'Market', state: 'scheduled', sports: ['football'] },
  { key: 'analysis', label: 'Analysis', state: 'scheduled', sports: BOTH },
  { key: 'prediction', label: 'Prediction', state: 'scheduled', sports: BOTH },
  { key: 'fantasy', label: 'Fantasy', state: 'scheduled', sports: ['basketball'], when: (i) => i.hasFantasy },
  { key: 'props', label: 'Props', state: 'scheduled', sports: ['basketball'], when: (i) => i.isAdmin },
  {
    key: 'timeline', label: 'Timeline', state: 'completed', sports: ['football'],
    badge: (i) => (i.matchEventCount > 0 ? i.matchEventCount : null),
    hint: (i) => (i.matchEventCount > 0 ? undefined : 'not recorded'),
  },
  { key: 'postmortem', label: 'Post-mortem', state: 'completed', sports: ['football'] },
  { key: 'shots', label: 'Shot Chart', state: 'completed', sports: ['basketball'], when: (i) => i.hasShots, badge: (i) => i.shotCount },
]

export function gameTabs(i: TabInputs): GameTab[] {
  return MATRIX
    .filter((t) => t.state === i.state && t.sports.includes(i.sport) && (t.when?.(i) ?? true))
    .map((t) => ({ key: t.key, label: t.label, badge: t.badge?.(i) ?? null, ...(t.hint?.(i) ? { hint: t.hint(i) } : {}) }))
}

/** The first tab, except a completed football game with no recorded events, which opens on the post-mortem. */
export function defaultTabKey(i: TabInputs): string | null {
  if (i.state === 'completed' && i.sport === 'football' && i.matchEventCount === 0) return 'postmortem'
  return gameTabs(i)[0]?.key ?? null
}
