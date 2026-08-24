<template>
  <div v-if="moves.length" class="space-y-0.5">
    <div
      v-for="(m, i) in moves"
      :key="m.teamId + '-' + i"
      class="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-light/20"
    >
      <div class="flex-1 min-w-0">
        <div class="text-xs text-zinc-200 truncate">{{ m.teamName }}</div>
        <div class="text-[10px] text-zinc-500 tabular-nums">{{ m.apps }} appearances</div>
      </div>
      <div class="text-[10px] text-zinc-600 tabular-nums flex-shrink-0">
        {{ m.first?.slice(0, 4) }}{{ m.last && m.last !== m.first ? '–' + m.last.slice(0, 4) : '' }}
      </div>
    </div>
  </div>
  <p v-else class="text-xs text-zinc-600">No club history on record.</p>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** {team_id: appearances} from twin_player.teams_played */
  teams: Record<string, number>
  /** team_id -> name, resolved by the parent */
  teamNames: Record<string, string>
}>()

interface Move {
  teamId: string
  teamName: string
  apps: number
  first: string | null
  last: string | null
}

/**
 * Club history, most appearances first. The `teams_played` JSONB carries counts
 * only, not season spans — a career move is "n apps at club X" ordered by
 * volume, not a dated transfer sequence. The twin stores no per-club first/last
 * date, so this is an honest histogram, not a fabricated timeline.
 */
const moves = computed<Move[]>(() =>
  Object.entries(props.teams || {})
    .map(([teamId, apps]) => ({
      teamId,
      teamName: props.teamNames[teamId] || `Team #${teamId}`,
      apps: Number(apps),
      first: null,
      last: null,
    }))
    .sort((a, b) => b.apps - a.apps)
    .slice(0, 20)
)
</script>
