<template>
  <!-- Legs that clear the single-bet gate at p*, a slip built by ticking them, and the
       tickets the builder suggests. Nothing here posts: a slip is read, priced and sized. -->
  <div class="h-full grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)] divide-x divide-edge/40 min-h-0">
    <!-- Legs -->
    <div class="flex flex-col min-h-0">
      <div class="px-3 py-1.5 flex items-center gap-2 text-[10px] text-zinc-500 border-b border-edge/30">
        <span class="uppercase tracking-wide">Legs · {{ legs.length }}</span>
        <span v-if="droppedText" class="truncate" :title="droppedText">· dropped {{ droppedText }}</span>
        <span
          class="ml-auto px-1.5 py-0.5 rounded"
          :class="slips?.p_star_validated ? 'bg-zinc-800 text-zinc-400' : 'bg-amber-500/10 text-amber-300'"
          :title="P_STAR_NOTE"
        >{{ slips?.p_star_validated ? 'p* · forward hypothesis' : 'p* not validated here' }}</span>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto">
        <p v-if="!slips" class="text-center text-[11px] text-zinc-500 py-8">No legs yet — press Load props.</p>
        <p v-else-if="!legs.length" class="text-center text-[11px] text-zinc-500 py-8">No leg clears EV ≥ 3% and edge ≥ 3% at p* tonight.</p>
        <table v-else class="w-full text-[11px]">
          <thead class="sticky top-0 bg-surface z-10">
            <tr class="text-[10px] text-zinc-500 uppercase tracking-wide">
              <th class="w-7" />
              <th class="py-1 text-left font-medium">Leg</th>
              <th class="py-1 text-right font-medium">Odds</th>
              <th class="py-1 text-right font-medium" title="Shin-devigged chance of this side">Book</th>
              <th class="py-1 text-right font-medium" :title="P_STAR_NOTE">p*</th>
              <th class="py-1 text-right font-medium" :title="V2_NOTE">v2</th>
              <th class="py-1 text-right font-medium" title="p* × odds − 1">EV</th>
              <th class="py-1 pr-3 text-right font-medium" title="Belief: expected minutes · usage this season at the club">Min · Usg</th>
            </tr>
          </thead>
          <tbody v-for="g in legsByGame" :key="g.eventId">
            <tr class="bg-surface-light/30">
              <td colspan="8" class="py-1 pl-3 text-zinc-300 font-semibold">
                {{ g.title }} <span class="text-zinc-500 font-normal tabular-nums ml-1">{{ athensTime(g.start) }}</span>
              </td>
            </tr>
            <tr
              v-for="l in g.legs" :key="legKey(l)"
              class="border-t border-edge/20 cursor-pointer"
              :class="picked.has(legKey(l)) ? 'bg-blue-500/10' : 'hover:bg-surface-light/30'"
              @click="toggle(l)"
            >
              <td class="pl-3">
                <input type="checkbox" class="accent-blue-500 pointer-events-none" :checked="picked.has(legKey(l))">
              </td>
              <td class="py-1.5 pr-2">
                <p class="text-zinc-100 leading-tight">{{ l.player }}</p>
                <p class="text-[10px] leading-tight">
                  <span :class="l.side === 'under' ? 'text-sky-300' : 'text-emerald-400/90'">{{ l.side === 'under' ? 'Under' : 'Over' }} {{ l.line }} {{ STAT[l.market] }}</span>
                  <span class="text-zinc-500 ml-1">{{ l.record.over }}–{{ l.record.under }}</span>
                  <span
                    v-for="f in l.flags" :key="f"
                    class="ml-1 px-1 rounded bg-amber-500/10 text-amber-300"
                    :title="FLAG_NOTE[f.split(' (')[0]] || f"
                  >{{ f }}</span>
                </p>
              </td>
              <td class="py-1.5 text-right tabular-nums text-amber-300">{{ l.odds.toFixed(2) }}</td>
              <td class="py-1.5 text-right tabular-nums text-zinc-500">{{ pct(l.p_book) }}</td>
              <td class="py-1.5 text-right tabular-nums text-zinc-100">{{ pct(l.p) }}</td>
              <td class="py-1.5 text-right tabular-nums text-zinc-500">{{ pct(l.p_v2) }}</td>
              <td class="py-1.5 text-right tabular-nums text-zinc-300">{{ signed(l.ev) }}</td>
              <td class="py-1.5 pr-3 text-right tabular-nums text-zinc-400" :title="beliefTitle(l)">
                {{ l.belief.e_minutes }} · {{ l.belief.usage?.season ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Slip -->
    <div class="flex flex-col min-h-0">
      <div class="px-3 py-1.5 flex items-center gap-2 text-[10px] text-zinc-500 border-b border-edge/30">
        <span class="uppercase tracking-wide">Slip · {{ slip.length }} {{ slip.length === 1 ? 'leg' : 'legs' }}</span>
        <button v-if="slip.length" class="ml-auto text-zinc-500 hover:text-zinc-200" @click="picked = new Set()">Clear</button>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 text-[11px]">
        <p v-if="!slip.length" class="text-zinc-500">Tick legs, or pick a suggested ticket.</p>
        <template v-else>
          <div class="space-y-1">
            <div v-for="l in slip" :key="legKey(l)" class="flex items-center gap-2">
              <span class="text-zinc-100 truncate">{{ l.player }}</span>
              <span class="text-[10px]" :class="l.side === 'under' ? 'text-sky-300' : 'text-emerald-400/90'">{{ l.side === 'under' ? 'U' : 'O' }} {{ l.line }} {{ STAT[l.market] }}</span>
              <span class="ml-auto tabular-nums text-amber-300">{{ l.odds.toFixed(2) }}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 tabular-nums">
            <span class="text-zinc-500" :title="priceTitle">Price{{ priceLabel }}</span>
            <span class="text-right text-amber-300 font-semibold">{{ price.toFixed(2) }}</span>
            <span class="text-zinc-500" title="p* per leg; independent across games, box-score copula within a game">P(win)</span>
            <span class="text-right text-zinc-100 font-semibold">{{ pct(pWin, 1) }}</span>
            <template v-if="pWinV2 != null">
              <span class="text-zinc-500" :title="V2_NOTE">P(win) · v2 shadow</span>
              <span class="text-right text-zinc-400">{{ pct(pWinV2, 1) }}</span>
            </template>
            <span class="text-zinc-500" title="P(win) × price − 1, at p* — a forward hypothesis, not a measured edge">EV at p*</span>
            <span class="text-right" :class="ev >= 0 ? 'text-zinc-100' : 'text-red-300'">{{ signed(ev) }}</span>
            <span class="text-zinc-500" title="1 − Π(book fair chance × odds): the bookmaker margin this slip carries, compounded once per leg">Book margin carried</span>
            <span class="text-right text-zinc-300">{{ pct(margin, 1) }}</span>
            <span class="text-zinc-500" title="0.25 × Kelly at p* (root CD #2), capped at 5% of the bankroll">Stake · 0.25 Kelly</span>
            <span class="text-right text-zinc-100">{{ stake > 0 ? formatMoney(stake) : '—' }} <span class="text-zinc-500">({{ pct(stakeFraction, 1) }})</span></span>
          </div>

          <ul class="space-y-1 text-[10px] leading-snug">
            <li v-for="w in warnings" :key="w" class="text-amber-300/90">{{ w }}</li>
          </ul>
          <p class="text-[10px] text-zinc-600">Nothing here posts. W59 posts by itself from the pipeline (props.auto_poster).</p>
        </template>
      </div>
    </div>

    <!-- Suggested tickets -->
    <div class="flex flex-col min-h-0">
      <div class="px-3 py-1.5 text-[10px] text-zinc-500 border-b border-edge/30 flex items-center">
        <span class="uppercase tracking-wide">Suggested · best P(win) at each size</span>
        <span class="ml-auto" title="Legs may share a game. Legs of one game are one bet builder, priced at Stoiximan's own quote (the plain product of the leg prices is on the tag's hover); a ticket pays the product across games. A player is never twice in one ticket. Ordered by P(win) within each size; EV is at p*, a forward hypothesis.">why</span>
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        <p v-if="slips && !slips.tickets.length" class="text-[11px] text-zinc-500 px-1">
          {{ legs.length < 2 ? 'Tickets need two priced legs.' : 'No ticket to suggest.' }}
        </p>
        <button
          v-for="(t, i) in slips?.tickets || []" :key="i"
          class="w-full text-left rounded border border-edge/50 hover:border-blue-500/40 px-2 py-1.5 text-[11px]"
          @click="loadTicket(t)"
        >
          <div class="flex items-center gap-2 tabular-nums">
            <span class="text-zinc-300 font-semibold">{{ t.size }} legs</span>
            <span class="text-amber-300">@{{ t.price.toFixed(2) }}</span>
            <span v-if="t.builders" class="text-[10px] text-sky-300" :title="`Stoiximan bet-builder quote for the legs of one game; the plain product of the leg prices is ${Number(t.naive).toFixed(2)}`">builder</span>
            <span class="ml-auto text-zinc-100">P {{ pct(t.p_win, 1) }}</span>
            <span v-if="t.p_win_v2 != null" class="text-zinc-500" :title="V2_NOTE">v2 {{ pct(t.p_win_v2, 1) }}</span>
            <span class="text-zinc-400">EV {{ signed(t.ev) }}</span>
          </div>
          <p v-for="l in t.legs" :key="l.player + l.stat" class="text-[10px] text-zinc-400 truncate">
            {{ l.player }} · {{ l.side === 'under' ? 'U' : 'O' }} {{ l.line }} {{ STAT[CAPTURE_MARKET[l.stat]] }}
          </p>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMoney } from '~/utils/formatters'
/**
 * The slip column of a props slate (docs/sessions/2026-09-30-props-spine-belief-parlays.md).
 * Reads `status.slips` — `props.slip_builder`'s artifact — and prices a ticked slip in the
 * browser (`utils/props-joint.ts`). p* is the price moved by the registered blend; every EV
 * shown here is a forward hypothesis, and the page says so beside it.
 */
import { computed, ref, watch } from 'vue'
import { jointProbability } from '~/utils/props-joint'

const props = defineProps<{ slips: any, bankroll: number | null }>()

const STAT: Record<string, string> = { points: 'pts', rebounds: 'reb', assists: 'ast', pra: 'PRA' }
const CAPTURE_MARKET: Record<string, string> = { pts: 'points', reb: 'rebounds', ast: 'assists', pra: 'pra' }
const P_STAR_NOTE = 'p* = the Shin price moved by the registered blend (belief + record + the over-bias), fitted on 2025-26 and held out on 2026-27: Brier 0.248 → 0.234 (t=−3.75). Its betting value rests on three nights (+44% / −10% / +24%) — a forward hypothesis, not a proven edge.'
const FLAG_NOTE: Record<string, string> = {
  'beyond the fitted range': 'p* moves further from the price than 95% of the rows it was fitted on. Large moves were right in both seasons, but here the blend extrapolates — the price may know a role change the history does not.',
  'thin history': 'Fewer than 10 European games behind the belief.',
}
const V2_NOTE = 'Shadow p* with the role-aware belief (recent games and his current club weighted up). A forward test, registered as el_props_blend_v2_forward: it is scored on Round 3+ nights only, and nothing here gates on it. Empty before 2026-10-01.'
const MARGIN_WARN = 0.15

const picked = ref<Set<string>>(new Set())
watch(() => props.slips?.built_at, () => { picked.value = new Set() })

const legs = computed<any[]>(() => props.slips?.legs || [])
const legKey = (l: any) => `${l.eventId}|${l.player}|${l.market ?? CAPTURE_MARKET[l.stat]}|${l.line}|${l.side}`

const legsByGame = computed(() => {
  const out: any[] = []
  for (const l of legs.value) {
    let g = out.find(x => x.eventId === l.eventId)
    if (!g) out.push(g = { eventId: l.eventId, start: l.start, title: l.home ? `${l.home} – ${l.away}` : l.event, legs: [] })
    g.legs.push(l)
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
})

function toggle(l: any) {
  const k = legKey(l)
  const next = new Set(picked.value)
  if (next.has(k)) next.delete(k)
  else next.add(k)
  picked.value = next
}

function loadTicket(t: any) {
  picked.value = new Set(t.legs.map((x: any) => legKey({ ...x, market: CAPTURE_MARKET[x.stat] })))
}

const slip = computed(() => legs.value.filter(l => picked.value.has(legKey(l))))
const product = computed(() => slip.value.reduce((p, l) => p * l.odds, 1))
// A slip that is exactly a suggested builder ticket keeps that ticket's quoted price; anything else
// with same-game legs is the plain product until it is quoted.
const quoted = computed(() => (props.slips?.tickets || []).find((t: any) => t.builders
  && t.legs.length === slip.value.length
  && t.legs.every((x: any) => picked.value.has(legKey({ ...x, market: CAPTURE_MARKET[x.stat] })))) || null)
const price = computed(() => (quoted.value ? quoted.value.price : product.value))
const priceLabel = computed(() => (quoted.value ? ' (Stoiximan builder quote)' : sameGame.value.length ? ' (product — not quoted)' : ''))
const priceTitle = computed(() => (quoted.value
  ? `Stoiximan's own bet-builder quote for the legs of one game; the plain product of the leg prices is ${Number(quoted.value.naive).toFixed(2)}`
  : sameGame.value.length
    ? 'Legs of one game are one bet builder: its quote replaces this product, and none has been fetched for this combination'
    : 'A cross-game ticket pays the product of its legs'))
const pWin = computed(() => jointProbability(slip.value, props.slips?.correlation || {}))
const pWinV2 = computed(() => (slip.value.length && slip.value.every(l => l.p_v2 != null)
  ? jointProbability(slip.value.map(l => ({ ...l, p: l.p_v2 })), props.slips?.correlation || {})
  : null))
const ev = computed(() => pWin.value * price.value - 1)
const margin = computed(() => 1 - slip.value.reduce((p, l) => p * l.p_book * l.odds, 1))
const stakeFraction = computed(() => {
  const b = price.value - 1
  const f = b > 0 ? (props.slips?.rules?.kelly_fraction ?? 0.25) * ev.value / b : 0
  return Math.max(0, Math.min(props.slips?.rules?.max_single_bet ?? 0.05, f))
})
const stake = computed(() => (props.bankroll ? stakeFraction.value * props.bankroll : 0))

const sameGame = computed(() => {
  const seen = new Map<string, number>()
  for (const l of slip.value) seen.set(l.eventId, (seen.get(l.eventId) || 0) + 1)
  return [...seen].filter(([, n]) => n > 1).map(([e]) => e)
})

const warnings = computed(() => {
  const w: string[] = []
  const byGame = new Map<string, any[]>()
  for (const l of slip.value) byGame.set(l.eventId, [...(byGame.get(l.eventId) || []), l])
  for (const ls of byGame.values()) {
    if (ls.length < 2) continue
    const players = new Set(ls.map(l => l.player_key))
    if (players.size > 1) { if (!quoted.value) w.push('Legs of one game are one bet builder: Stoiximan\'s quote replaces this product, and none has been fetched for this combination.') }
    else w.push('Same player, two stats: correlated (pts–reb +0.23), and the builder prices that. Quote it before trusting this price.')
  }
  if (byGame.size > 1) w.push('Cross-game ticket: overrides CD #16 (cross-game parlays have been unprofitable). Posting needs the CD16-CD28-OVERRIDE acknowledgement.')
  if (slip.value.length > 2) w.push('More than two legs overrides CD #28 (2-leg cap), and every leg multiplies both the margin and any error in p*.')
  if (margin.value > MARGIN_WARN) w.push(`This slip carries ${pct(margin.value, 0)} of bookmaker margin before any edge is counted.`)
  if (ev.value < 0) w.push('Negative at p*: the legs do not cover the margin they compound.')
  if (slip.value.some(l => l.flags?.length)) w.push('A flagged leg is in the slip — read its flag.')
  return w
})

const pct = (p: number | null | undefined, d = 0) => (p == null ? '—' : `${(Number(p) * 100).toFixed(d)}%`)
const signed = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`

function athensTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', minute: '2-digit' })
}

function beliefTitle(l: any) {
  const b = l.belief
  const twin = b.twin ? `twin ${b.twin.name} (${b.twin.games} games)` : 'no twin match — league prior'
  return `Expected ${b.mean} ${STAT[l.market]} = ${b.e_minutes} min × ${b.rate36}/36 (own ${b.own36}/36 over ${b.n_played} games, prior ${b.prior36}/36 from ${twin}). Usage: season ${b.usage?.season ?? '—'} · last 5 ${b.usage?.last5 ?? '—'} · last season ${b.usage?.prior_season ?? '—'}.`
}

const droppedText = computed(() => Object.entries(props.slips?.dropped || {}).map(([k, v]) => `${k} ${v}`).join(', '))
</script>
