<template>
  <UiPageShell title="Control room" subtitle="What the machine is exposed to, and whether it is healthy.">
    <template #actions>
      <span v-if="data" class="text-[10px] text-zinc-600 tabular-nums">
        {{ new Date(data.generated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
      </span>
      <button class="btn btn-ghost btn-icon" :disabled="loading" title="Reload dashboard data" @click="reload">
        <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" :class="loading ? 'animate-spin' : ''" />
      </button>
      <button class="btn btn-brand" @click="runModalOpen = true">
        <UIcon name="i-heroicons-play" class="w-3.5 h-3.5" />
        Run pipeline
      </button>
    </template>

    <PipelineRunModal :is-open="runModalOpen" @close="runModalOpen = false" />

    <Transition name="swap" mode="out-in">
      <div v-if="loading && !data" class="dash-body">
        <div class="grid grid-cols-4 gap-3 flex-shrink-0">
          <UiSkeletonPanel v-for="i in 4" :key="i" :rows="2" :title="false" />
        </div>
        <div class="grid-12 dash-grid">
          <div class="col-5"><UiSkeletonPanel :rows="6" height="100%" /></div>
          <div class="col-4"><UiSkeletonPanel :rows="9" height="100%" /></div>
          <div class="col-3"><UiSkeletonPanel :rows="9" height="100%" /></div>
        </div>
      </div>

      <UiErrorState v-else-if="error" title="The dashboard failed to load." :error="error" @retry="reload" />

      <div v-else-if="data" class="dash-body">
        <OpsExposureBar :exposure="data.exposure" :week="data.week" :fleet="data.fleet" class="flex-shrink-0" />

        <div class="grid-12 dash-grid">
          <!-- What it bet -->
          <div class="col-5 dash-col">
            <OpsLiveSlate class="dash-fit" :rows="data.live_slate" :blind-spots="data.blind_spots.rows" />
            <OpsBlindSpots class="dash-fit" :rows="data.blind_spots.rows" :total="data.blind_spots.total" />
          </div>

          <!-- Is it healthy -->
          <div class="col-4 dash-col">
            <OpsFleet class="dash-fit" :fleet="data.fleet" />
            <OpsHealth class="flex-shrink-0" :pipelines="data.pipelines" />
          </div>

          <!-- Does the model beat the close -->
          <div class="col-3 dash-col">
            <OpsCalibration class="flex-1" :calibration="data.calibration" />
          </div>
        </div>
      </div>
    </Transition>
  </UiPageShell>
</template>

<script setup lang="ts">
/**
 * The operator control room — the landing page.
 *
 * This replaced a month calendar, which is a browsing surface rather than an
 * answer to "is the machine healthy and what is it exposed to". The calendar
 * still exists at /calendar. Every number here counts a parlay as one wager at its
 * parlay price, never its legs.
 *
 * All aggregation happens in /api/dashboard so the wager rule is applied in exactly
 * one place. One screen: the three columns scroll their own panels, the page does not.
 */
import OpsExposureBar from '~/components/ops/OpsExposureBar.vue'
import OpsLiveSlate from '~/components/ops/OpsLiveSlate.vue'
import OpsFleet from '~/components/ops/OpsFleet.vue'
import OpsHealth from '~/components/ops/OpsHealth.vue'
import OpsBlindSpots from '~/components/ops/OpsBlindSpots.vue'
import OpsCalibration from '~/components/ops/OpsCalibration.vue'
import UiSkeletonPanel from '~/components/ui/SkeletonPanel.vue'
import UiErrorState from '~/components/ui/ErrorState.vue'
import { errorText } from '~/utils/error-text'
// Explicit: auto-import registers this as <DashboardPipelineRunModal>, so the
// bare tag never resolved and "Run pipeline" opened nothing.
import PipelineRunModal from '~/components/dashboard/PipelineRunModal.vue'

const apiFetch = useApiFetch()

definePageMeta({ layout: 'default', middleware: 'auth' })

const data = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const runModalOpen = ref(false)

async function reload() {
  loading.value = true
  error.value = null
  try {
    data.value = await apiFetch('/api/dashboard')
  } catch (e) {
    error.value = errorText(e)
  } finally {
    loading.value = false
  }
}

onMounted(reload)

useHead({ title: 'Control room · Protero' })
</script>

<style scoped>
.dash-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.dash-grid {
  flex: 1 1 auto;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr);
}
.dash-col {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 0;
}
.dash-fit { flex: 0 1 auto; }
</style>
