<template>
  <div>
    <!-- Team Toggle -->
    <div class="flex bg-surface-light rounded-lg p-0.5 mb-3">
      <button
        @click="activeTeam = 'home'"
        :class="[
          'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all truncate',
          activeTeam === 'home'
            ? 'bg-surface text-zinc-100 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'
        ]"
      >
        {{ homeName }}
      </button>
      <button
        @click="activeTeam = 'away'"
        :class="[
          'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all truncate',
          activeTeam === 'away'
            ? 'bg-surface text-zinc-100 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200'
        ]"
      >
        {{ awayName }}
      </button>
    </div>

    <!-- Toolbar: DNP filter + active sort hint -->
    <div class="flex items-center justify-between mb-2 text-[11px] text-zinc-500">
      <label class="inline-flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          v-model="showDNP"
          class="accent-[#4d8fff] w-3.5 h-3.5 rounded"
        />
        <span>Show DNP</span>
      </label>
      <span class="tabular-nums">
        Sorted by
        <span class="text-zinc-300 font-semibold uppercase">{{ sortKey }}</span>
        <UIcon
          :name="sortDir === 'desc' ? 'i-heroicons-arrow-down' : 'i-heroicons-arrow-up'"
          class="inline w-3 h-3 ml-0.5 -mt-0.5"
        />
      </span>
    </div>

    <!-- Player Table -->
    <div class="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
      <table class="w-full text-sm min-w-[720px]">
        <thead>
          <tr class="border-b border-edge text-zinc-500 text-xs uppercase tracking-wider">
            <th
              v-for="col in columns"
              :key="col.key"
              :class="[
                'py-2 font-medium select-none cursor-pointer transition-colors hover:text-zinc-300',
                col.align === 'left' ? 'text-left pr-2' : 'text-center px-1',
                col.width,
                sortKey === col.key ? 'text-[#4d8fff]' : ''
              ]"
              @click="toggleSort(col.key)"
            >
              <span class="inline-flex items-center gap-0.5">
                {{ col.label }}
                <UIcon
                  v-if="sortKey === col.key"
                  :name="sortDir === 'desc' ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
                  class="w-3 h-3"
                />
              </span>
            </th>
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
            <td class="py-2 pr-2">
              <span class="text-zinc-200 font-medium truncate max-w-[140px] block">{{ formatName(player.name) }}</span>
            </td>
            <td class="text-center py-2 px-1 text-zinc-400 tabular-nums text-xs">{{ formatMin(player.min, player.minutes) }}</td>
            <td class="text-center py-2 px-1 font-semibold tabular-nums" :class="player.pts >= 20 ? 'text-emerald-400' : player.pts >= 10 ? 'text-zinc-200' : 'text-zinc-400'">{{ player.pts }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.reb }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.ast }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.stl }}</td>
            <td class="text-center py-2 px-1 text-zinc-300 tabular-nums">{{ player.blk }}</td>
            <td class="text-center py-2 px-1 tabular-nums text-xs" :class="pctClass(playerFgPct(player))">{{ playerFgPct(player) != null ? playerFgPct(player) + '%' : '—' }}</td>
            <td class="text-center py-2 px-1 tabular-nums text-xs" :class="pctClass(playerThreePct(player))">{{ playerThreePct(player) != null ? playerThreePct(player) + '%' : '—' }}</td>
            <td class="text-center py-2 px-1 tabular-nums text-xs" :class="pctClass(playerFtPct(player))">{{ playerFtPct(player) != null ? playerFtPct(player) + '%' : '—' }}</td>
            <td class="text-center py-2 px-1 tabular-nums" :class="(player.tov || 0) > 3 ? 'text-red-400' : 'text-zinc-400'">{{ player.tov ?? 0 }}</td>
            <td class="text-center py-2 px-1 tabular-nums font-medium" :class="player.pm > 0 ? 'text-emerald-400' : player.pm < 0 ? 'text-red-400' : 'text-zinc-500'">{{ player.pm > 0 ? '+' : '' }}{{ player.pm }}</td>
            <td class="text-center py-2 px-1 tabular-nums font-semibold text-amber-300">{{ playerFpts(player).toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Coach -->
    <div v-if="activeCoach" class="mt-3 text-xs text-zinc-500 flex items-center gap-2">
      <span class="font-medium text-zinc-400">Coach:</span>
      <span>{{ formatName(activeCoach) }}</span>
    </div>

    <!-- Player season modal (season stats + charts) -->
    <GamePlayerSeasonModal
      :open="modalOpen"
      :player="modalPlayer"
      :league-key="leagueKey"
      @close="closeModal"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  sportStats: { type: Object, required: true },
  homeName: { type: String, default: 'Home' },
  awayName: { type: String, default: 'Away' },
  leagueKey: { type: String, default: 'nba' },
})

const activeTeam = ref('home')
const modalOpen = ref(false)
const modalPlayer = ref(null)

// ── Sort + filter state ────────────────────────────────
const showDNP = ref(false)
const sortKey = ref('pts')
const sortDir = ref('desc')

const columns = [
  { key: 'name', label: 'Player', width: '',     align: 'left'  },
  { key: 'min',  label: 'MIN',    width: 'w-12', align: 'center' },
  { key: 'pts',  label: 'PTS',    width: 'w-9',  align: 'center' },
  { key: 'reb',  label: 'REB',    width: 'w-9',  align: 'center' },
  { key: 'ast',  label: 'AST',    width: 'w-9',  align: 'center' },
  { key: 'stl',  label: 'STL',    width: 'w-9',  align: 'center' },
  { key: 'blk',  label: 'BLK',    width: 'w-9',  align: 'center' },
  { key: 'fg%',  label: 'FG%',    width: 'w-12', align: 'center' },
  { key: '3p%',  label: '3P%',    width: 'w-12', align: 'center' },
  { key: 'ft%',  label: 'FT%',    width: 'w-12', align: 'center' },
  { key: 'tov',  label: 'TO',     width: 'w-9',  align: 'center' },
  { key: 'pm',   label: '+/-',    width: 'w-12', align: 'center' },
  { key: 'fpts', label: 'FPTS',   width: 'w-12', align: 'center' },
]

function toggleSort(key) {
  if (key === sortKey.value) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = key === 'name' ? 'asc' : 'desc'
  }
}

// Normalize NBA API long field names → short names used throughout this component.
function normalizePlayer(p) {
  return {
    ...p,
    id:   p.id   ?? p.player_id,
    pts:  p.pts  ?? p.points     ?? 0,
    reb:  p.reb  ?? p.rebounds   ?? 0,
    ast:  p.ast  ?? p.assists    ?? 0,
    stl:  p.stl  ?? p.steals     ?? 0,
    blk:  p.blk  ?? p.blocks     ?? 0,
    fgm:  p.fgm  ?? p.field_goals_made        ?? 0,
    fga:  p.fga  ?? p.field_goals_attempted   ?? 0,
    fg3m: p.fg3m ?? p.three_pointers_made     ?? 0,
    fg3a: p.fg3a ?? p.three_pointers_attempted ?? 0,
    ftm:  p.ftm  ?? p.free_throws_made        ?? 0,
    fta:  p.fta  ?? p.free_throws_attempted   ?? 0,
    tov:  p.tov  ?? p.turnovers  ?? 0,
    pm:   p.pm   ?? p.plus_minus ?? 0,
  }
}

const activePlayers = computed(() => {
  const team = props.sportStats?.[activeTeam.value]
  if (!team?.players) return []
  let list = team.players.map(normalizePlayer)
  if (!showDNP.value) list = list.filter(p => !isDNP(p))
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

function parseMin(p) {
  const raw = p.min ?? p.minutes ?? 0
  if (typeof raw === 'number') return raw
  const s = String(raw)
  if (!s) return 0
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(Number)
    return (m || 0) + ((sec || 0) / 60)
  }
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

function isDNP(p) {
  return parseMin(p) <= 0 && (p.pts ?? 0) === 0 && (p.reb ?? 0) === 0 && (p.ast ?? 0) === 0
}

function playerFgPct(p) {
  const a = p.fga ?? 0
  if (!a) return null
  return Math.round(((p.fgm ?? 0) / a) * 100)
}
function playerThreePct(p) {
  const a = p.fg3a ?? 0
  if (!a) return null
  return Math.round(((p.fg3m ?? 0) / a) * 100)
}
function playerFtPct(p) {
  const a = p.fta ?? 0
  if (!a) return null
  return Math.round(((p.ftm ?? 0) / a) * 100)
}

// DraftKings-style fantasy points (no double-double bonus, kept simple).
function playerFpts(p) {
  return (p.pts ?? 0) * 1
       + (p.fg3m ?? 0) * 0.5
       + (p.reb ?? 0) * 1.25
       + (p.ast ?? 0) * 1.5
       + (p.stl ?? 0) * 2
       + (p.blk ?? 0) * 2
       - (p.tov ?? 0) * 0.5
}

function pctClass(pct) {
  if (pct == null) return 'text-zinc-600'
  if (pct >= 50) return 'text-emerald-400'
  if (pct >= 40) return 'text-zinc-300'
  if (pct >= 30) return 'text-amber-400'
  return 'text-red-400'
}

function sortValue(p, key) {
  switch (key) {
    case 'name': return (p.name || '').toLowerCase()
    case 'min':  return parseMin(p)
    case 'fg%':  return playerFgPct(p) ?? -1
    case '3p%':  return playerThreePct(p) ?? -1
    case 'ft%':  return playerFtPct(p) ?? -1
    case 'fpts': return playerFpts(p)
    default:     return p[key] ?? 0
  }
}

const activeCoach = computed(() => {
  return props.sportStats?.[activeTeam.value]?.coach || null
})

function openPlayerModal(player) {
  modalPlayer.value = player
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  modalPlayer.value = null
}

const formatMin = (min, minutes) => {
  const val = min ?? minutes
  if (val == null) return '-'
  if (typeof val === 'string' && val.includes(':')) return val
  if (typeof val === 'number') return `${Math.round(val)}:00`
  return String(val)
}

const formatName = (name) => {
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
