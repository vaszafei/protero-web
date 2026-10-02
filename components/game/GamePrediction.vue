<template>
  <div class="gp">
    <!-- Status first: bet / not bet / not yet, and why. -->
    <div class="gp-status" :class="statusTone.cls">
      <span class="gp-status-tag">{{ statusTone.tag }}</span>
      <span class="gp-status-text">{{ statusTone.text }}</span>
      <span v-if="prediction?.model_version && isAdmin" class="gp-status-model">{{ prediction.model_version }}</span>
    </div>

    <!-- ── Row 1: the pick, and what was struck on it ── -->
    <div v-if="prediction || wagers.length" class="gp-row1">
      <section v-if="prediction" class="panel panel-accent overflow-hidden gp-pick-panel">
        <header class="panel-head">
          <span class="panel-title">Our pick</span>
          <span class="pill" :class="pickEnabled ? 'pill-good' : 'pill-dim'">{{ pickUnmatched ? 'cell not verified' : pickEnabled ? 'cell enabled' : 'cell not enabled' }}</span>
          <span v-if="sourceLabel" class="panel-link">probability from {{ sourceLabel }}</span>
        </header>
        <div class="gp-pick">
          <div class="gp-pick-id">
            <span class="gp-pick-label" :style="{ color: sideColor }" :title="outcomeLabel">{{ pickShort }}</span>
            <span v-if="pickPrice" class="gp-pick-price">@ {{ pickPrice.toFixed(2) }}</span>
            <span class="gp-pick-sub">{{ marketLabel }}</span>
          </div>
          <div class="gp-metrics">
            <div class="gp-metric">
              <span class="gp-k">Model</span>
              <span class="gp-v">{{ pct(modelP) }}</span>
              <span class="gp-n">fair {{ odds(modelP) }}</span>
            </div>
            <div class="gp-metric">
              <span class="gp-k">Market</span>
              <span class="gp-v">{{ pct(marketP) }}</span>
              <span class="gp-n">{{ marketP != null ? `fair ${odds(marketP)}` : 'no de-vig' }}</span>
            </div>
            <div class="gp-metric">
              <span class="gp-k">Gap</span>
              <span class="gp-v" :style="{ color: gapColor }">{{ gapPp == null ? '—' : signed(gapPp) + 'pp' }}</span>
              <span class="gp-n">{{ ratioText }}</span>
            </div>
            <div class="gp-metric">
              <span class="gp-k">EV</span>
              <UiTooltip v-if="evPct != null && !pickEnabled" :width="240" text="EV on a cell with no holdout evidence">
                <span class="gp-v gp-soft gp-help">{{ signed(evPct, 0) }}%</span>
              </UiTooltip>
              <span v-else class="gp-v" :class="evPct == null ? '' : evPct >= 0 ? 'gp-pos' : 'gp-neg'">{{ evPct == null ? '—' : signed(evPct, 0) + '%' }}</span>
              <span class="gp-n">at the price</span>
            </div>
            <div class="gp-metric">
              <span class="gp-k">Kelly</span>
              <span class="gp-v">{{ kellyPct == null ? '—' : kellyPct.toFixed(2) + '%' }}</span>
              <span class="gp-n">model's own</span>
            </div>
          </div>
        </div>
        <div v-if="modelP != null && marketP != null" class="gp-axis-wrap">
          <div class="gp-axis">
            <span class="gp-axis-gap" :style="{ left: `${Math.min(modelP, marketP) * 100}%`, width: `${Math.abs(modelP - marketP) * 100}%`, background: gapColor }" />
            <span class="gp-axis-mkt" :style="{ left: `${marketP * 100}%` }" />
            <span class="gp-axis-our" :style="{ left: `${modelP * 100}%`, borderColor: gapColor }" />
          </div>
          <span class="gp-axis-legend"><i class="gp-lg-mkt" />market <i class="gp-lg-our" :style="{ borderColor: gapColor }" />ours</span>
        </div>
        <p v-if="pickUnmatched" class="gp-warn">
          Pick not among the scored candidates — Model, Market and Gap are withheld rather than borrowed from another market.
        </p>
        <p v-if="bigDisagreement" class="gp-warn">
          Ours is {{ ratio?.toFixed(1) }}× the market's. A gap this wide is usually missing information
          (team news, a stale rating), not an edge — check Analysis before trusting it.
        </p>
        <div v-if="otherCandidates.length" class="gp-cands">
          <span class="gp-cand-h">Also scored</span>
          <span v-for="c in otherCandidates" :key="c.market" class="gp-cand">
            {{ c.selection || c.market }} {{ c.decimal_odds ? c.decimal_odds.toFixed(2) : '' }}
            · {{ pct(c.model_prob) }} vs {{ pct(c.market_prob) }}
            <span class="pill" :class="c.enabled ? 'pill-good' : 'pill-dim'">{{ c.enabled ? 'enabled' : 'not bet' }}</span>
          </span>
        </div>
      </section>

      <section v-if="wagers.length" class="panel overflow-hidden gp-wager-panel">
        <header class="panel-head">
          <span class="panel-title">Wagers on this fixture</span>
          <span class="pill pill-dim tabular-nums">{{ wagers.length }}</span>
        </header>
        <div class="gp-wagers">
          <div class="gp-wrow gp-wrow-h">
            <span>Wallet</span><span>Bet</span><span class="r">Odds</span><span class="r">Stake / slip</span><span class="r">Result</span>
          </div>
          <div v-for="w in wagers" :key="w.id" class="gp-wrow">
            <span class="gp-wallet">{{ w.wallet }}<span v-if="isMirror(w)" class="pill pill-dim">mirror</span></span>
            <UiTooltip v-if="w.analysis" :width="320" :text="wagerTip(w)">
              <span class="gp-trunc gp-help">{{ wagerLabel(w) }}</span>
            </UiTooltip>
            <span v-else class="gp-trunc">{{ wagerLabel(w) }}</span>
            <span class="r">{{ w.odds?.toFixed(2) ?? '—' }}</span>
            <span class="r">
              <template v-if="w.slip">{{ w.slip.num_legs }}-leg @ {{ w.slip.parlay_odds?.toFixed(2) ?? '—' }}</template>
              <template v-else>{{ w.stake != null ? w.stake.toFixed(2) : '—' }}</template>
            </span>
            <span class="r" :class="statusClass(w)">{{ wagerOutcome(w) }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- ── Row 2: what the price says — three panels, one row ── -->
    <div v-if="implied || resultRows.length" class="gp-row2">
      <!-- Result -->
      <section v-if="resultRows.length" class="panel overflow-hidden">
        <header class="panel-head">
          <span class="panel-title">Result</span>
          <span class="panel-link">{{ resultBasis }} · de-vigged</span>
        </header>
        <div class="gp-body">
          <div v-for="r in resultRows" :key="r.key" class="gp-res">
            <span class="gp-res-name"><i :style="{ background: r.color }" />{{ r.label }}</span>
            <span class="gp-res-p tabular-nums">{{ pct(r.p) }}</span>
            <div class="gp-res-track"><span :style="{ width: `${r.p * 100}%`, background: r.color }" /></div>
            <span class="gp-res-odds tabular-nums">fair <b>{{ odds(r.p) }}</b><template v-if="r.price"> · book <b>{{ r.price.toFixed(2) }}</b></template></span>
          </div>

          <div v-if="marginRows.length" class="gp-sub">
            <span class="gp-sub-h">Book margin</span>
            <div class="gp-margins">
              <span v-for="m in marginRows" :key="m.name" class="gp-margin" :class="{ 'gp-margin-best': m.best }">
                <span>{{ m.name }}</span><b class="tabular-nums">{{ (m.v * 100).toFixed(1) }}%</b>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Goals -->
      <section v-if="implied" class="panel overflow-hidden">
        <header class="panel-head">
          <span class="panel-title">Goals</span>
          <span class="panel-link">market-implied, not our model</span>
        </header>
        <div class="gp-body">
          <div class="gp-xg">
            <div>
              <span class="gp-xg-num" :style="{ color: VIZ_HOME }">{{ implied.home_xg.toFixed(2) }}</span>
              <span class="gp-xg-name">{{ shortName(game.home_name) }}</span>
            </div>
            <div class="gp-xg-mid">
              <span class="gp-xg-total tabular-nums">{{ implied.total_xg.toFixed(2) }}</span>
              <span class="gp-xg-name">expected total</span>
            </div>
            <div class="gp-right">
              <span class="gp-xg-num" :style="{ color: VIZ_AWAY }">{{ implied.away_xg.toFixed(2) }}</span>
              <span class="gp-xg-name">{{ shortName(game.away_name) }}</span>
            </div>
          </div>
          <div class="gp-xg-bar">
            <span :style="{ width: `${(implied.home_xg / implied.total_xg) * 100}%`, background: VIZ_HOME }" />
            <span :style="{ width: `${(implied.away_xg / implied.total_xg) * 100}%`, background: VIZ_AWAY }" />
          </div>

          <table class="gp-tbl">
            <tbody>
              <tr v-for="t in totalsRows" :key="t.key">
                <td>{{ t.label }}</td>
                <td class="r tabular-nums"><b>{{ pct(t.p) }}</b></td>
                <td class="r tabular-nums gp-dim">fair {{ odds(t.p) }}<template v-if="t.price"> · {{ t.price.toFixed(2) }}</template></td>
              </tr>
              <tr>
                <td>{{ shortName(game.home_name) }} clean sheet</td>
                <td class="r tabular-nums"><b>{{ pct(implied.home_clean_sheet) }}</b></td>
                <td class="r tabular-nums gp-dim">fit {{ odds(implied.home_clean_sheet) }}</td>
              </tr>
              <tr>
                <td>{{ shortName(game.away_name) }} clean sheet</td>
                <td class="r tabular-nums"><b>{{ pct(implied.away_clean_sheet) }}</b></td>
                <td class="r tabular-nums gp-dim">fit {{ odds(implied.away_clean_sheet) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Correct score heatmap -->
      <section v-if="implied?.grid" class="panel overflow-hidden">
        <header class="panel-head">
          <span class="panel-title">Correct score</span>
          <span class="panel-link">rows {{ shortName(game.home_name) }} · columns {{ shortName(game.away_name) }}</span>
        </header>
        <div class="gp-body">
          <div class="gp-heat">
            <span class="gp-heat-corner" />
            <span v-for="a in heatN" :key="`c${a}`" class="gp-heat-axis">{{ a - 1 }}</span>
            <template v-for="h in heatN" :key="`r${h}`">
              <span class="gp-heat-axis">{{ h - 1 }}</span>
              <span
                v-for="a in heatN"
                :key="`${h}-${a}`"
                class="gp-heat-cell"
                :class="{ 'gp-heat-top': isTop(h - 1, a - 1) }"
                :style="heatStyle(h - 1, a - 1)"
                :title="`${h - 1}–${a - 1}: ${pct(implied.grid[h - 1][a - 1])} · fit ${odds(implied.grid[h - 1][a - 1])}`"
              >{{ cellText(implied.grid[h - 1][a - 1]) }}</span>
            </template>
          </div>
          <p class="gp-heat-foot">
            Likeliest:
            <span v-for="(sl, i) in implied.scorelines.slice(0, 3)" :key="`${sl.home}-${sl.away}`">
              <b class="tabular-nums">{{ sl.home }}–{{ sl.away }}</b> {{ pct(sl.p) }}<template v-if="i < 2"> · </template>
            </span>
          </p>
        </div>
      </section>
    </div>

    <p v-if="implied" class="gp-foot">
      Market read: two Poisson goal rates fitted to {{ implied.n_targets }} de-vigged prices (residual {{ implied.rmse_pp.toFixed(1) }}pp).
      It ignores the low-score dependence Dixon-Coles corrects, so it describes the price — it is not a price for a same-game combo.
    </p>

    <!-- Basketball (and legacy football rows): the model's own side probabilities -->
    <section v-if="hasAnyProb" class="panel overflow-hidden">
      <header class="panel-head"><span class="panel-title">Model win probabilities</span></header>
      <div class="gp-body">
        <div v-for="r in probRows" :key="r.key" class="gp-res">
          <span class="gp-res-name"><i :style="{ background: r.color }" />{{ r.label }}</span>
          <span class="gp-res-p tabular-nums">{{ r.p }}%</span>
          <div class="gp-res-track"><span :style="{ width: `${r.p}%`, background: r.color }" /></div>
        </div>
      </div>
    </section>

    <section v-if="legacyMarkets.length" class="panel overflow-hidden">
      <header class="panel-head"><span class="panel-title">Model market predictions</span></header>
      <div class="gp-body gp-margins">
        <span v-for="m in legacyMarkets" :key="m.label" class="gp-margin"><span>{{ m.label }}</span><b>{{ m.value }}</b></span>
      </div>
    </section>

    <div v-if="marketPending && isFootball && !implied" class="gp-muted">Loading the market read…</div>
    <UiErrorState v-else-if="marketError" title="The market read failed to load." :error="marketError" @retry="refreshMarket" />

    <PlayerPropPicks v-if="isBball && game.id" :game-id="game.id" />
  </div>
</template>

<script setup lang="ts">
/**
 * The Prediction tab — what a bettor needs to decide, in reading order:
 *
 *   1. status   bet / not bet / not yet, and WHY (the mask, CD #3)
 *   2. pick     our probability against the DE-VIGGED market one, the gap in
 *               points, EV and Kelly as the model computed them
 *   3. wagers   what was actually struck on this fixture, and by whom
 *   4. market   what the price itself implies — result split, expected goals,
 *               likeliest scores, clean sheets, and which market is cheapest
 *
 * The market block renders for every priced football fixture, which is most
 * of them: only 9 competitions carry a model, so "no prediction" used to be
 * the whole tab.
 *
 * Units, read once and not guessed: every current writer stores
 * `expected_value` and `kelly_percentage` as FRACTIONS (V6: 1.36 = +136 %).
 * The old `v <= 1 ? v*100 : v` heuristic rendered every V6 longshot above
 * +100 % EV as ~1 %.
 */
import { computed } from 'vue'
import PlayerPropPicks from '~/components/game/PlayerPropPicks.vue'
import { betLabelShort } from '~/utils/bet-label'
import { parsePrediction } from '#logic/prediction-label'
import { VIZ_HOME, VIZ_AWAY, VIZ_DRAW, VIZ_STATUS, vizRgba } from '~/utils/viz'
import { basisLabel, summariseBases } from '#logic/market-basis'
import { displayTeamName as shortName } from '~/utils/team-name'
import UiTooltip from '~/components/ui/Tooltip.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { errorText } from '~/utils/error-text'

const props = defineProps({
  game: { type: Object, required: true },
  prediction: { type: Object, default: null },
  sport: { type: String, default: 'football' },
  analysis: { type: Object, default: null },
})

const { isAdmin } = useAuth()
const isBball = computed(() => props.sport === 'basketball')
const isFootball = computed(() => props.sport === 'football')

// The board is one part of the page's single `game-page` read, shared with MarketBoard.
const { data: gameBundle, pending: marketPending, error: marketErr, refresh: refreshMarket } = useGamePage(() => props.game.id)
const market = computed(() => gameBundle.value?.market?.data ?? null)
const marketError = computed(() => gameBundle.value?.market?.error ?? (marketErr.value ? errorText(marketErr.value) : null))

// ─── Status ─────────────────────────────────────────────────
// The status line is computed once, server-side (`fixtureStatus` in server/utils/market-board.ts),
// so the league round board and this tab cannot say different things about one fixture.
const statusTone = computed(() => {
  if (market.value?.fixture_status) return market.value.fixture_status
  if (marketErr.value) return { tag: 'Unknown', cls: 'gp-status-off', text: 'The status could not be read — the market read failed.' }
  return { tag: '…', cls: 'gp-status-off', text: 'Reading the market…' }
})

// ─── Pick ───────────────────────────────────────────────────
const bballOdds = computed(() => props.game.sport_stats?.odds || null)

const parsed = computed(() => parsePrediction(props.prediction?.prediction, {
  homeTeam: props.game.home_name,
  awayTeam: props.game.away_name,
  ouLine: bballOdds.value?.over_under?.line,
}))
const outcomeLabel = computed(() => parsed.value.label)

const pickShort = computed(() => {
  if (!props.prediction) return ''
  const short = betLabelShort({
    bet_type: props.prediction.bet_type || (props.prediction.prediction || '').toUpperCase(),
    notes: props.prediction.prediction,
    home_name: props.game.home_name,
    away_name: props.game.away_name,
  })
  return short && short.length <= 18 ? short : outcomeLabel.value
})

// Blue = home, red = away (tokens.css brand rule); everything else stays ink.
const sideColor = computed(() => ({ home: VIZ_HOME, away: VIZ_AWAY } as Record<string, string>)[parsed.value.side || ''] || 'var(--ink-strong)')

const MARKET_LABEL: Record<string, string> = { total: 'Totals market', spread: 'Spread market', moneyline: 'Result market' }
const marketLabel = computed(() => MARKET_LABEL[parsed.value.market as string] || 'Main market')

/** The candidate the headline pick came from — matched on the selection text. */
const candidates = computed<any[]>(() => market.value?.pick?.candidates || [])
const mainCandidate = computed(() => {
  const sel = (props.prediction?.prediction || '').toLowerCase()
  // Exact match only. Falling back to candidates[0] let Model/Market/Gap describe
  // a different market from the pick shown above them.
  return candidates.value.find((c) => (c.selection || '').toLowerCase() === sel) || null
})
/** The market scored candidates for this pick, but none of them is it. */
const pickUnmatched = computed(() => candidates.value.length > 0 && !mainCandidate.value)
const otherCandidates = computed(() => candidates.value.filter((c) => c !== mainCandidate.value))
const pickEnabled = computed(() => !!mainCandidate.value?.enabled)

const sourceLabel = computed(() => {
  if (!mainCandidate.value) return null
  const row = (market.value?.rows || []).find((r: any) => r.key === mainCandidate.value.market)
  return row?.ourLabel && row.ourLabel !== 'model' ? row.ourLabel : null
})

const pickPrice = computed<number | null>(() => {
  if (mainCandidate.value?.decimal_odds) return mainCandidate.value.decimal_odds
  const o = bballOdds.value
  const v = ({
    under: o?.over_under?.under || props.game.odds_under,
    over: o?.over_under?.over || props.game.odds_over,
    home: o?.moneyline?.home || props.game.odds_home,
    away: o?.moneyline?.away || props.game.odds_away,
  } as Record<string, any>)[parsed.value.side || '']
  return v ? Number(v) : null
})

const modelP = computed<number | null>(() => {
  if (mainCandidate.value?.model_prob != null) return mainCandidate.value.model_prob
  // Basketball rows carry the model probability as `confidence`, in percent.
  const c = Number(props.prediction?.confidence)
  return Number.isFinite(c) && c > 0 ? c / 100 : null
})
const marketP = computed<number | null>(() => mainCandidate.value?.market_prob ?? null)

const gapPp = computed(() => (modelP.value == null || marketP.value == null ? null : (modelP.value - marketP.value) * 100))
const ratio = computed(() => (modelP.value && marketP.value ? modelP.value / marketP.value : null))
const ratioText = computed(() => (ratio.value == null ? 'no market number' : `${ratio.value.toFixed(2)}× the market`))
const bigDisagreement = computed(() => ratio.value != null && (ratio.value >= 2 || ratio.value <= 0.5))

// Colour only where the cell passed holdout — elsewhere a gap is a fact, not
// an edge, and colour would imply a direction we have no evidence for.
const gapColor = computed(() => {
  if (gapPp.value == null || !pickEnabled.value || Math.abs(gapPp.value) < 1) return 'var(--ink-soft)'
  return gapPp.value > 0 ? VIZ_STATUS.good : VIZ_AWAY
})

const evPct = computed(() => {
  const v = market.value?.pick?.expected_value ?? props.prediction?.expected_value
  return v == null || v === '' ? null : Number(v) * 100
})
const kellyPct = computed(() => {
  const v = market.value?.pick?.kelly_fraction ?? props.prediction?.kelly_percentage
  return v == null || v === '' ? null : Number(v) * 100
})

// ─── Wagers ─────────────────────────────────────────────────
const wagers = computed<any[]>(() => market.value?.wagers || [])
function isMirror(w: any) {
  return w.archetype === 'external_tipster' || w.archetype === 'user_mirror'
}
const PROP_UNIT: Record<string, string> = { points: 'pts', rebounds: 'reb', assists: 'ast', threes: '3PM', steals: 'stl', blocks: 'blk' }
/** "Joel Parra · Under 9.5 pts" for a prop, the bet code otherwise. */
function wagerLabel(w: any) {
  if (w.player) {
    const dir = w.direction === 'UNDER' ? 'Under' : w.direction === 'OVER' ? 'Over' : (w.direction || '')
    const unit = PROP_UNIT[w.prop_market] || w.prop_market || ''
    return `${w.player} · ${dir} ${w.line ?? ''} ${unit}`.trim()
  }
  return w.line != null ? `${w.bet_type} ${w.line}` : w.bet_type
}
function wagerTip(w: any) {
  const p = w.p_hit != null ? ` Estimated hit rate ${(w.p_hit * 100).toFixed(0)}%.` : ''
  return `${w.analysis}${p}`
}

function wagerOutcome(w: any) {
  if (w.status === 'pending') return 'pending'
  if (w.profit == null) return w.status
  return `${w.profit >= 0 ? '+' : ''}${Number(w.profit).toFixed(2)}`
}
function statusClass(w: any) {
  if (w.status === 'won') return 'gp-pos'
  if (w.status === 'lost') return 'gp-neg'
  return ''
}

// ─── Market read ────────────────────────────────────────────
const implied = computed(() => market.value?.implied || null)

const resultBasis = computed(() => basisLabel(summariseBases(market.value?.rows || []).bases))

const rowOf = (k: string) => (market.value?.rows || []).find((r: any) => r.key === k)

const resultRows = computed(() => {
  const h = rowOf('home_win'), d = rowOf('draw'), a = rowOf('away_win')
  if (h?.market == null || d?.market == null || a?.market == null) return []
  return [
    { key: 'h', label: shortName(props.game.home_name), p: h.market, price: h.price, color: VIZ_HOME },
    { key: 'd', label: 'Draw', p: d.market, price: d.price, color: VIZ_DRAW },
    { key: 'a', label: shortName(props.game.away_name), p: a.market, price: a.price, color: VIZ_AWAY },
  ]
})

/** The de-vigged totals and BTTS straight off the board — the price's own numbers. */
const totalsRows = computed(() =>
  [
    { key: 'over_15', label: 'Over 1.5' },
    { key: 'over_25', label: 'Over 2.5' },
    { key: 'over_35', label: 'Over 3.5' },
    { key: 'btts', label: 'Both teams score' },
  ]
    .map((t) => ({ ...t, p: rowOf(t.key)?.market ?? null, price: rowOf(t.key)?.price ?? null }))
    .filter((t) => t.p != null),
)

// ─── Correct-score heatmap ──────────────────────────────────
// Cell tint follows the outcome it belongs to (home win blue, away win red,
// draw grey) and its strength follows probability, so the shape of the match
// — which side the mass leans to — reads before any number does.
const heatN = computed(() => implied.value?.grid?.length || 0)
const heatMax = computed(() => Math.max(0, ...(implied.value?.grid || []).flat()))
const topKeys = computed(() => new Set((implied.value?.scorelines || []).slice(0, 3).map((s: any) => `${s.home}-${s.away}`)))
function isTop(h: number, a: number) {
  return topKeys.value.has(`${h}-${a}`)
}
function heatStyle(h: number, a: number) {
  const p = implied.value?.grid?.[h]?.[a] ?? 0
  const t = heatMax.value ? p / heatMax.value : 0
  const hue = h > a ? VIZ_HOME : h < a ? VIZ_AWAY : VIZ_DRAW
  return { background: vizRgba(hue, 0.06 + 0.62 * t), color: t > 0.45 ? '#fff' : 'var(--ink-soft)' }
}
function cellText(p: number) {
  const v = p * 100
  return v < 0.5 ? '' : v < 10 ? v.toFixed(1) : v.toFixed(0)
}

const marginRows = computed(() => {
  const m = market.value?.margins || {}
  const rows = Object.entries(m)
    .filter(([, v]) => v != null)
    .map(([name, v]) => ({ name, v: Number(v), best: false }))
  if (rows.length) {
    const min = Math.min(...rows.map((r) => r.v))
    rows.forEach((r) => { r.best = r.v === min })
  }
  return rows
})

// ─── Model win probabilities (basketball / legacy rows) ─────
const toPct = (v: any) => (v == null ? null : Math.round(Number(v) <= 1 ? Number(v) * 100 : Number(v)))
const probRows = computed(() => {
  const p = props.prediction
  if (!p) return []
  return [
    { key: 'h', label: shortName(props.game.home_name), p: toPct(p.home_win_prob), color: VIZ_HOME },
    ...(isBball.value ? [] : [{ key: 'd', label: 'Draw', p: toPct(p.draw_prob), color: VIZ_DRAW }]),
    { key: 'a', label: shortName(props.game.away_name), p: toPct(p.away_win_prob), color: VIZ_AWAY },
  ].filter((r) => r.p != null)
})
const hasAnyProb = computed(() => probRows.value.length > 0)

const legacyMarkets = computed(() => {
  const p = props.prediction
  const out: { label: string; value: string }[] = []
  if (!p) return out
  const o = p.over25_prob ?? p.over_25_prob
  if (o != null) out.push({ label: isBball.value ? 'Over total' : 'Over 2.5', value: `${toPct(o)}%` })
  if (p.btts_prob != null) out.push({ label: 'BTTS', value: `${toPct(p.btts_prob)}%` })
  return out
})

// ─── Formatting ─────────────────────────────────────────────
function pct(v: number | null | undefined) {
  return v == null ? '—' : `${(v * 100).toFixed(1)}%`
}
function odds(p: number | null | undefined) {
  return p ? (1 / p).toFixed(2) : '—'
}
function signed(v: number, dp = 1) {
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}`
}
</script>

<style scoped>
.gp { display: flex; flex-direction: column; gap: 0.65rem; }

/* ── Status ── */
.gp-status {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.4rem 0.7rem;
  border-radius: var(--r); border: 1px solid var(--edge); background: var(--neutral-tint);
}
.gp-status-tag {
  flex-shrink: 0;
  font-size: 0.64rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase;
  padding: 0.14rem 0.5rem; border-radius: var(--r-pill);
}
.gp-status-text { font-size: 0.78rem; color: var(--ink-soft); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gp-status-model { font-size: 0.7rem; color: var(--ink-mute); font-variant-numeric: tabular-nums; }
.gp-v.gp-soft { color: var(--ink-soft); }
.gp-help { cursor: help; }
.gp-status-bet { border-color: var(--brand-blue-edge); background: var(--brand-blue-tint); }
.gp-status-bet .gp-status-tag { background: var(--brand-blue); color: #fff; }
.gp-status-on .gp-status-tag { background: var(--brand-blue-tint); color: var(--brand-blue-hi); }
.gp-status-off .gp-status-tag { background: rgba(255, 255, 255, 0.08); color: var(--ink-soft); }

/* ── Rows ── */
.gp-row1, .gp-row2 { display: grid; gap: 0.65rem; grid-template-columns: minmax(0, 1fr); align-items: start; }
@media (min-width: 1280px) {
  .gp-row1 { grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); }
  .gp-row1 > :only-child { grid-column: 1 / -1; }
  .gp-row2 { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.05fr); }
}
.gp-body { padding: 0.6rem 0.8rem 0.7rem; }
.gp-right { text-align: right; }
.r { text-align: right; }

/* ── Pick ── */
.gp-pick { display: flex; align-items: center; gap: 1rem; padding: 0.65rem 0.8rem 0.4rem; flex-wrap: wrap; }
.gp-pick-id { display: flex; flex-direction: column; min-width: 8rem; }
.gp-pick-label { font-size: 1.45rem; font-weight: 800; line-height: 1.05; letter-spacing: -0.01em; }
.gp-pick-price { font-size: 1rem; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.gp-pick-sub { font-size: 0.7rem; color: var(--ink-mute); margin-top: 0.1rem; }
.gp-metrics { flex: 1; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.4rem; min-width: 26rem; }
.gp-metric {
  display: flex; flex-direction: column; gap: 0.05rem;
  padding: 0.4rem 0.55rem; border-radius: var(--r);
  background: rgba(255, 255, 255, 0.03); border: 1px solid var(--edge-soft);
}
.gp-k { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-mute); }
.gp-v { font-size: 1.05rem; font-weight: 800; color: var(--ink-strong); font-variant-numeric: tabular-nums; }
.gp-n { font-size: 0.66rem; color: var(--ink-faint); font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.gp-axis-wrap { display: flex; align-items: center; gap: 0.8rem; padding: 0.2rem 0.8rem 0.6rem; }
.gp-axis { position: relative; flex: 1; height: 8px; border-radius: var(--r-pill); background: rgba(255, 255, 255, 0.05); }
.gp-axis-gap { position: absolute; top: 0; bottom: 0; opacity: 0.3; border-radius: var(--r-pill); }
.gp-axis-mkt { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; background: var(--ink-soft); }
.gp-axis-our {
  position: absolute; top: 50%; width: 11px; height: 11px; margin-left: -5.5px;
  border-radius: 50%; border: 2.5px solid; background: var(--surface); transform: translateY(-50%);
}
.gp-axis-legend { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.66rem; color: var(--ink-mute); white-space: nowrap; }
.gp-lg-mkt { width: 2px; height: 10px; background: var(--ink-soft); }
.gp-lg-our { width: 9px; height: 9px; border-radius: 50%; border: 2px solid; margin-left: 0.4rem; }

.gp-warn {
  margin: 0 0.8rem 0.6rem; padding: 0.35rem 0.6rem;
  border-radius: var(--r); border: 1px solid rgba(250, 178, 25, 0.3); background: var(--warning-tint);
  font-size: 0.72rem; line-height: 1.45; color: #f0d58c;
}
.gp-cands { display: flex; flex-wrap: wrap; gap: 0.35rem 0.8rem; align-items: center; padding: 0 0.8rem 0.6rem; font-size: 0.72rem; color: var(--ink-soft); }
.gp-cand-h { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-mute); }
.gp-cand { display: inline-flex; align-items: center; gap: 0.35rem; font-variant-numeric: tabular-nums; }

/* ── Wagers ── */
.gp-wagers { padding: 0.25rem 0.8rem 0.5rem; }
.gp-wrow {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) 3rem 6.5rem 4rem;
  gap: 0.5rem; align-items: center;
  padding: 0.32rem 0; border-top: 1px solid var(--edge-soft);
  font-size: 0.76rem; color: var(--ink-soft); font-variant-numeric: tabular-nums;
}
.gp-wrow-h { border-top: 0; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-mute); }
.gp-wallet { color: var(--ink); display: flex; gap: 0.35rem; align-items: center; min-width: 0; overflow: hidden; white-space: nowrap; }
.gp-trunc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
.gp-help { cursor: help; text-decoration: underline dotted var(--edge-lit); text-underline-offset: 3px; }

/* ── Result ── */
.gp-res {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto;
  column-gap: 0.9rem; row-gap: 0.25rem; align-items: center;
  padding: 0.35rem 0;
}
.gp-res + .gp-res { border-top: 1px solid var(--edge-soft); }
.gp-res-name { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; color: var(--ink); min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.gp-res-name i { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.gp-res-p { text-align: right; font-size: 0.95rem; font-weight: 800; color: var(--ink-strong); }
.gp-res-track { height: 5px; border-radius: var(--r-pill); background: rgba(255, 255, 255, 0.05); overflow: hidden; }
.gp-res-track span { display: block; height: 100%; border-radius: var(--r-pill); opacity: 0.9; }
.gp-res-odds { text-align: right; font-size: 0.68rem; color: var(--ink-faint); white-space: nowrap; }
.gp-res-odds b { color: var(--ink-soft); font-weight: 700; }

.gp-sub { margin-top: 0.55rem; padding-top: 0.5rem; border-top: 1px solid var(--edge); }
.gp-sub-h { display: block; margin-bottom: 0.35rem; font-size: 0.62rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-mute); }
.gp-margins { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.3rem; }
.gp-margin {
  display: flex; justify-content: space-between; gap: 0.4rem;
  padding: 0.22rem 0.5rem; border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.03); font-size: 0.7rem; color: var(--ink-soft);
}
.gp-margin b { color: var(--ink); }
.gp-margin-best { background: var(--positive-tint); box-shadow: inset 0 0 0 1px rgba(52, 211, 153, 0.35); }
.gp-margin-best b { color: var(--positive); }

/* ── Goals ── */
.gp-xg { display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: 0.5rem; }
.gp-xg > div { display: flex; flex-direction: column; min-width: 0; }
.gp-xg-mid { align-items: center; }
.gp-xg-num { font-size: 1.7rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.gp-xg-total { font-size: 1.05rem; font-weight: 700; color: var(--ink); }
.gp-xg-name { font-size: 0.7rem; color: var(--ink-mute); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 0.15rem; }
.gp-xg-bar { display: flex; gap: 2px; height: 5px; margin: 0.5rem 0 0.4rem; border-radius: var(--r-pill); overflow: hidden; }
.gp-tbl { width: 100%; border-collapse: collapse; font-size: 0.76rem; }
.gp-tbl td { padding: 0.28rem 0; border-top: 1px solid var(--edge-soft); color: var(--ink-soft); }
.gp-tbl td b { color: var(--ink-strong); }
.gp-tbl td.gp-dim { color: var(--ink-faint); font-size: 0.7rem; padding-left: 0.6rem; white-space: nowrap; }

/* ── Correct-score heatmap ── */
.gp-heat {
  display: grid; grid-template-columns: 1.1rem repeat(6, minmax(0, 1fr));
  gap: 3px; align-items: stretch;
}
.gp-heat-corner { display: block; }
.gp-heat-axis {
  display: flex; align-items: center; justify-content: center;
  font-size: 0.66rem; font-weight: 700; color: var(--ink-mute); font-variant-numeric: tabular-nums;
}
.gp-heat-cell {
  display: flex; align-items: center; justify-content: center;
  height: 1.85rem; border-radius: 4px;
  font-size: 0.7rem; font-weight: 700; font-variant-numeric: tabular-nums;
  cursor: default;
  animation: gp-heat-in var(--dur-slow) var(--ease-rise) both;  /* opacity only: a cell's tint is data */
}
@keyframes gp-heat-in { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .gp-heat-cell { animation: none; } }
.gp-heat-top { box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.85); }
.gp-heat-foot { margin-top: 0.5rem; font-size: 0.72rem; color: var(--ink-mute); }
.gp-heat-foot b { color: var(--ink-strong); }

.gp-foot { font-size: 0.68rem; line-height: 1.5; color: var(--ink-faint); }
.gp-muted { font-size: 0.75rem; color: var(--ink-mute); padding: 0.5rem 0; }

/* Money colours — declared here so they outrank the base ink of .gp-v / cells. */
.gp-pos { color: var(--positive) !important; }
.gp-neg { color: var(--negative) !important; }
</style>
