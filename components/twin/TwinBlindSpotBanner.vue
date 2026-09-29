<template>
  <div v-if="lines.length" class="dc-strip">
    <span class="dc-tag">Division change</span>
    <p v-for="l in lines" :key="l.side" class="dc-line">
      <span class="dc-team" :style="{ color: l.color }">{{ l.team }}</span>
      {{ l.text }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * One line per club that changed division recently enough for its rating to
 * still lean on the old one.
 *
 * `twin_fixture_risk` flags a club when the decay-weighted bulk of its rating's
 * evidence sits in another division (`ml/twins/persist.py`). Until 2026-09-29
 * that used ALL-TIME game counts, so Eibar — in its sixth La Liga 2 season —
 * was flagged as "learned in La Liga". The old banner then explained the flag
 * in twin-layer vocabulary ("carry", "over-confident") without ever saying the
 * one thing a reader needs: who went up or down, and when.
 */
import { computed } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import { prettyLeagueKey } from '~/utils/league-name'

const props = defineProps<{
  /** One `twin_fixture_risk` row, or null when neither club is flagged. */
  risk: Record<string, any> | null
  /** Each club's most recent `twin_league_transitions` row, if any. */
  moves?: { home: Record<string, any> | null; away: Record<string, any> | null }
}>()

const startYear = (season: string | null | undefined) => Number(String(season || '').slice(0, 4)) || null

function lineFor(side: 'home' | 'away') {
  const r = props.risk
  if (!r) return null
  const flagged = r.blind_side === side || r.blind_side === 'both'
  if (!flagged) return null
  const team = side === 'home' ? r.home_team : r.away_team
  const games = Number(side === 'home' ? r.home_games_in_league : r.away_games_in_league) || 0
  const evidence = side === 'home' ? r.home_evidence_league : r.away_evidence_league
  const league = prettyLeagueKey(r.league_key)
  const move = props.moves?.[side] || null

  const played = `${games} ${league} game${games === 1 ? '' : 's'} so far`
  let what: string
  if (move && move.to_league === r.league_key) {
    const verb = move.direction === 'promoted' ? 'promoted' : move.direction === 'relegated' ? 'relegated' : 'moved'
    const when = startYear(move.to_season) === startYear(r.season) ? 'this summer' : `in ${startYear(move.to_season)}`
    what = `${verb} from ${prettyLeagueKey(move.from_league)} ${when} — ${played}.`
  } else {
    what = `new to ${league} — ${played}.`
  }
  return {
    side,
    team,
    color: side === 'home' ? VIZ_HOME : VIZ_AWAY,
    text: `${what} Its rating is still built mostly on ${prettyLeagueKey(evidence)} matches, so read it with less confidence until more ${league} games are in.`,
  }
}

const lines = computed(() => [lineFor('home'), lineFor('away')].filter((l): l is NonNullable<typeof l> => l != null))
</script>

<style scoped>
.dc-strip {
  display: flex; align-items: baseline; gap: 0.3rem 0.75rem; flex-wrap: wrap;
  padding: 0.45rem 0.8rem;
  border-radius: var(--r);
  border: 1px solid rgba(250, 178, 25, 0.28);
  background: var(--warning-tint);
}
.dc-tag {
  font-size: 0.66rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 0.12rem 0.45rem; border-radius: var(--r-pill);
  background: rgba(250, 178, 25, 0.18); color: #f5c75a;
}
.dc-line { font-size: 0.78rem; color: #eadbb8; line-height: 1.45; flex: 1 1 32rem; }
.dc-team { font-weight: 700; }
</style>
