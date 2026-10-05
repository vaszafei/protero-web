<template>
  <section class="panel panel-fill">
    <header class="panel-head">
      <h2 class="panel-title">Division changes</h2>
      <span class="panel-count">{{ total }}</span>
      <span class="text-[10px] text-zinc-600">next 7 days</span>
      <UiTooltip class="ml-auto" :width="360" placement="bottom">
        <span class="panel-link">how to read</span>
        <template #content>
          <p>
            Clubs promoted or relegated recently enough that their rating is still built mostly on the old
            division's matches. Such ratings are measurably over-confident (Cox slope 0.44 vs 1.03), so read
            them with less confidence — a note about our rating, not a do-not-bet flag.
          </p>
        </template>
      </UiTooltip>
    </header>

    <p v-if="!rows.length" class="px-3 py-3 text-[11px] text-zinc-600">
      No fixture this week involves a club that changed division.
    </p>

    <div v-else class="panel-scroll divide-y divide-edge/40">
      <NuxtLink
        v-for="r in rows" :key="r.game_id"
        :to="`/game/${r.game_id}`"
        class="block px-3 py-2 transition-colors duration-150 hover:bg-white/[0.03]"
      >
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-zinc-600 tabular-nums w-12 flex-shrink-0">{{ shortDate(r.date) }}</span>
          <span class="text-xs text-zinc-300 truncate flex-1 inline-flex items-center gap-1">
            <img
              v-if="logoUrl(r.home_key)"
              :src="logoUrl(r.home_key)"
              loading="lazy" width="14" height="14"
              class="w-[14px] h-[14px] object-contain flex-shrink-0"
              :alt="r.home_team"
              @error="hideImg"
            />
            <span :class="isBlind(r, 'home') ? 'text-amber-300' : ''">{{ r.home_team }}</span>
            <span class="text-zinc-600 mx-0.5">v</span>
            <img
              v-if="logoUrl(r.away_key)"
              :src="logoUrl(r.away_key)"
              loading="lazy" width="14" height="14"
              class="w-[14px] h-[14px] object-contain flex-shrink-0"
              :alt="r.away_team"
              @error="hideImg"
            />
            <span :class="isBlind(r, 'away') ? 'text-amber-300' : ''">{{ r.away_team }}</span>
          </span>
          <span class="pill flex-shrink-0"
                :class="r.blind_side === 'both' ? 'pill-red' : 'pill-amber'">
            {{ r.blind_side === 'both' ? 'both clubs' : r.blind_side === 'home' ? 'home club' : 'away club' }}
          </span>
        </div>
        <p class="text-[10px] text-zinc-600 ml-14 truncate">
          {{ leagueLabel(r.league_key) }} ·
          <span v-if="isBlind(r, 'home')">{{ r.home_team }} came from {{ leagueLabel(r.home_evidence_league) }}</span>
          <span v-if="r.blind_side === 'both'"> · </span>
          <span v-if="isBlind(r, 'away')">{{ r.away_team }} came from {{ leagueLabel(r.away_evidence_league) }}</span>
        </p>
      </NuxtLink>
    </div>

  </section>
</template>

<script setup lang="ts">
/**
 * Fixtures where a club is playing outside the division its twin rating was learned in.
 *
 * NOT a blind spot in the "we know nothing about this club" sense — that framing was
 * measured false on 2026-08-22 (34 flagged sides in the live 7-day window, ZERO unrated,
 * min 39 tracked games). The real defect is the CARRY: slope 0.440 vs 1.028 overall.
 * The DC-unrated population — the one that genuinely has no price — is a different set
 * and is not persisted anywhere yet; do not merge the two.
 *
 * Twins are NOT a pricing input (owner decision 2026-08-21, do-not-do §2 —
 * 55 of 56 cells scored negative against the close). This panel is the warning
 * surface they ARE good for, and must never be rendered as an edge signal.
 */
import { getTeamLogoUrl } from '~/utils/teamLogo'
import { prettyLeagueKey } from '~/utils/league-name'

defineProps({
  rows: { type: Array, default: () => [] },
  total: { type: Number, default: 0 },
})

function isBlind(r, side) {
  return r.blind_side === 'both' || r.blind_side === side
}

function logoUrl(teamKey) {
  return getTeamLogoUrl(teamKey)
}

function hideImg(event) {
  event.target.style.display = 'none'
}

function leagueLabel(key) {
  return key ? prettyLeagueKey(key) : '—'
}

function shortDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}
</script>
