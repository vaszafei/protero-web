<template>
  <UiPageShell>
    <template #header>
      <div class="ph-head">
        <button class="btn btn-ghost btn-sm" @click="$router.back()">
          <UIcon name="i-heroicons-chevron-left" class="w-3.5 h-3.5" />
          Back
        </button>
        <div v-if="data?.found" class="ph-season">
          <div v-if="seasons.length > 1" class="seg">
            <button
              v-for="s in seasons.slice(0, 4)"
              :key="s"
              class="seg-item"
              :class="{ 'is-active': s === activeSeason }"
              @click="selectSeason(s)"
            >{{ shortSeason(s) }}</button>
          </div>
          <span v-else-if="activeSeason" class="ph-season-one">{{ activeSeason }}</span>
        </div>
      </div>
    </template>

    <!-- Loading: shape-matched, so nothing jumps when the data lands. -->
    <div v-if="pending" class="grid-12">
      <div class="col-3"><UiSkeletonPanel :rows="7" /></div>
      <div class="col-5"><UiSkeletonPanel :rows="8" /></div>
      <div class="col-4"><UiSkeletonPanel :rows="6" /></div>
      <div class="col-12"><UiSkeletonPanel :rows="6" /></div>
    </div>

    <div v-else-if="error" class="panel ph-error">
      <p class="ph-error-t">The player query failed.</p>
      <p class="ph-error-b">{{ error }}</p>
    </div>

    <!-- A player we genuinely do not hold, stated as such. -->
    <div v-else-if="!data?.found" class="panel ph-empty">
      <p class="ph-empty-t">No player with id <code>{{ route.params.id }}</code></p>
      <p class="ph-empty-b">
        Players are keyed by FlashScore entity id; a numeric stats.nba.com id resolves
        through <code>basketball_player_ids</code>. This id matches neither the football
        corpus (<code>lineups</code>) nor the basketball one
        (<code>basketball_player_games</code>).
      </p>
    </div>

    <template v-else>
      <div class="grid-12">
        <!-- Identity -->
        <div class="col-3 pane-in">
          <PlayerPlayerIdentity
            :player="data.player || {}"
            :sport="sport"
            :totals="data.totals"
            :team-names="teamNames"
          />
        </div>

        <!-- The hexagon -->
        <div class="col-5 pane-in" style="animation-delay: 60ms">
          <PlayerPlayerHexagon
            :axes="data.axes || []"
            :cohort="data.cohort || defaultCohort"
            :season="activeSeason"
            :sport="sport"
            :minutes="data.totals?.minutes"
          />
        </div>

        <!-- Third column: the court where a court is possible, the per-match
             trend otherwise. Never a dead column. -->
        <div class="col-4 pane-in" style="animation-delay: 120ms">
          <div v-if="sport === 'basketball' && hasZones" class="panel ph-court">
            <div class="panel-head">
              <span class="panel-title">Shooting</span>
              <span class="panel-link">{{ activeSeason }}</span>
            </div>
            <div class="ph-court-body">
              <PlayerShootingZones :zones="data.zones" />
            </div>
          </div>
          <PlayerPlayerTrend v-else :rows="data.log || []" :sport="sport" />
        </div>

        <!-- Season totals strip -->
        <div class="col-12 pane-in" style="animation-delay: 160ms">
          <div class="panel ph-totals">
            <div class="panel-head">
              <span class="panel-title">Season totals</span>
              <span class="panel-link">{{ activeSeason }}</span>
            </div>
            <div v-if="totalCards.length" class="ph-total-grid">
              <div v-for="t in totalCards" :key="t.k" class="ph-total">
                <div class="ph-total-v">
                  <UiCountUp :value="t.n" :decimals="t.dp || 0" />
                  <span v-if="t.suffix" class="ph-total-suffix">{{ t.suffix }}</span>
                </div>
                <div class="ph-total-k">{{ t.k }}</div>
              </div>
            </div>
            <p v-else class="ph-note">No totals recorded for {{ activeSeason }}.</p>
          </div>
        </div>

        <!-- Match log -->
        <div class="col-12 pane-in" style="animation-delay: 200ms">
          <PlayerPlayerMatchLog
            :rows="data.log || []"
            :sport="sport"
            :season="activeSeason"
          />
        </div>
      </div>
    </template>
  </UiPageShell>
</template>

<script setup lang="ts">
/**
 * One player.
 *
 * What this replaced: a `max-w-3xl` centred column — 768px on a 1600px
 * monitor — that defaulted `?league=nba` for EVERY id, so a football player
 * rendered as "Player #E77oeEa6 · NBA · 0 games" above three empty charts and
 * an empty "Season Averages" panel. Sport now comes from which corpus holds
 * the player (`player_resolve`), and the season defaults to the newest one
 * with data rather than `currentSeason()`.
 *
 * All of the aggregation — including the cohort percentiles the radar needs,
 * which require every comparable player's season and would hit PostgREST's
 * silent 1,000-row cap — happens in Postgres. See
 * `supabase-local/supabase/migrations/20260902100000_player_profile_rpc.sql`.
 */
import { ref, computed, watch } from 'vue'
import UiPageShell from '~/components/ui/PageShell.vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiCountUp from '~/components/ui/CountUp.vue'
import PlayerPlayerIdentity from '~/components/player/PlayerIdentity.vue'
import PlayerPlayerHexagon from '~/components/player/PlayerHexagon.vue'
import PlayerPlayerMatchLog from '~/components/player/PlayerMatchLog.vue'
import PlayerPlayerTrend from '~/components/player/PlayerTrend.vue'
import PlayerShootingZones from '~/components/player/ShootingZones.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

const route = useRoute()
const twins = useTwins()

const data = ref<any>(null)
const pending = ref(true)
const error = ref<string | null>(null)
const activeSeason = ref<string>('')
const teamNames = ref<Record<string, string>>({})

const defaultCohort = { n: 0, min_minutes: 0, label: 'players', subject_qualifies: false }

const sport = computed<'football' | 'basketball'>(() =>
  data.value?.sport === 'basketball' ? 'basketball' : 'football'
)
const seasons = computed<string[]>(() => data.value?.seasons || [])
const hasZones = computed(() =>
  Array.isArray(data.value?.zones) && data.value.zones.some((z: any) => Number(z?.att) > 0)
)

async function load(season?: string) {
  pending.value = true
  error.value = null
  try {
    const q = season ? `?season=${encodeURIComponent(season)}` : ''
    const res = await $fetch<any>(`/api/player/${route.params.id}/season${q}`)
    data.value = res
    activeSeason.value = res?.season || season || ''

    // Resolve the club ids in `teams_played` to names for the career list.
    const ids = Object.keys(res?.player?.teams_played || {})
    teamNames.value = ids.length ? await twins.fetchTeamNames(ids) : {}
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Unknown error'
    data.value = null
  } finally {
    pending.value = false
  }
}

function selectSeason(s: string) {
  if (s === activeSeason.value) return
  load(s)
}

const shortSeason = (s: string) => {
  const m = /^(\d{4})-(\d{4})$/.exec(s || '')
  return m ? `${m[1].slice(2)}/${m[2].slice(2)}` : s
}

/** The headline counting stats, per sport. */
const totalCards = computed(() => {
  const t = data.value?.totals
  if (!t) return []
  const num = (v: any) => (v == null ? null : Number(v))
  const rows: { k: string; n: number; dp?: number; suffix?: string }[] = []
  const add = (k: string, v: any, dp = 0, suffix = '') => {
    const n = num(v)
    if (n != null && !Number.isNaN(n)) rows.push({ k, n, dp, suffix })
  }

  if (sport.value === 'basketball') {
    add('Games', t.games)
    add('Minutes', t.minutes)
    add('Points', t.pts)
    add('Rebounds', t.reb)
    add('Assists', t.ast)
    add('Steals', t.stl)
    add('Blocks', t.blk)
    add('PTS / 36', t.pts36, 1)
    add('TS%', t.ts_pct, 1, '%')
    add('eFG%', t.efg_pct, 1, '%')
  } else {
    add('Apps', t.apps)
    add('Starts', t.starts)
    add('Minutes', t.minutes)
    add('Goals', t.goals)
    add('Assists', t.assists)
    add('Rating', t.rating, 2)
    add('xG', t.xg, 2)
    add('Shots', t.shots)
    add('On target', t.sot)
    add('Pass acc.', t.pass_acc, 1, '%')
  }
  return rows
})

watch(() => route.params.id, () => load(), { immediate: true })

useHead({
  title: computed(() => `${data.value?.player?.name || 'Player'} · Protero`),
})
</script>

<style scoped>
.ph-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
}
.ph-season { display: flex; align-items: center; gap: 0.5rem; }
.ph-season-one {
  font-size: 0.65rem; color: var(--ink-mute);
  font-variant-numeric: tabular-nums;
}

.ph-court-body { padding: 0.7rem; }

.ph-total-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 1px;
  background: var(--edge-soft);
}
.ph-total {
  padding: 0.6rem 0.7rem;
  background: var(--surface);
}
.ph-total-v {
  font-size: 1.05rem; font-weight: 700; color: var(--ink-strong);
  font-variant-numeric: tabular-nums; line-height: 1.15;
}
.ph-total-suffix { font-size: 0.7rem; font-weight: 600; color: var(--ink-mute); }
.ph-total-k {
  font-size: 0.55rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-faint); font-weight: 600; margin-top: 0.1rem;
}

.ph-note, .ph-error, .ph-empty { padding: 1rem; }
.ph-error-t, .ph-empty-t { font-size: 0.8rem; font-weight: 700; color: var(--ink-soft); }
.ph-error-t { color: var(--brand-red-hi); }
.ph-error-b, .ph-empty-b {
  margin-top: 0.35rem; font-size: 0.65rem; line-height: 1.6;
  color: var(--ink-faint); max-width: 60ch;
}
.ph-empty-b code, .ph-empty-t code {
  padding: 0.05rem 0.25rem; border-radius: var(--r-sm);
  background: var(--neutral-tint); color: var(--ink-soft); font-size: 0.95em;
}
.ph-note { font-size: 0.62rem; color: var(--ink-faint); }

@media (prefers-reduced-motion: reduce) {
  .pane-in { animation: none; }
}
</style>
