<template>
  <section class="panel overflow-hidden" data-testid="expected-xi-panel" :data-state="state">
    <header class="panel-head">
      <span class="panel-title">Lineups</span>
      <span
        class="pill"
        :class="state === 'confirmed' ? 'pill-good' : 'pill-amber'"
        :title="state === 'confirmed'
          ? 'Official starting XIs, from the lineups feed.'
          : 'A projection from each club\'s most recent starting XI. Not an official lineup.'"
        data-testid="xi-state"
      >{{ state === 'confirmed' ? 'Confirmed' : 'Expected' }}</span>
      <span class="pill pill-blue ml-auto">{{ side('home').formation || '—' }}</span>
      <span class="pill pill-dim">{{ side('away').formation || '—' }}</span>
    </header>

    <div class="xp-body">
      <UiErrorState v-if="error" compact title="The expected lineup failed to load." :error="error" @retry="$emit('retry')" />
      <template v-else>
        <FormationPitch
          :home-lineup="side('home').players"
          :away-lineup="side('away').players"
          :home-name="game.home_name"
          :away-name="game.away_name"
          :home-formation="side('home').formation"
          :away-formation="side('away').formation"
        />

        <!-- A fixed-height strip, so the panel is the same size whichever state it is in. -->
        <ul class="xp-strip" data-testid="xi-strip">
          <li v-for="n in notes" :key="n">{{ n }}</li>
        </ul>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * The anchor of the centre column on a scheduled football game.
 *
 * Confirmed: the fixture has rows in `lineups` (the official XIs), shown as they are. Expected: each
 * club's most recent starting XI this season (`game-page` → `expectedXi`), labelled as a projection —
 * a projection must never read as an official lineup. A club with no prior XI keeps its half of the
 * pitch empty and the strip says so, instead of guessing. This is a display of stored history: it feeds
 * no pick and no price.
 */
import { computed } from 'vue'
import FormationPitch from '~/components/game/FormationPitch.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'

type Side = 'home' | 'away'

const props = defineProps<{
  game: Record<string, any>
  /** Official lineups for THIS fixture (empty before about T-60). */
  lineups: { home: Array<Record<string, any>>; away: Array<Record<string, any>> }
  /** `expectedXi` from the bundle: null when the fixture already has official lineups. */
  expected: { data: Record<string, any> | null; error: string | null } | null
}>()
defineEmits<{ (e: 'retry'): void }>()

const confirmed = computed(() => {
  const starters = (s: Side) => (props.lineups?.[s] || []).filter((p) => p.is_starting_xi !== false)
  return starters('home').length > 0 && starters('away').length > 0
})
const state = computed<'confirmed' | 'expected'>(() => (confirmed.value ? 'confirmed' : 'expected'))
const error = computed(() => (confirmed.value ? null : props.expected?.error ?? null))

const formOf = (p: Record<string, any>) => p.form as { appearances: number; starts: number; of: number } | undefined

/** What the pitch draws for one side, in the shape `FormationPitch` already reads. */
function side(s: Side): { formation: string | null; players: Array<Record<string, any>> } {
  if (confirmed.value) {
    return { formation: props.game[`${s}_formation`] ?? null, players: props.lineups[s] }
  }
  const x = props.expected?.data?.[s]
  if (!x || x.status !== 'ok') return { formation: null, players: [] }
  return {
    formation: x.formation,
    players: x.players.map((p: Record<string, any>) => {
      const f = formOf(p)
      return {
        ...p,
        // The rating is in the hover only: the pitch prints a rating in place of the caption, and two
        // different numbers under the names would not read as one thing.
        rating: null,
        // Under the name: starts in the club's last games with a lineup on record.
        tag: f ? `${f.starts}/${f.of}` : null,
        hover: f
          ? `${p.player_name}: started ${f.starts} of the club's last ${f.of} games with a lineup`
            + `${p.rating != null ? `, average rating ${Number(p.rating).toFixed(1)}` : ''}`
          : p.player_name,
      }
    }),
  }
}

const dayOf = (iso: string) => iso.slice(0, 10)

/** Every line is a fact about this fixture, not a general apology. */
const notes = computed(() => {
  if (confirmed.value) return ['Official starting XIs, as published before kick-off.']
  const out: string[] = []
  for (const s of ['home', 'away'] as Side[]) {
    const x = props.expected?.data?.[s]
    const name = props.game[`${s}_name`]
    if (!x || x.status !== 'ok') out.push(`No lineup history for ${name} this season: nothing to project.`)
    else out.push(`${name}: XI and formation from ${dayOf(x.source.date)}.`)
  }
  out.push('Under each name: starts in the club\'s last games with a lineup (hover: rating).')
  if (props.expected?.data?.availability === 'no_feed') {
    out.push('No injury or suspension feed: absences are not reflected.')
  }
  return out
})
</script>

<style scoped>
.xp-body { padding: 0.65rem; }
/* Four short notes: fixed, so the expected, confirmed and no-history states are the same size. */
.xp-strip {
  height: 96px; overflow-y: auto; margin: 0; padding: 0.55rem 0 0; list-style: none;
  font-size: 0.68rem; line-height: 1.5; color: var(--ink-mute);
}
</style>
