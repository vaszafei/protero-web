<template>
  <section class="panel panel-fill" :data-testid="`bball-players-${side}`">
    <header class="panel-head">
      <span class="panel-title">Players</span>
      <span class="pill" :class="side === 'home' ? 'pill-blue' : 'pill-red'">{{ teamName }}</span>
      <label class="ml-auto inline-flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-zinc-500">
        <input type="checkbox" v-model="showDNP" class="accent-[#4d8fff] w-3.5 h-3.5 rounded" />
        <span>Show DNP</span>
      </label>
    </header>

    <div class="panel-scroll">
      <table v-if="activePlayers.length" class="w-full text-[12px]">
        <thead class="sticky top-0 bg-surface z-10">
          <tr class="border-b border-edge text-zinc-500 text-[10px] uppercase tracking-wider">
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'py-1.5 font-medium select-none cursor-pointer transition-colors hover:text-zinc-300',
                col.align === 'left' ? 'text-left pl-3 pr-1' : 'text-center px-0.5',
                sortKey === col.key ? 'text-[#4d8fff]' : ''
              ]"
              @click="toggleSort(col.key)"
            >{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="player in activePlayers"
            :key="player.id || player.name"
            class="border-b border-edge/50 hover:bg-surface-light/50 transition-colors cursor-pointer select-none"
            :class="isDNP(player) ? 'opacity-50' : ''"
            @click="openPlayerModal(player)"
          >
            <td class="py-1 pl-3 pr-1">
              <span class="text-zinc-200 font-medium truncate max-w-[120px] block">{{ formatName(player.name) }}</span>
            </td>
            <td class="text-center py-1 px-0.5 text-zinc-400 tabular-nums">{{ formatMin(player) }}</td>
            <td class="text-center py-1 px-0.5 font-semibold tabular-nums" :class="(player.pts ?? 0) >= 20 ? 'text-emerald-400' : (player.pts ?? 0) >= 10 ? 'text-zinc-200' : 'text-zinc-400'">{{ dash(player.pts) }}</td>
            <td class="text-center py-1 px-0.5 text-zinc-300 tabular-nums">{{ dash(player.reb) }}</td>
            <td class="text-center py-1 px-0.5 text-zinc-300 tabular-nums">{{ dash(player.ast) }}</td>
            <td class="text-center py-1 px-0.5 text-zinc-300 tabular-nums">{{ dash(player.stl) }}</td>
            <td class="text-center py-1 px-0.5 text-zinc-300 tabular-nums">{{ dash(player.blk) }}</td>
            <td class="text-center py-1 px-0.5 tabular-nums" :class="pctClass(playerFgPct(player))">{{ playerFgPct(player) != null ? playerFgPct(player) + '%' : '—' }}</td>
            <td class="text-center py-1 px-0.5 tabular-nums" :class="pctClass(playerThreePct(player))">{{ playerThreePct(player) != null ? playerThreePct(player) + '%' : '—' }}</td>
            <td class="text-center py-1 px-0.5 tabular-nums" :class="pctClass(playerFtPct(player))">{{ playerFtPct(player) != null ? playerFtPct(player) + '%' : '—' }}</td>
            <td class="text-center py-1 px-0.5 tabular-nums" :class="(player.tov ?? 0) > 3 ? 'text-red-400' : 'text-zinc-400'">{{ dash(player.tov) }}</td>
            <td class="text-center py-1 px-0.5 tabular-nums font-medium" :class="(player.pm ?? 0) > 0 ? 'text-emerald-400' : (player.pm ?? 0) < 0 ? 'text-red-400' : 'text-zinc-500'">{{ player.pm == null ? '—' : (player.pm > 0 ? '+' : '') + player.pm }}</td>
            <td class="text-center py-1 px-0.5 pr-2 tabular-nums font-semibold text-amber-300">{{ playerFpts(player).toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="py-6 text-center text-sm text-zinc-500">No player rows are stored for this team.</p>

      <div v-if="activeCoach" class="px-3 py-2 text-xs text-zinc-500 flex items-center gap-2">
        <span class="font-medium text-zinc-400">Coach:</span>
        <span>{{ formatName(activeCoach) }}</span>
      </div>
    </div>

    <!-- Player season modal (season stats + charts) -->
    <GamePlayerSeasonModal
      :open="modalOpen"
      :player="modalPlayer"
      :league-key="leagueKey"
      @close="closeModal"
    />
  </section>
</template>

<script setup lang="ts">
import { boxPlayer, didNotPlay, type BoxPlayer } from '~/utils/basketball-box'

const props = defineProps({
  sportStats: { type: Object as () => Record<string, any>, required: true },
  /** One panel per team: the rail it sits in names the side. */
  side: { type: String as () => 'home' | 'away', required: true },
  teamName: { type: String, default: '' },
  leagueKey: { type: String, default: 'nba' },
})

const modalOpen = ref(false)
const modalPlayer = ref<any>(null)

// ── Sort + filter state ────────────────────────────────
const showDNP = ref(false)
const sortKey = ref('pts')
const sortDir = ref('desc')

const columns = [
  { key: 'name', label: 'Player', align: 'left' },
  { key: 'min',  label: 'MIN', align: 'center' },
  { key: 'pts',  label: 'PTS', align: 'center' },
  { key: 'reb',  label: 'REB', align: 'center' },
  { key: 'ast',  label: 'AST', align: 'center' },
  { key: 'stl',  label: 'STL', align: 'center' },
  { key: 'blk',  label: 'BLK', align: 'center' },
  { key: 'fg%',  label: 'FG%', align: 'center' },
  { key: '3p%',  label: '3P%', align: 'center' },
  { key: 'ft%',  label: 'FT%', align: 'center' },
  { key: 'tov',  label: 'TO', align: 'center' },
  { key: 'pm',   label: '+/-', align: 'center' },
  { key: 'fpts', label: 'FPTS', align: 'center' },
]

function toggleSort(key: string) {
  if (key === sortKey.value) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 'asc' : 'desc'
  }
}

/** `boxPlayer` carries nulls for what the feed lacks; the original row rides along for the season modal. */
type Row = BoxPlayer & { raw: any }
const normalizePlayer = (p: any): Row => ({ ...boxPlayer(p), raw: p })

const activePlayers = computed(() => {
  const team = props.sportStats?.[props.side]
  if (!team?.players) return []
  let list: Row[] = team.players.map(normalizePlayer)
  if (!showDNP.value) list = list.filter(p => !didNotPlay(p))
  const dir = sortDir.value === 'desc' ? -1 : 1
  const key = sortKey.value
  list.sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    if (va === vb) return 0
    return va < vb ? -dir : dir
  })
  return list
})

const isDNP = didNotPlay

/** A stat the feed does not carry reads as a dash, never a 0. */
const dash = (v: number | null) => (v == null ? '—' : v)

const rate = (made: number | null, att: number | null) =>
  att ? Math.round(((made ?? 0) / att) * 100) : null
const playerFgPct = (p: BoxPlayer) => rate(p.fgm, p.fga)
const playerThreePct = (p: BoxPlayer) => rate(p.fg3m, p.fg3a)
const playerFtPct = (p: BoxPlayer) => rate(p.ftm, p.fta)

// DraftKings-style fantasy points (no double-double bonus, kept simple).
function playerFpts(p: BoxPlayer) {
  return (p.pts ?? 0) * 1
       + (p.fg3m ?? 0) * 0.5
       + (p.reb ?? 0) * 1.25
       + (p.ast ?? 0) * 1.5
       + (p.stl ?? 0) * 2
       + (p.blk ?? 0) * 2
       - (p.tov ?? 0) * 0.5
}

function pctClass(pct: number | null) {
  if (pct == null) return 'text-zinc-600'
  if (pct >= 50) return 'text-emerald-400'
  if (pct >= 40) return 'text-zinc-300'
  if (pct >= 30) return 'text-amber-400'
  return 'text-red-400'
}

function sortValue(p: Row, key: string) {
  switch (key) {
    case 'name': return (p.name || '').toLowerCase()
    case 'min':  return p.minutes ?? -1
    case 'fg%':  return playerFgPct(p) ?? -1
    case '3p%':  return playerThreePct(p) ?? -1
    case 'ft%':  return playerFtPct(p) ?? -1
    case 'fpts': return playerFpts(p)
    default:     return (p as any)[key] ?? -1
  }
}

const activeCoach = computed(() => props.sportStats?.[props.side]?.coach || null)

function openPlayerModal(player: Row) {
  modalPlayer.value = { ...player.raw, ...player }
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalPlayer.value = null
}

const formatMin = (p: BoxPlayer) => {
  if (p.clock) return p.clock
  if (p.minutes == null) return '—'
  return `${Math.round(p.minutes)}:00`
}

const formatName = (name: string) => {
  if (!name) return ''
  const parts = name.split(', ')
  if (parts.length === 2) {
    const last = parts[0].charAt(0) + parts[0].slice(1).toLowerCase()
    const first = parts[1].charAt(0) + '.'
    return `${first} ${last}`
  }
  return name.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
}
</script>
