import { useSwr } from '~/composables/useSwr'

/** A part of a bundle that failed is reported, never emptied (`error`), so its panel can say so. */
export interface BundlePart<T> { data: T | null; error: string | null }

/**
 * The game page's single read (`game-page` Edge Function): the fixture, its lineups, the pre-match
 * rails, the market board, the analysis record, the post-mortem and the twin context. Every component
 * that needs a part calls this with the same game id — `useSwr` shares the key and de-duplicates the
 * in-flight request, so five consumers cost one request.
 */
export function useGamePage(gameId: MaybeRefOrGetter<number | string>) {
  const edge = useEdge()
  const id = computed(() => Number(toValue(gameId)))
  return useSwr<any>(
    computed(() => `game-page:${id.value}`),
    () => edge('game-page', { gameId: id.value }),
    { memoryTtl: 60_000 },
  )
}
