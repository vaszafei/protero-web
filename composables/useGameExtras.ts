import { errorText } from '~/utils/error-text'

/**
 * The reads a game page makes beyond the `game-page` bundle, each on demand:
 *  - located shots, once, for a completed basketball game (a EuroLeague game is ~160 shots, so it
 *    stays out of every fixture request, football ones included);
 *  - the Monte-Carlo same-game correlations, which spawn `ml.slips.slip_sim` on the host (an Edge
 *    Function cannot reach it, so Nitro serves them), the first time a tab that shows them opens;
 *  - whether a scheduled basketball game has fantasy projections.
 * A read that FAILED is reported, never read as "nothing there".
 */
export function useGameExtras(
  data: Ref<any>,
  sport: Ref<'football' | 'basketball'>,
  completed: Ref<boolean>,
  activeTab: Ref<string>,
) {
  const apiFetch = useApiFetch()
  const api = useApi()

  const shotData = ref<Record<string, any> | null>(null)
  const shotsLoading = ref(false)
  const shotsError = ref<string | null>(null)
  const hasShots = computed(() => (shotData.value?.shots?.length ?? 0) > 0 || !!shotsError.value)

  async function loadShots() {
    const g = data.value?.game
    if (!g || shotData.value || shotsLoading.value) return
    if (!completed.value || sport.value !== 'basketball') return
    shotsLoading.value = true
    shotsError.value = null
    try {
      shotData.value = await apiFetch(`/api/game/${g.id}/shots`)
    } catch (e) {
      shotsError.value = errorText(e)
    } finally {
      shotsLoading.value = false
    }
  }

  function retryShots() {
    shotData.value = null
    loadShots()
  }

  watch(() => data.value?.game, (game) => { if (game) loadShots() }, { immediate: true })

  const correlations = ref<Record<string, any> | null>(null)
  let correlationsFor: number | null = null
  async function loadCorrelations() {
    const g = data.value?.game
    if (!g || sport.value !== 'football' || correlationsFor === g.id) return
    correlationsFor = g.id
    correlations.value = null
    try {
      correlations.value = await apiFetch(`/api/game/${g.id}/correlations`)
    } catch (e) {
      correlations.value = { status: 'insufficient_data', note: errorText(e) }
    }
  }

  watch(() => [data.value?.game?.id, activeTab.value], ([, tab]) => {
    if (tab === 'analysis' || tab === 'prediction') loadCorrelations()
  }, { immediate: true })

  const hasFantasy = ref(false)
  const fantasyError = ref<string | null>(null)
  async function checkFantasy() {
    if (!data.value?.game || completed.value || sport.value !== 'basketball') return
    const d = data.value as Record<string, any>
    // The bundled call already ran: report its failure rather than reading it as "no projections".
    fantasyError.value = d?.fantasyError || null
    if (fantasyError.value) return
    if (Array.isArray(d?.fantasy)) {
      hasFantasy.value = d.fantasy.length > 0
      return
    }
    try {
      hasFantasy.value = (await api.fetchFantasyProjections(data.value.game.id)).length > 0
    } catch (e) {
      fantasyError.value = errorText(e)
    }
  }

  watch(() => data.value?.game, (game) => { if (game && game.status !== 'completed') checkFantasy() }, { immediate: true })

  return { shotData, shotsError, hasShots, retryShots, correlations, hasFantasy, fantasyError }
}
