<template>
  <section class="rounded-lg border border-edge bg-surface overflow-hidden">
    <header class="flex items-baseline gap-2 px-3 py-2 border-b border-edge bg-surface-light/30">
      <h2 class="text-xs font-semibold text-zinc-300 uppercase tracking-wider">External tipsters</h2>
      <span class="text-[10px] text-zinc-600 tabular-nums">{{ sources.length }} sources</span>
      <span class="ml-auto text-[10px] text-zinc-600">reference data — never the product</span>
    </header>

    <!-- Why the tipster wallets read zero. This is the whole point of the panel. -->
    <div class="px-3 py-2.5 border-b border-edge/40 bg-amber-500/5">
      <p class="text-[11px] text-amber-200/90 leading-relaxed">
        The tipster wallets show <span class="font-medium">0 wagers</span> because their picks were
        never projected into the ledger — only
        <span class="font-medium tabular-nums">{{ resolvableSlips }} of {{ totalSlips }}</span> slips
        resolve fully against our own fixtures. The record below is a flat
        <span class="font-medium">{{ unitStake }}-unit stake per slip</span>, graded by
        <span class="font-medium">the source's own published verdict</span> — not by our settlement
        engine, and not comparable to a wallet ROI.
      </p>
    </div>

    <div v-for="s in sources" :key="s.key" class="border-b border-edge/40 last:border-b-0">
      <!-- Source header -->
      <div class="flex items-center gap-2 px-3 py-2 bg-surface-light/10">
        <span class="text-xs font-medium text-zinc-200">{{ s.name }}</span>
        <span class="px-1.5 py-0.5 rounded text-[9px] font-semibold" :class="stateClass(s.state)">
          {{ stateLabel(s.state) }}
        </span>
        <span v-if="s.slips" class="text-[10px] text-zinc-600 tabular-nums">
          {{ s.slips }} slips · {{ s.authors.length }} author{{ s.authors.length === 1 ? '' : 's' }}
        </span>
        <span class="ml-auto text-[10px] text-zinc-700">{{ hostOf(s.base_url) }}</span>
      </div>

      <!-- A source with no slips explains itself rather than rendering blank -->
      <p v-if="!s.authors.length" class="px-3 py-2 text-[11px] text-zinc-500 leading-relaxed">
        <template v-if="s.state === 'built'">
          Adapter built and robots.txt cleared, but the backfill has not been run — so there are no
          slips, and no wallets. It is the highest-volume of the three (~21,700 single-match previews
          in the 2025-26 window against freetips247's 344 slips), which makes it the one worth running.
        </template>
        <template v-else>
          Registered as a known source with no adapter, and
          <span class="text-amber-300/80">robots.txt not yet read</span> — nothing may scrape it until
          that is cleared. Research put it at ~54 pick posts a year, nearly all parlays, with legs in
          competitions we do not hold.
        </template>
      </p>

      <!-- Author rows -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs min-w-[720px]">
          <thead>
            <tr class="text-zinc-500 border-b border-edge/40">
              <th class="text-left font-medium px-3 py-1.5">Author</th>
              <th class="text-right font-medium px-2 py-1.5 w-16">Slips</th>
              <th class="text-right font-medium px-2 py-1.5 w-16" title="Slips where every leg carries the source's own verdict">Graded</th>
              <th class="text-right font-medium px-2 py-1.5 w-16">Won</th>
              <th class="text-right font-medium px-2 py-1.5 w-20" title="Average price of a graded slip">Avg odds</th>
              <th class="text-right font-medium px-2 py-1.5 w-20" title="Net units at a flat 1-unit stake per slip">Units</th>
              <th class="text-right font-medium px-2 py-1.5 w-20" title="The source's claim about itself — not our settlement">Claimed</th>
              <th class="text-right font-medium px-2 py-1.5 w-24" title="Share of the net units carried by the single best slip">Top slip</th>
              <th class="text-right font-medium px-2 py-1.5 w-20" title="Share of legs we can resolve against our own fixtures">We verify</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in s.authors" :key="a.author" class="border-t border-edge/30 hover:bg-surface-light/20">
              <td class="px-3 py-2">
                <span class="text-zinc-200">{{ a.author }}</span>
                <span v-if="a.wallet_id" class="ml-1.5 text-[10px] text-zinc-600">W{{ a.wallet_id }}</span>
              </td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-400">{{ a.slips }}</td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ a.graded }}</td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ a.won }}</td>
              <td class="px-2 py-2 text-right tabular-nums text-zinc-500">{{ num(a.avg_odds, 2) }}</td>
              <td class="px-2 py-2 text-right tabular-nums" :class="signClass(a.units)">{{ signed(a.units) }}u</td>
              <td class="px-2 py-2 text-right tabular-nums font-semibold text-zinc-400">
                {{ a.roi_pct == null ? '—' : signed(a.roi_pct) + '%' }}
              </td>
              <td class="px-2 py-2 text-right tabular-nums">
                <span v-if="a.top_share == null" class="text-zinc-700">—</span>
                <span v-else :class="a.top_share >= 40 ? 'text-red-400' : 'text-zinc-500'"
                      :title="a.best ? `${a.best.odds} @ ${a.best.legs} leg(s) — ${a.best.title || 'untitled'}` : ''">
                  {{ a.top_share }}%
                </span>
              </td>
              <td class="px-2 py-2 text-right tabular-nums"
                  :class="a.coverage_pct >= 25 ? 'text-zinc-400' : 'text-amber-400/70'">
                {{ a.coverage_pct }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-[10px] text-zinc-600 px-3 py-2 border-t border-edge/40 leading-relaxed">
      <span class="text-zinc-500">Claimed</span> is the source grading its own picks — a site that
      sells picks is not a neutral scorer of them. <span class="text-zinc-500">Top slip</span> is why
      those figures are not a track record: where it is high, nearly all the return came from one
      winning parlay, and removing it removes the edge. <span class="text-zinc-500">We verify</span> is
      the share of legs we can check against our own fixtures — under a quarter for every author here.
      Nothing in this panel is settled by <code class="text-zinc-500">common/settlement.py</code>, none
      of it moves a balance, and none of it may be published as performance.
    </p>
  </section>
</template>

<script setup>
/**
 * External tipster sources — why their wallets read zero, and what they claim.
 *
 * The owner's question was "why don't we have freetips247 / betarades /
 * tsilibet". The answer is three different states, and the panel shows all
 * three rather than hiding the empty ones:
 *
 *   freetips247 — backfilled (344 slips, W33–W36), but only 4.4% of slips
 *                 resolve against our corpus, so nothing was ever projected
 *                 into `bets`. The wallets are real and empty.
 *   betarades   — adapter built, robots cleared, backfill never run.
 *   tsilibet    — registered as known, no adapter, robots.txt not read.
 *
 * The unit record exists because the owner asked for a placeholder stake so
 * the wallets read as a record via the multiplier. It is deliberately NOT a
 * ledger: it never writes to `bets`, never moves a balance, and is graded by
 * the source rather than by our settlement engine — which is the only thing in
 * this project permitted to decide won/lost.
 */
import { computed } from 'vue'

const props = defineProps({
  sources: { type: Array, default: () => [] },
  unitStake: { type: Number, default: 1 },
})

const totalSlips = computed(() =>
  props.sources.reduce((n, s) => n + s.authors.reduce((m, a) => m + a.slips, 0), 0))

const resolvableSlips = computed(() =>
  props.sources.reduce((n, s) => n + s.authors.reduce((m, a) => m + a.slips_resolvable, 0), 0))

function stateLabel(state) {
  return { backfilled: 'BACKFILLED', built: 'NOT BACKFILLED', no_adapter: 'NO ADAPTER' }[state] || state
}

function stateClass(state) {
  return {
    backfilled: 'bg-emerald-500/15 text-emerald-300',
    built:      'bg-amber-500/15 text-amber-300',
    no_adapter: 'bg-zinc-700/40 text-zinc-400',
  }[state] || 'bg-zinc-800/60 text-zinc-600'
}

function hostOf(url) {
  try { return new URL(url).host } catch { return url }
}

function num(v, dp) {
  return v == null ? '—' : Number(v).toFixed(dp)
}

function signed(v) {
  if (v == null) return '—'
  const n = Number(v)
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function signClass(v) {
  if (v == null || Number(v) === 0) return 'text-zinc-600'
  return Number(v) > 0 ? 'text-emerald-400' : 'text-red-400'
}
</script>
