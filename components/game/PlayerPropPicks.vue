<template>
  <div v-if="!loading && picks.length > 0" class="mt-4 border-t border-edge/50 pt-4 space-y-3">

    <!-- Section Header -->
    <div class="flex items-center justify-between">
      <h4 class="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
        <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5 text-amber-400" />
        Player Props
      </h4>
      <span class="text-[10px] text-zinc-600">{{ picks.length }} picks</span>
    </div>

    <!-- Wallet Tabs -->
    <div class="flex gap-1 p-0.5 bg-surface-light/50 rounded-lg">
      <button
        v-for="tab in availableTabs"
        :key="tab.key"
        @click="activeWallet = tab.key"
        class="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-150"
        :class="activeWallet === tab.key
          ? tab.activeClass
          : 'text-zinc-500 hover:text-zinc-300'"
      >
        {{ tab.label }}
        <span
          class="text-[9px] font-bold px-1 py-0.5 rounded-full leading-none"
          :class="activeWallet === tab.key ? tab.badgeActive : 'bg-surface-light text-zinc-600'"
        >{{ tab.count }}</span>
      </button>
    </div>

    <!-- Picks List -->
    <div class="space-y-1">
      <div
        v-for="(pick, i) in currentPicks"
        :key="`${pick.player_name}-${pick.market}-${pick.line}-${pick.pick_type}`"
        class="flex items-center gap-2 px-2.5 py-2 rounded-lg"
        :class="i % 2 === 0 ? 'bg-surface-light/40' : 'bg-surface/30'"
      >
        <!-- Tier star -->
        <span v-if="pick.trad_tier === 1" class="text-amber-400 text-[11px] leading-none flex-shrink-0">★</span>
        <span v-else class="w-[11px] flex-shrink-0"></span>

        <!-- Player + Team -->
        <div class="flex-1 min-w-0">
          <span class="text-[12px] font-semibold text-zinc-200 truncate block leading-tight">{{ pick.player_name }}</span>
          <span class="text-[9px] uppercase tracking-wide text-zinc-600">{{ shortTeam(pick.team_name) }}</span>
        </div>

        <!-- Market pill -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <span class="text-[10px] font-bold text-zinc-400 bg-surface-light px-1.5 py-0.5 rounded leading-none">
            {{ marketLabel(pick.market) }} {{ pick.line }}
          </span>
          <span
            class="text-[11px] font-extrabold leading-none"
            :class="pick.direction === 'OVER' ? 'text-emerald-400' : 'text-purple-400'"
          >{{ pick.direction === 'OVER' ? '▲' : '▼' }}</span>
        </div>

        <!-- Wallet-specific metric -->
        <div class="text-right flex-shrink-0 min-w-[44px]">
          <!-- Traditional wallet -->
          <template v-if="activeWallet === 'trad'">
            <span class="text-[12px] font-bold" :class="tradScoreColor(pick.trad_score)">
              {{ pick.trad_score?.toFixed(1) }}
            </span>
            <span class="text-[9px] text-zinc-600 block leading-none">score</span>
          </template>
          <!-- FE Model wallet -->
          <template v-else-if="activeWallet === 'fe'">
            <span class="text-[12px] font-bold" :class="probColor(pick.fe_p_over)">
              {{ formatPct(pick.fe_p_over) }}
            </span>
            <span class="text-[9px] text-zinc-600 block leading-none">P(over)</span>
          </template>
          <!-- Sniper wallet -->
          <template v-else>
            <span class="text-[12px] font-bold text-purple-400">
              {{ pick.sniper_score?.toFixed(1) }}
            </span>
            <span class="text-[9px] text-zinc-600 block leading-none">score</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Expanded metrics row (appears on tap for mobile) — shows sub-stats for active wallet -->
    <div v-if="currentPicks.length > 0 && activeWallet === 'trad'" class="px-1">
      <div class="grid grid-cols-3 gap-1 text-center">
        <div class="bg-surface-light/30 rounded-lg px-2 py-1.5">
          <span class="text-[9px] text-zinc-600 block uppercase tracking-wide">Season HR</span>
          <span class="text-[11px] font-bold text-zinc-300">
            {{ avgOf('season_hr') }}%
          </span>
        </div>
        <div class="bg-surface-light/30 rounded-lg px-2 py-1.5">
          <span class="text-[9px] text-zinc-600 block uppercase tracking-wide">Last 10 HR</span>
          <span class="text-[11px] font-bold text-zinc-300">
            {{ avgOf('l10_hr') }}%
          </span>
        </div>
        <div class="bg-surface-light/30 rounded-lg px-2 py-1.5">
          <span class="text-[9px] text-zinc-600 block uppercase tracking-wide">H2H HR</span>
          <span class="text-[11px] font-bold text-zinc-300">
            {{ avgOf('h2h_hr') }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Sniper signals legend when sniper tab active -->
    <div v-if="activeWallet === 'sniper' && topSniperSignals.length > 0" class="flex flex-wrap gap-1 px-1">
      <span
        v-for="sig in topSniperSignals"
        :key="sig"
        class="text-[9px] text-purple-300/80 bg-purple-900/20 border border-purple-700/30 px-1.5 py-0.5 rounded-full"
      >{{ sig }}</span>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const props = defineProps<{
  gameId: number
}>()

const api = useApi()
const picks = ref<any[]>([])
const loading = ref(true)
const activeWallet = ref('trad')

onMounted(async () => {
  try {
    picks.value = await api.fetchPlayerPropPicks(props.gameId)
    // Default to fe if no trad picks, sniper if only sniper
    if (tradPicks.value.length === 0 && fePicks.value.length > 0) {
      activeWallet.value = 'fe'
    } else if (tradPicks.value.length === 0 && sniperPicks.value.length > 0) {
      activeWallet.value = 'sniper'
    }
  } catch (e) {
    // silently fail — props aren't available for all games
  } finally {
    loading.value = false
  }
})

// ─── Grouped picks ────────────────────────────────────────
const tradPicks = computed(() =>
  picks.value
    .filter(p => p.pick_type === 'tier1' || p.pick_type === 'tier2')
    // Deduplicate by (player+market+line): prefer tier1
    .reduce((acc: any[], p) => {
      const key = `${p.player_name}|${p.market}|${p.line}`
      if (!acc.find((x: any) => `${x.player_name}|${x.market}|${x.line}` === key)) acc.push(p)
      return acc
    }, [])
    .sort((a, b) => (b.trad_score ?? 0) - (a.trad_score ?? 0))
)

const fePicks = computed(() =>
  picks.value
    .filter(p => p.pick_type === 'fe_lock' || p.pick_type === 'consensus')
    .reduce((acc: any[], p) => {
      const key = `${p.player_name}|${p.market}|${p.line}`
      if (!acc.find((x: any) => `${x.player_name}|${x.market}|${x.line}` === key)) acc.push(p)
      return acc
    }, [])
    .sort((a, b) => (b.fe_p_over ?? 0) - (a.fe_p_over ?? 0))
)

const sniperPicks = computed(() =>
  picks.value
    .filter(p => p.pick_type === 'sniper')
    .sort((a, b) => (b.sniper_score ?? 0) - (a.sniper_score ?? 0))
)

// ─── Tab config ───────────────────────────────────────────
const availableTabs = computed(() => {
  const tabs = []
  if (tradPicks.value.length > 0) {
    tabs.push({
      key: 'trad',
      label: 'Traditional',
      count: tradPicks.value.length,
      activeClass: 'bg-amber-500/20 text-amber-300',
      badgeActive: 'bg-amber-500/30 text-amber-300'
    })
  }
  if (fePicks.value.length > 0) {
    tabs.push({
      key: 'fe',
      label: 'FE Model',
      count: fePicks.value.length,
      activeClass: 'bg-cyan-500/20 text-cyan-300',
      badgeActive: 'bg-cyan-500/30 text-cyan-300'
    })
  }
  if (sniperPicks.value.length > 0) {
    tabs.push({
      key: 'sniper',
      label: 'Sniper',
      count: sniperPicks.value.length,
      activeClass: 'bg-purple-500/20 text-purple-300',
      badgeActive: 'bg-purple-500/30 text-purple-300'
    })
  }
  return tabs
})

const currentPicks = computed(() => {
  if (activeWallet.value === 'fe') return fePicks.value
  if (activeWallet.value === 'sniper') return sniperPicks.value
  return tradPicks.value
})

// ─── Sniper signals summary ───────────────────────────────
const topSniperSignals = computed(() => {
  const sigCounts: Record<string, number> = {}
  for (const p of sniperPicks.value) {
    const sigs: string[] = Array.isArray(p.sniper_signals) ? p.sniper_signals : []
    for (const s of sigs) {
      const tag = s.split('+')[0] // e.g. "H2H" from "H2H+2.5σ(n=2)"
      sigCounts[tag] = (sigCounts[tag] || 0) + 1
    }
  }
  return Object.entries(sigCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t, n]) => `${t} ×${n}`)
})

// ─── Helpers ──────────────────────────────────────────────
function marketLabel(market: string) {
  const map: Record<string, string> = {
    points: 'PTS', rebounds: 'REB', assists: 'AST',
    three_pointers: '3PM', blocks: 'BLK', steals: 'STL',
    pts: 'PTS', reb: 'REB', ast: 'AST'
  }
  return map[market] || market.toUpperCase().slice(0, 3)
}

function shortTeam(teamName?: string) {
  if (!teamName) return ''
  const parts = teamName.split(' ')
  return parts[parts.length - 1].toUpperCase()
}

function formatPct(val?: number) {
  if (val == null) return '—'
  return Math.round(val * 100) + '%'
}

function probColor(val?: number) {
  if (val == null) return 'text-zinc-400'
  if (val >= 0.80) return 'text-emerald-400'
  if (val >= 0.70) return 'text-cyan-300'
  return 'text-zinc-300'
}

function tradScoreColor(val?: number) {
  if (val == null) return 'text-zinc-400'
  if (val >= 7) return 'text-amber-400'
  if (val >= 5) return 'text-zinc-200'
  return 'text-zinc-400'
}

function avgOf(key: string) {
  const vals = currentPicks.value.map((p: any) => p[key]).filter((v: any) => v != null)
  if (vals.length === 0) return '—'
  return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length)
}
</script>
