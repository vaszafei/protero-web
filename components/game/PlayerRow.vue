<template>
  <tr
    class="border-b border-edge/50 hover:bg-surface-hover transition-colors"
    :class="{ 'opacity-60': !isStarter }"
  >
    <td class="sticky-col-1 py-2 px-2">
      <div
        class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
        :class="isStarter ? 'bg-primary-600 text-white' : 'bg-zinc-600 text-white'"
      >
        {{ player.jersey_number || '-' }}
      </div>
    </td>
    <td class="sticky-col-2 py-2 px-2">
      <!-- Deep-link only when a player entity id exists (player-twin plan). -->
      <NuxtLink
        v-if="playerLink"
        :to="playerLink"
        class="block font-medium text-zinc-100 text-sm hover:text-[#4d8fff] hover:underline transition-colors"
      >
        {{ player.player_name }}
      </NuxtLink>
      <div v-else class="block font-medium text-zinc-100 text-sm">{{ player.player_name }}</div>
      <div class="text-[11px] text-zinc-500">{{ player.position || 'Unknown' }}</div>
    </td>
    <td class="py-2 px-2 text-center">
      <span
        v-if="player.rating != null"
        class="pill text-[0.7rem]"
        :class="getRatingClass(player.rating)"
      >{{ Number(player.rating).toFixed(1) }}</span>
      <span v-else class="text-zinc-600">-</span>
    </td>
    <td class="py-2 px-2 text-center text-xs tabular-nums text-purple-400">
      {{ cell(player.xg) }}
    </td>
    <td class="py-2 px-2 text-center text-xs tabular-nums">
      {{ cell(player.shots_total) }}
    </td>
    <td class="py-2 px-2 text-center text-xs tabular-nums">
      {{ cell(player.shots_on_target) }}
    </td>
    <td class="py-2 px-2 text-center text-xs tabular-nums">
      {{ cell(player.passes) }}
    </td>
    <td class="py-2 px-2 text-center text-xs tabular-nums">
      {{ cell(player.touches) }}
    </td>
    <td class="py-2 px-2 text-center text-xs tabular-nums">
      {{ cell(player.dribbles_successful) }}
    </td>
    <td class="py-2 px-2 text-center text-xs tabular-nums">
      {{ cell(player.tackles) }}
    </td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  player: Record<string, any>
  isStarter: boolean
  leagueKey?: string | null
}>()

// The player page is keyed on a player entity id (player-twin plan). Until
// `lineups.player_id` ships, no row has one and the name renders as plain text.
const playerLink = computed(() => {
  const pid = props.player?.player_id
  if (pid == null || pid === '') return null
  const league = props.leagueKey || props.player?.league_key
  return {
    path: `/player/${pid}`,
    query: {
      ...(league ? { league } : {}),
      ...(props.player?.player_name ? { name: props.player.player_name } : {}),
    },
  }
})

function cell(v: any): string {
  return v !== null && v !== undefined ? String(v) : '-'
}

function getRatingClass(rating: any): string {
  const r = parseFloat(rating)
  if (r >= 8.0) return 'pill-good'
  if (r >= 7.0) return 'pill-blue'
  if (r >= 6.0) return 'pill-dim'
  return 'pill-critical'
}
</script>

