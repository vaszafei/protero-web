<template>
  <div class="team-rail panel-glass rounded-lg overflow-hidden h-full" :class="{ 'team-rail--mirror': mirror }">
    <!-- Team identity — same shell as TeamStatsRail so the two rails are one
         object that changes contents at kick-off, not two different cards. -->
    <div
      class="flex items-center gap-2.5 px-3 sm:px-4 pt-3 pb-2.5"
      :class="mirror ? 'flex-row-reverse' : ''"
    >
      <div class="rail-glow">
        <img
          v-if="logo && !logoError"
          :src="logo"
          :alt="name"
          class="w-8 h-8 sm:w-9 sm:h-9 object-contain"
          @error="logoError = true"
        />
        <div v-else class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border"
          :style="{ background: `${color}1f`, borderColor: `${color}33` }">
          <span class="text-[11px] font-extrabold" :style="{ color: `${color}b3` }">{{ abbr }}</span>
        </div>
      </div>
      <div class="min-w-0" :class="mirror ? 'text-right' : ''">
        <p class="text-xs sm:text-sm font-semibold text-zinc-200 truncate">{{ name }}</p>
        <p class="text-[10px] text-zinc-500">{{ mirror ? 'Away' : 'Home' }}</p>
      </div>
    </div>

    <div class="h-px mx-3" :style="{ background: divider }" />

    <div class="px-3 sm:px-4 py-2.5 space-y-3">
      <!-- ── FORM ─────────────────────────────────────────────────────────
           Six chips, most recent first. Every chip carries its match in a
           tooltip — a bare W/D/L strip says a club won without saying who
           against, which for form is most of the information. -->
      <div v-if="form.length">
        <div class="flex items-center justify-between gap-2 mb-1.5" :class="mirror ? 'flex-row-reverse' : ''">
          <span class="rail-k">Form</span>
          <span class="rail-sub tabular-nums">{{ formSummary }}</span>
        </div>
        <div class="flex items-center gap-1" :class="mirror ? 'justify-end flex-row-reverse' : ''">
          <UiTooltip
            v-for="f in form"
            :key="f.game_id"
            :width="230"
          >
            <span class="chip-wdl" :class="`chip-${f.result.toLowerCase()}`">{{ f.result }}</span>
            <template #content>
              <p class="fr-tip-h">{{ f.home ? 'vs' : 'at' }} {{ f.opponent }}</p>
              <p class="fr-tip-b tabular-nums">{{ f.gf }}–{{ f.ga }} · {{ shortDate(f.date) }}</p>
              <p class="fr-tip-c">{{ competitionLabel(f.league_key) }}</p>
            </template>
          </UiTooltip>
        </div>
        <p v-if="crossCompetition" class="rail-note">{{ crossCompetition }}</p>
      </div>

      <!-- ── TWIN RATINGS ─────────────────────────────────────────────────
           Both measures are higher-is-better: `defence` is log-rate
           suppression, not goals conceded. The scale is the competition's own
           fitted range, because 0.60 means nothing without the other 19 clubs. -->
      <!-- Meters need BOTH a fitted club and a peer set for the competition to
           scale against. A cup tie has the first and not the second, so the
           ratings are still shown — just without a scale they would misread. -->
      <template v-if="twin?.fitted && meters.length">
        <div v-for="m in meters" :key="m.key" class="rail-meter">
          <div class="flex items-center justify-between gap-2" :class="mirror ? 'flex-row-reverse' : ''">
            <span class="rail-k">{{ m.label }}</span>
            <span class="rail-v tabular-nums" :style="{ color }">
              {{ m.value.toFixed(2) }}<span class="rail-sd">±{{ m.sd.toFixed(2) }}</span>
            </span>
          </div>
          <div class="rail-scale">
            <i class="rail-scale-line" />
            <!-- The competition's mean, so the club's dot reads as above or below it. -->
            <UiTooltip :text="`${leagueLabel} average ${m.mean.toFixed(2)}`" placement="bottom">
              <i class="rail-mean" :style="{ left: m.meanPos + '%' }" />
            </UiTooltip>
            <!-- ±1 SD of the club's own fit: how sure the twin is. -->
            <i class="rail-band" :style="{ left: m.bandLeft + '%', width: m.bandWidth + '%', background: `${color}33` }" />
            <i class="rail-dot" :style="{ left: m.pos + '%', background: color }" />
          </div>
        </div>

        <p class="rail-note">
          {{ evidenceNote }}
          <UiTooltip
            v-if="twin.league_changed"
            :width="260"
            :text="`Learned in ${competitionLabel(twin.evidence_league)}, not in ${leagueLabel}. The banner below the scorecard has the full context.`"
          >
            <span class="pill pill-amber rail-carry">carried</span>
          </UiTooltip>
        </p>
      </template>

      <div v-else-if="twin?.fitted" class="rail-meter">
        <div class="flex items-center justify-between gap-2" :class="mirror ? 'flex-row-reverse' : ''">
          <span class="rail-k">Attack / Defence</span>
          <span class="rail-v tabular-nums" :style="{ color }">
            {{ twin.attack.toFixed(2) }} / {{ twin.defence.toFixed(2) }}
          </span>
        </div>
        <p class="rail-note">
          League-invariant twin ratings, higher is better on both. No fitted peer set for
          {{ leagueLabel }}, so there is no scale to read them against.
        </p>
      </div>

      <p v-else-if="twin" class="rail-note">
        The twin declined to fit this club — {{ twin.total_games ?? 0 }} matches on record is
        too little evidence for a rating, so none is shown rather than a confident guess.
      </p>

      <p v-if="!form.length && !twin?.fitted" class="text-[11px] text-zinc-600 text-center py-6">
        No history for this club yet
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The pre-match side rail.
 *
 * `TeamStatsRail` reads the scalar match-stat columns, every one of which is
 * NULL until the game is played — so a scheduled fixture rendered "No stats
 * recorded" on both flanks and threw away half the page. This shows the two
 * things that do exist beforehand: the club's last six results, and its
 * league-invariant twin rating against the competition it plays in.
 */
import { computed, ref, watch } from 'vue'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'
import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'
import UiTooltip from '~/components/ui/Tooltip.vue'

const props = defineProps<{
  side: 'home' | 'away'
  /** One side of `/api/game/[id]/preview`. */
  data: Record<string, any> | null
  /** `league` from the same payload — the peer mean/sd the meters plot against. */
  league: Record<string, any> | null
  leagueKey: string
  teamKey?: string | null
  mirror?: boolean
}>()

const color = computed(() => (props.side === 'home' ? VIZ_HOME : VIZ_AWAY))
const name = computed(() => props.data?.name || '')
const form = computed<any[]>(() => props.data?.form || [])
const twin = computed<any>(() => props.data?.twin || null)

const logoError = ref(false)
watch(() => props.data?.team_id, () => { logoError.value = false })

const logo = computed(() => getTeamLogoUrl(props.teamKey || undefined))
const abbr = computed(() => teamAbbreviation(name.value))

const divider = computed(() =>
  props.mirror
    ? `linear-gradient(270deg, ${color.value}26, transparent)`
    : `linear-gradient(90deg, ${color.value}26, transparent)`
)

/**
 * There is no shared league-name map in this app — `OpsLiveSlate` de-underscores
 * the key and so does this. Adding a hand-kept map here would be a fourth place
 * to forget a competition.
 */
const ACRONYMS = new Set(['efl', 'fa', 'dfb', 'acb', 'bcl', 'nba', 'gbl', 'ec'])
const competitionLabel = (key: string | null | undefined) =>
  key
    ? key
        .split('_')
        .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ')
    : 'Unknown'

const leagueLabel = computed(() => competitionLabel(props.leagueKey))

const formSummary = computed(() => {
  const f = form.value
  if (!f.length) return ''
  const w = f.filter((x) => x.result === 'W').length
  const d = f.filter((x) => x.result === 'D').length
  // Basketball has no draws, and neither does a football run that happens to
  // have none — printing "0D" in either case is noise.
  return d ? `${w}W ${d}D ${f.length - w - d}L` : `${w}W ${f.length - w}L`
})

/**
 * Form is not filtered to this competition — a cup tie is a match the club
 * played. When the strip mixes competitions, say so, because otherwise a run
 * of wins over lower-division opposition reads as league form.
 */
const crossCompetition = computed(() => {
  const others = new Set(
    form.value.filter((f) => f.league_key !== props.leagueKey).map((f) => f.league_key)
  )
  if (!others.size) return ''
  const names = [...others].map(competitionLabel)
  return `Includes ${names.join(', ')}.`
})

const shortDate = (iso: string) => {
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Position on the competition's fitted range. The range is padded by half an SD
 * on each side so the top and bottom club do not sit exactly on the rail's ends.
 */
function scaleFor(key: 'attack' | 'defence') {
  const peer = props.league?.[key]
  const t = twin.value
  if (!peer || !t) return null
  const value = t[key]
  const sd = t[`${key}_sd`]
  if (value == null) return null
  const pad = (peer.sd || 0.1) * 0.5
  const lo = Math.min(peer.min, value) - pad
  const hi = Math.max(peer.max, value) + pad
  const span = hi - lo || 1
  const at = (v: number) => Math.max(0, Math.min(100, ((v - lo) / span) * 100))
  const bandL = sd != null ? at(value - sd) : at(value)
  const bandR = sd != null ? at(value + sd) : at(value)
  return {
    key,
    label: key === 'attack' ? 'Attack' : 'Defence',
    value,
    sd: sd ?? 0,
    mean: peer.mean,
    pos: at(value),
    meanPos: at(peer.mean),
    bandLeft: bandL,
    bandWidth: Math.max(1, bandR - bandL),
  }
}

const meters = computed(() =>
  [scaleFor('attack'), scaleFor('defence')].filter((m): m is NonNullable<typeof m> => m != null))

/**
 * `effective_games` is the twin's own honesty column — the weight behind the
 * rating after decay, not the raw match count. A rating on 8 effective games
 * is a different object from one on 70 and should not look the same.
 */
const evidenceNote = computed(() => {
  const eg = twin.value?.effective_games
  if (eg == null) return ''
  const rounded = Math.round(eg)
  if (rounded < 12) {
    return `Fitted on ${rounded} effective matches — thin evidence, so the ±band is wide and the rating may move a lot.`
  }
  return `Fitted on ${rounded} effective matches. The band is ±1 SD of the twin's own fit.`
})
</script>

<style scoped>
.team-rail {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.02);
}
.rail-glow { filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.06)); }

.rail-k {
  font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-mute); font-weight: 500;
}
.rail-sub { font-size: 0.62rem; color: var(--ink-faint); }
.rail-v { font-size: 0.85rem; font-weight: 700; }
.rail-sd { font-size: 0.6rem; opacity: 0.6; margin-left: 0.15rem; font-weight: 500; }

.rail-meter { display: grid; gap: 0.3rem; }
.rail-scale { position: relative; height: 0.7rem; }
.rail-scale-line {
  position: absolute; left: 0; right: 0; top: 50%; height: 2px; margin-top: -1px;
  border-radius: var(--r-pill); background: var(--surface-hover);
}
.rail-band {
  position: absolute; top: 50%; height: 0.34rem; margin-top: -0.17rem;
  border-radius: var(--r-pill);
}
.rail-mean {
  position: absolute; top: 0.05rem; bottom: 0.05rem; width: 1px;
  background: var(--edge-lit); cursor: help;
}
.rail-dot {
  position: absolute; top: 50%; width: 0.45rem; height: 0.45rem;
  margin-top: -0.225rem; margin-left: -0.225rem; border-radius: 50%;
  box-shadow: 0 0 0 2px var(--surface);
}

.rail-note { font-size: 0.6rem; color: var(--ink-faint); line-height: 1.5; margin-top: 0.15rem; }
.rail-note-warn { color: #f0c469; }
.rail-carry { margin-left: 0.25rem; vertical-align: baseline; cursor: help; }

.fr-tip-h { font-size: 0.72rem; font-weight: 600; }
.fr-tip-b { font-size: 0.7rem; color: var(--ink-soft); margin-top: 0.1rem; }
.fr-tip-c { font-size: 0.64rem; color: var(--ink-mute); margin-top: 0.1rem; }
</style>
