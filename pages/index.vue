<template>
  <div class="p-3 sm:p-6 max-w-[1600px] mx-auto min-h-screen pb-20 lg:pb-6">
    <!-- Header -->
    <div class="mb-4 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-white">Control room</h1>
        <p class="text-zinc-500 text-xs sm:text-sm mt-0.5">
          What the machine is exposed to, and whether it is healthy.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="data" class="text-[10px] text-zinc-600 tabular-nums">
          {{ new Date(data.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
        </span>
        <button
          @click="reload"
          :disabled="loading"
          class="btn btn-ghost btn-icon"
          title="Reload dashboard data"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
        </button>
        <button
          class="btn btn-brand"
          @click="runModalOpen = true"
        >
          <UIcon name="i-heroicons-play" class="w-3.5 h-3.5" />
          Run pipeline
        </button>
      </div>
    </div>

    <PipelineRunModal :is-open="runModalOpen" @close="runModalOpen = false" />

    <div v-if="loading && !data" class="flex justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-zinc-600" />
    </div>

    <div v-else-if="error" class="rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-3">
      <p class="text-xs text-red-200 font-medium">The dashboard query failed.</p>
      <p class="text-[11px] text-red-200/70 mt-1">{{ error }}</p>
    </div>

    <template v-else-if="data">
      <OpsExposureBar
        :exposure="data.exposure"
        :week="data.week"
        :fleet="data.fleet"
        class="mb-4 tab-anim"
      />

      <div class="grid lg:grid-cols-3 gap-4 tab-anim" style="animation-delay: 60ms">
        <!-- Left: what it bet -->
        <div class="lg:col-span-2 space-y-4">
          <OpsLiveSlate :rows="data.live_slate" :blind-spots="data.blind_spots.rows" />
          <OpsBlindSpots :rows="data.blind_spots.rows" :total="data.blind_spots.total" />
        </div>

        <!-- Right: is it healthy -->
        <div class="space-y-4">
          <OpsHealth :pipelines="data.pipelines" />
          <OpsFleet :fleet="data.fleet" />
          <OpsCalibration :calibration="data.calibration" />
        </div>
      </div>

      <p class="text-[10px] text-zinc-600 leading-relaxed mt-5 max-w-3xl">
        The month view moved to <NuxtLink to="/calendar" class="text-zinc-500 hover:text-zinc-300">Calendar</NuxtLink>.
        Every number on this page counts a parlay as one wager at its parlay price, never its legs.
      </p>
    </template>
  </div>
</template>

<script setup>
/**
 * The operator control room — the landing page.
 *
 * This replaced a month calendar, which is a browsing surface rather than an
 * answer to "is the machine healthy and what is it exposed to". The calendar
 * still exists at /calendar, unchanged.
 *
 * All aggregation happens in /api/dashboard so the wager rule (a parlay is one
 * wager, never its legs) is applied in exactly one place.
 */
import OpsExposureBar from '~/components/ops/OpsExposureBar.vue'
import OpsLiveSlate from '~/components/ops/OpsLiveSlate.vue'
import OpsFleet from '~/components/ops/OpsFleet.vue'
import OpsHealth from '~/components/ops/OpsHealth.vue'
import OpsBlindSpots from '~/components/ops/OpsBlindSpots.vue'
import OpsCalibration from '~/components/ops/OpsCalibration.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

const data = ref(null)
const loading = ref(true)
const error = ref(null)
const runModalOpen = ref(false)

async function reload() {
  loading.value = true
  error.value = null
  try {
    data.value = await $fetch('/api/dashboard')
  } catch (e) {
    error.value = e?.data?.message || e?.message || 'Unknown error'
  } finally {
    loading.value = false
  }
}

onMounted(reload)

useHead({ title: 'Control room · Protero' })
</script>

<style scoped>
/* Panes fade-slide in on load, matching the league page's entrance motion. */
.tab-anim {
  animation: pane-in 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
}
@keyframes pane-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .tab-anim { animation: none; }
}
</style>
