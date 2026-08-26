<template>
  <NuxtLink :to="`/game/${game.id}`" class="fx" :class="played ? 'fx-played' : ''">
    <!-- Status line -->
    <div class="fx-top">
      <span v-if="played" class="fx-tag fx-tag-ft">FT</span>
      <span v-else class="fx-tag fx-tag-time">{{ kickoff }}</span>
      <span v-if="!played && dayLabel" class="fx-day">{{ dayLabel }}</span>

      <span v-if="bet" class="fx-tag fx-tag-r" :class="betTagClass" :title="betTitle">€{{ betStake }}</span>
      <span
        v-else-if="predLabel"
        class="fx-tag fx-tag-r fx-tag-model"
        :class="played ? (predictionHit ? 'fx-tag-hit' : 'fx-tag-miss') : ''"
        title="Model call — not a wager"
      >{{ predLabel }}</span>
    </div>

    <!-- Teams. Logo + name, same pattern as the dashboard calendar: the crest
         renders when a logo file exists, else an initials block; the name
         always stays visible. -->
    <div class="fx-row" :class="played && homeWon ? 'fx-win' : ''">
      <img
        v-if="homeLogo"
        :src="homeLogo"
        loading="lazy"
        class="fx-crest-img"
        :alt="game.home_name"
        @error="homeLogoFailed = true"
      />
      <span v-else class="fx-crest-txt" :style="{ background: crestBg(VIZ_HOME) }">{{ abbr(game.home_name) }}</span>
      <span class="fx-name">{{ game.home_name }}</span>
      <span v-if="played" class="fx-score">{{ game.home_goals }}</span>
    </div>

    <div class="fx-row" :class="played && awayWon ? 'fx-win' : ''">
      <img
        v-if="awayLogo"
        :src="awayLogo"
        loading="lazy"
        class="fx-crest-img"
        :alt="game.away_name"
        @error="awayLogoFailed = true"
      />
      <span v-else class="fx-crest-txt" :style="{ background: crestBg(VIZ_AWAY) }">{{ abbr(game.away_name) }}</span>
      <span class="fx-name">{{ game.away_name }}</span>
      <span v-if="played" class="fx-score">{{ game.away_goals }}</span>
    </div>

    <!-- Price. The market's own view; the model's call is marked so the
         disagreement is visible without a click. -->
    <div v-if="hasOdds" class="fx-odds">
      <span
        v-for="o in oddsCells"
        :key="o.key"
        class="fx-odd"
        :class="[o.key === predKey ? 'fx-odd-pick' : '', o.key === resultKey ? 'fx-odd-hit' : '']"
      >
        <span class="fx-odd-k">{{ o.key }}</span>
        <span class="fx-odd-v">{{ o.value }}</span>
      </span>
    </div>
    <div v-else class="fx-odds-empty">no price</div>
  </NuxtLink>
</template>

<script setup>
/**
 * One fixture, compact enough to sit in a single-line rail.
 *
 * Three behavioural notes:
 *  - Odds come off `odds_home` / `odds_draw` / `odds_away`. The old card read
 *    `home_odds` / `draw_odds` / `away_odds`, which are not columns and are not
 *    in the payload, so its price row never rendered once.
 *  - A prediction chip is the MODEL's call. A bet chip is a wager that exists in
 *    the ledger. They are different claims and never share a style.
 *  - The crest falls back to an initials block on BOTH a missing `team_key` and
 *    a 404 on the file. `getTeamLogoUrl` returns a path for any key, so a club
 *    whose logo has not been scraped yet would otherwise render the browser's
 *    broken-image glyph — which is what it did for two of ten cards.
 */
import { computed, ref, watch } from 'vue'
import { getTeamLogoUrl, teamAbbreviation } from '~/utils/teamLogo'
import { VIZ_HOME, VIZ_AWAY } from '~/utils/viz'

const props = defineProps({
  game: { type: Object, required: true },
  /** Show the weekday when a round spans several days. */
  showDay: { type: Boolean, default: false },
})

const homeLogoFailed = ref(false)
const awayLogoFailed = ref(false)
// The card is reused across rounds by its key, so a failure must not stick to
// whatever fixture lands in the same slot next.
watch(() => props.game?.id, () => {
  homeLogoFailed.value = false
  awayLogoFailed.value = false
})

const played = computed(() => props.game.home_goals !== null && props.game.home_goals !== undefined)
const homeWon = computed(() => played.value && props.game.home_goals > props.game.away_goals)
const awayWon = computed(() => played.value && props.game.away_goals > props.game.home_goals)

const homeLogo = computed(() => getTeamLogoUrl(props.game.home_key))
const awayLogo = computed(() => getTeamLogoUrl(props.game.away_key))

const kickoff = computed(() => {
  if (!props.game.date) return 'TBD'
  return new Date(props.game.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
})

const dayLabel = computed(() => {
  if (!props.showDay || !props.game.date) return ''
  return new Date(props.game.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
})

const oddsCells = computed(() => {
  const g = props.game
  const cells = []
  if (g.odds_home) cells.push({ key: '1', value: Number(g.odds_home).toFixed(2) })
  if (g.odds_draw) cells.push({ key: 'X', value: Number(g.odds_draw).toFixed(2) })
  if (g.odds_away) cells.push({ key: '2', value: Number(g.odds_away).toFixed(2) })
  return cells
})
const hasOdds = computed(() => oddsCells.value.length > 0)

const PRED_KEY = { HOME: '1', DRAW: 'X', AWAY: '2' }
const predKey = computed(() => PRED_KEY[String(props.game.prediction || '').toUpperCase()] || null)
const predLabel = computed(() => {
  const p = String(props.game.prediction || '').toUpperCase()
  if (!p) return ''
  return { HOME: '1', DRAW: 'X', AWAY: '2', OVER: 'O2.5', UNDER: 'U2.5' }[p] || p
})

const resultKey = computed(() => {
  if (!played.value) return null
  if (homeWon.value) return '1'
  if (awayWon.value) return '2'
  return 'X'
})

const predictionHit = computed(() => played.value && predKey.value != null && predKey.value === resultKey.value)

const bet = computed(() => {
  const bets = props.game.bets
  return Array.isArray(bets) && bets.length ? bets[0] : null
})
const betStake = computed(() => (bet.value ? Number(bet.value.stake).toFixed(0) : ''))
const betTitle = computed(() => {
  const b = bet.value
  if (!b) return ''
  const profit = b.profit == null ? '' : ` · ${Number(b.profit) >= 0 ? '+' : ''}${Number(b.profit).toFixed(2)}`
  return `wallet ${b.wallet_id} · ${b.bet_type} @ ${Number(b.odds).toFixed(2)} · ${b.status}${profit}`
})
const betTagClass = computed(() => {
  const s = bet.value?.status
  if (s === 'won') return 'fx-tag-won'
  if (s === 'lost') return 'fx-tag-lost'
  if (s === 'void') return 'fx-tag-void'
  return 'fx-tag-pending'
})

function abbr(name) { return teamAbbreviation(name) }
function crestBg(hex) { return `${hex}26` }
</script>

<style scoped>
.fx {
  display: block;
  padding: 0.4rem 0.45rem 0.35rem;
  border-radius: 0.5rem;
  background: linear-gradient(165deg, rgba(41, 45, 54, 0.55), rgba(26, 29, 36, 0.95));
  border: 1px solid #2a2f3a;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03) inset;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
}
.fx:hover {
  border-color: rgba(57, 135, 229, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.04) inset, 0 10px 24px -18px rgba(57, 135, 229, 0.9);
}
.fx-played { background: linear-gradient(165deg, rgba(35, 38, 46, 0.5), rgba(22, 25, 31, 0.95)); }

.fx-top { display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.3rem; }
.fx-day { font-size: 0.55rem; color: rgb(101, 103, 112); }
.fx-tag-r { margin-left: auto; }

.fx-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.02rem 0.26rem;
  border-radius: 0.25rem;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.5;
  white-space: nowrap;
}
.fx-tag-ft { background: rgba(255, 255, 255, 0.07); color: rgb(150, 152, 160); }
.fx-tag-time { background: rgba(57, 135, 229, 0.16); color: #8fbdf5; font-variant-numeric: tabular-nums; }
.fx-tag-model { background: rgba(255, 255, 255, 0.05); color: rgb(161, 161, 170); border: 1px dashed rgba(255, 255, 255, 0.16); }
.fx-tag-hit { color: #7ddc7d; border-color: rgba(12, 163, 12, 0.5); }
.fx-tag-miss { color: #e88b8b; border-color: rgba(208, 59, 59, 0.5); }
.fx-tag-won { background: rgba(12, 163, 12, 0.18); color: #7ddc7d; }
.fx-tag-lost { background: rgba(208, 59, 59, 0.18); color: #e88b8b; }
.fx-tag-void { background: rgba(255, 255, 255, 0.07); color: rgb(161, 161, 170); }
.fx-tag-pending { background: rgba(250, 178, 25, 0.16); color: #f0c469; }

.fx-row { display: flex; align-items: center; gap: 0.35rem; height: 1.2rem; }
.fx-crest-img { width: 1.05rem; height: 1.05rem; flex-shrink: 0; object-fit: contain; }
.fx-crest-txt {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
  border-radius: 0.26rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.42rem;
  font-weight: 800;
  color: rgb(200, 203, 210);
}
.fx-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.66rem;
  font-weight: 500;
  color: rgb(178, 181, 189);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fx-score {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgb(135, 138, 147);
  font-variant-numeric: tabular-nums;
}
.fx-win .fx-name { color: rgb(244, 244, 245); font-weight: 600; }
.fx-win .fx-score { color: #fff; }

.fx-odds { display: flex; gap: 2px; margin-top: 0.3rem; }
.fx-odd {
  flex: 1 1 0%;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.08rem 0.05rem;
  border-radius: 0.25rem;
  background: rgba(255, 255, 255, 0.035);
}
.fx-odd-k { font-size: 0.48rem; font-weight: 700; color: rgb(105, 107, 116); }
.fx-odd-v { font-size: 0.6rem; font-weight: 600; color: rgb(185, 188, 196); font-variant-numeric: tabular-nums; }
.fx-odd-pick { background: rgba(57, 135, 229, 0.18); box-shadow: inset 0 0 0 1px rgba(57, 135, 229, 0.4); }
.fx-odd-pick .fx-odd-v { color: #a9cdf8; }
.fx-odd-hit .fx-odd-k { color: #7ddc7d; }

.fx-odds-empty {
  margin-top: 0.3rem;
  font-size: 0.5rem;
  color: rgb(85, 87, 95);
  text-align: center;
  padding: 0.12rem 0;
}
</style>
