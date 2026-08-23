<template>
  <div class="rounded-xl bg-surface border border-edge overflow-hidden">
    <div class="px-3 sm:px-4 py-2.5 border-b border-edge/50">
      <h3 class="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
        Mirrored sources — what we can actually check
      </h3>
      <p class="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
        Every mirrored wager is one published slip at a flat {{ unitStake.toFixed(2) }}, graded by
        <code class="text-zinc-600">common.settlement</code> against our own results — never by the
        source's claim about itself. What the ledger cannot say is how much of the source is in it:
        a slip only becomes a wager when our resolver binds every leg to a fixture we hold.
      </p>
    </div>

    <div class="divide-y divide-edge/40">
      <div v-for="s in sources" :key="s.key" class="p-3 sm:p-4">
        <div class="flex items-baseline gap-2 flex-wrap mb-2">
          <span class="text-[12px] font-semibold text-zinc-200">{{ s.name }}</span>
          <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider" :class="stateClass(s.state)">
            {{ STATE_LABEL[s.state] }}
          </span>
          <span v-if="!s.robots_cleared" class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/15 text-red-300"
                title="robots.txt has not been read for this source. Nothing may scrape it.">
            robots unread
          </span>
          <span v-if="s.slips" class="text-[10px] text-zinc-500 tabular-nums ml-auto">
            {{ s.slips_in_ledger.toLocaleString() }} of {{ s.slips.toLocaleString() }} slips in the ledger
            (<span :class="coverageClass(s.coverage_pct)">{{ s.coverage_pct.toFixed(1) }}%</span>)
          </span>
        </div>

        <p v-if="!s.authors.length" class="text-[11px] text-zinc-500">
          {{ s.notes || 'Registered. Nothing ingested.' }}
        </p>

        <table v-else class="w-full text-[11px]">
          <thead>
            <tr class="text-zinc-600">
              <th class="text-left font-medium py-1">Author</th>
              <th class="text-right font-medium py-1 w-20">Slips</th>
              <th class="text-right font-medium py-1 w-20" title="Slips that became a wager">In ledger</th>
              <th class="text-right font-medium py-1 w-24" title="Legs whose fixture is not in our corpus. This is OUR limit, not the source's.">No fixture</th>
              <th class="text-right font-medium py-1 w-24" title="Legs whose market our settlement engine does not grade — combos, half-time lines, corners, cards, player specials.">No market</th>
              <th class="text-right font-medium py-1 w-28" title="Where the source publishes its own green/red, does our settlement agree?">Verdict match</th>
              <th class="text-right font-medium py-1 w-28">Published</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="a in s.authors" :key="a.wallet_id"
              class="border-t border-edge/30 cursor-pointer hover:bg-surface-light/30"
              @click="$emit('select', a.wallet_id)"
            >
              <td class="py-1.5 text-zinc-300 truncate">
                {{ a.author }}
                <span class="text-zinc-600">· W{{ a.wallet_id }}</span>
              </td>
              <td class="py-1.5 text-right tabular-nums text-zinc-400">{{ a.slips.toLocaleString() }}</td>
              <td class="py-1.5 text-right tabular-nums">
                <span :class="coverageClass(a.coverage_pct)">{{ a.slips_in_ledger }}</span>
                <span class="text-zinc-600"> ({{ a.coverage_pct.toFixed(1) }}%)</span>
              </td>
              <td class="py-1.5 text-right tabular-nums text-zinc-500">{{ a.legs_no_fixture.toLocaleString() }}</td>
              <td class="py-1.5 text-right tabular-nums text-zinc-500">{{ a.legs_no_market.toLocaleString() }}</td>
              <td class="py-1.5 text-right tabular-nums">
                <template v-if="a.verdict_comparable">
                  <span :class="a.verdict_agree === a.verdict_comparable ? 'text-emerald-400' : 'text-amber-400'">
                    {{ a.verdict_agree }}/{{ a.verdict_comparable }}
                  </span>
                </template>
                <span v-else class="text-zinc-600" title="This source publishes no verdict of its own.">—</span>
              </td>
              <td class="py-1.5 text-right tabular-nums text-zinc-600">{{ span(a.first, a.last) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p class="text-[10px] text-zinc-600 leading-relaxed px-3 sm:px-4 py-3 border-t border-edge/40">
      Coverage is not random. The bound subsample skews toward competitions our corpus holds, so a
      mirrored ROI describes those picks and not the tipster. Nothing here is a track record, and no
      mirrored wallet is public — listing one needs the standard in
      <code class="text-zinc-500">docs/plans/copy-betting-product.md</code> §5.1, which none has met.
    </p>
  </div>
</template>

<script setup>
defineProps({
  sources:   { type: Array, default: () => [] },
  unitStake: { type: Number, default: 1 },
})
defineEmits(['select'])

const STATE_LABEL = {
  backfilled: 'backfilled',
  built:      'adapter built, not run',
  no_adapter: 'no adapter',
}

function stateClass(state) {
  return {
    backfilled: 'bg-emerald-500/15 text-emerald-300',
    built:      'bg-amber-500/15 text-amber-300',
    no_adapter: 'bg-zinc-700/40 text-zinc-400',
  }[state] || 'bg-zinc-700/40 text-zinc-400'
}

function coverageClass(pct) {
  const n = Number(pct || 0)
  if (n >= 25) return 'text-zinc-300'
  if (n >= 10) return 'text-amber-400'
  return 'text-red-400'
}

function span(first, last) {
  if (!first) return '—'
  const f = new Date(first), l = new Date(last || first)
  const fmt = d => d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  return fmt(f) === fmt(l) ? fmt(f) : `${fmt(f)} – ${fmt(l)}`
}
</script>
