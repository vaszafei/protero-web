<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-zinc-100">Player Props</h3>
        <p class="text-xs text-zinc-500 mt-0.5">Drop a Stoiximan screenshot — auto-OCR &amp; analyze</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="parsedPlayers > 0 && !analyzing"
          @click="runAnalysis"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <Zap :size="14" />
          Analyze ({{ parsedPlayers }})
        </button>
        <button
          @click="reset"
          v-if="screenshots.length > 0 || picks.length > 0"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm font-medium transition-colors"
        >
          <RotateCcw :size="14" />
          Reset
        </button>
      </div>
    </div>

    <!-- Drop zone -->
    <div
      class="border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl p-6 text-center cursor-pointer transition-colors"
      :class="{ 'border-blue-500 bg-blue-500/5': dragOver, 'border-emerald-600/60 bg-emerald-500/5': parsedPlayers > 0 && !ocrRunning }"
      @click="fileInput?.click()"
      @dragover.prevent
      @drop.prevent="handleDrop"
      @dragenter.prevent="dragOver = true"
      @dragleave.prevent="dragOver = false"
    >
      <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFiles" />
      <template v-if="ocrRunning">
        <div class="w-7 h-7 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p class="text-sm text-blue-300">Reading screenshot{{ ocrQueue > 1 ? ` (${ocrQueue} left)` : '' }}…</p>
        <p class="text-xs text-zinc-500 mt-1">{{ ocrStatus }}</p>
      </template>
      <template v-else-if="parsedPlayers > 0">
        <CheckCircle :size="28" class="mx-auto text-emerald-400 mb-2" />
        <p class="text-sm text-emerald-300">{{ parsedPlayers }} players extracted from screenshot</p>
        <p class="text-xs text-zinc-500 mt-1">Drop another screenshot to add more, or click Analyze</p>
      </template>
      <template v-else>
        <ImagePlus :size="28" class="mx-auto text-zinc-600 mb-2" />
        <p class="text-sm text-zinc-400">Drop Stoiximan screenshot here or <span class="text-blue-400">browse</span></p>
        <p class="text-xs text-zinc-600 mt-1">Alt-lines + O/U sections are both read automatically</p>
      </template>
    </div>

    <!-- Image previews -->
    <div v-if="screenshots.length > 0" class="flex flex-wrap gap-2">
      <div v-for="(ss, i) in screenshots" :key="i" class="relative group">
        <img :src="ss.preview" class="w-20 h-20 object-cover rounded-lg border border-zinc-700" />
        <button
          @click.stop="removeScreenshot(i)"
          class="absolute -top-1.5 -right-1.5 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X :size="10" />
        </button>
        <div v-if="ss.processing" class="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
          <div class="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <div v-else-if="ss.done" class="absolute bottom-1 right-1">
          <span class="bg-emerald-600/90 rounded text-[10px] px-1 text-white">✓</span>
        </div>
      </div>
    </div>

    <!-- Parsed players preview -->
    <div v-if="parsedPlayers > 0 && picks.length === 0 && !analyzing" class="bg-zinc-800/40 rounded-xl border border-zinc-700/40 overflow-hidden">
      <div class="px-4 py-2 border-b border-zinc-700/40 flex items-center justify-between">
        <span class="text-xs font-medium text-zinc-400 uppercase tracking-wider">Extracted Players</span>
        <span class="text-xs text-zinc-500">{{ parsedPlayers }} players · {{ parsedMarkets }} markets</span>
      </div>
      <div class="divide-y divide-zinc-700/30 max-h-52 overflow-y-auto">
        <div
          v-for="(entry, name) in displayPlayers"
          :key="name"
          class="flex items-center justify-between px-4 py-2"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm text-zinc-200 truncate">{{ name }}</span>
            <span class="text-xs text-zinc-500 shrink-0">{{ entry.team }}</span>
          </div>
          <div class="flex gap-1.5 shrink-0">
            <span v-for="mkt in playerMarkets(String(name))" :key="mkt"
              class="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/60 text-zinc-300 uppercase">
              {{ mkt }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- OCR debug panel — always shown after OCR runs, collapsed by default -->
    <div v-if="rawOcrText && screenshots.some(s => s.done)" class="bg-zinc-900/60 border border-zinc-700/40 rounded-xl overflow-hidden">
      <button
        @click="showOcrDebug = !showOcrDebug"
        class="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <span class="text-xs text-zinc-500 font-medium">OCR Output {{ parsedPlayers > 0 ? `· ${parsedPlayers} players parsed` : '· 0 players parsed (check text below)' }}</span>
        <ChevronDown :size="13" class="text-zinc-600 transition-transform" :class="{ 'rotate-180': showOcrDebug }" />
      </button>
      <div v-if="showOcrDebug" class="px-4 pb-3">
        <pre class="text-[11px] text-zinc-400 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-mono leading-relaxed">{{ rawOcrText }}</pre>
      </div>
    </div>

    <!-- Parse error -->
    <div v-if="parseError" class="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-sm text-red-300">
      <p class="font-medium mb-1">Parser found 0 players — expand OCR Output above to see what was read</p>
      <p class="text-xs text-red-400/80">{{ parseError }}</p>
      <p class="text-xs text-zinc-500 mt-2">Make sure the Stoiximan player props table is fully visible. If OCR text looks correct, the parser pattern may need tuning.</p>
    </div>

    <!-- Analysis loading -->
    <div v-if="analyzing" class="flex flex-col items-center justify-center py-10 gap-3">
      <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p class="text-sm text-zinc-400">Running 7-layer analysis…</p>
      <p class="text-xs text-zinc-600">Season HR · Last-10 · H2H · vs Top · Consistency</p>
    </div>

    <!-- Results -->
    <div v-else-if="picks.length > 0" class="space-y-4">
      <!-- Summary banner -->
      <div class="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <Sparkles :size="16" class="text-yellow-400" />
          <h4 class="text-sm font-semibold text-zinc-100">Analysis Results</h4>
        </div>
        <div class="flex items-center gap-3 text-xs">
          <span v-if="tier1.length" class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span class="text-emerald-400 font-medium">{{ tier1.length }} Lock{{ tier1.length !== 1 ? 's' : '' }}</span>
          </span>
          <span v-if="tier2.length" class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-blue-400"></span>
            <span class="text-blue-400 font-medium">{{ tier2.length }} Strong</span>
          </span>
          <span v-if="tier3.length" class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-zinc-600"></span>
            <span class="text-zinc-500">{{ tier3.length }} Skip</span>
          </span>
          <span v-if="analysisMeta" class="text-zinc-600 border-l border-zinc-700 pl-3">
            Roster: {{ analysisMeta.roster_size }} players
          </span>
        </div>
      </div>

      <!-- All SKIP banner -->
      <div v-if="tier1.length === 0 && tier2.length === 0 && tier3.length > 0"
        class="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 text-sm">
        <p class="text-amber-400 font-medium mb-1">No actionable picks found</p>
        <p class="text-zinc-400 text-xs">All {{ tier3.length }} props were skipped — not enough historical data or hit rates too low. Try with different props or check if this game has enough completed games for these teams.</p>
      </div>

      <!-- Tier 1 -->
      <div v-if="tier1.length > 0">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">TIER 1 — LOCKS</span>
          <span class="text-xs text-zinc-500">All factors confirmed</span>
        </div>
        <div class="space-y-2">
          <PickCard v-for="pick in tier1" :key="`t1-${pick.player_name}-${pick.market}`" :pick="pick" :tier="1" />
        </div>
      </div>

      <!-- Tier 2 -->
      <div v-if="tier2.length > 0">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">TIER 2 — STRONG</span>
          <span class="text-xs text-zinc-500">Minor concerns</span>
        </div>
        <div class="space-y-2">
          <PickCard v-for="pick in tier2" :key="`t2-${pick.player_name}-${pick.market}`" :pick="pick" :tier="2" />
        </div>
      </div>

      <!-- SKIP section — compact table, not full cards -->
      <div v-if="tier3.length > 0">
        <button @click="showTier3 = !showTier3" class="flex items-center gap-2 mb-2 text-left w-full group">
          <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-700/40 text-zinc-500 border border-zinc-600/30">
            SKIP ({{ tier3.length }})
          </span>
          <span class="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
            {{ showTier3 ? 'Hide' : 'Show' }} skipped props
          </span>
          <ChevronDown :size="14" class="text-zinc-600 ml-auto transition-transform" :class="{ 'rotate-180': showTier3 }" />
        </button>
        <div v-if="showTier3" class="bg-zinc-800/30 border border-zinc-700/30 rounded-xl overflow-hidden">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-zinc-700/40 text-zinc-500 text-left">
                <th class="px-3 py-2 font-medium">Player</th>
                <th class="px-3 py-2 font-medium">Prop</th>
                <th class="px-3 py-2 font-medium text-right">Season</th>
                <th class="px-3 py-2 font-medium text-right">L10</th>
                <th class="px-3 py-2 font-medium text-right">CV</th>
                <th class="px-3 py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-700/20">
              <tr v-for="pick in tier3" :key="`t3-${pick.player_name}-${pick.market}`" class="text-zinc-400 hover:bg-zinc-700/10">
                <td class="px-3 py-1.5">
                  <span class="text-zinc-300">{{ pick.player_name }}</span>
                  <span class="text-zinc-600 ml-1 text-[10px]">{{ pick.team_name }}</span>
                </td>
                <td class="px-3 py-1.5">
                  <span class="text-zinc-400">{{ pick.market?.toUpperCase() }} {{ pick.line }}+</span>
                </td>
                <td class="px-3 py-1.5 text-right" :class="pick.season_hr != null ? hrTextClass(pick.season_hr) : 'text-zinc-600'">
                  {{ pick.season_hr != null ? `${Math.round(pick.season_hr)}%` : '—' }}
                </td>
                <td class="px-3 py-1.5 text-right" :class="pick.l10_hr != null ? hrTextClass(pick.l10_hr) : 'text-zinc-600'">
                  {{ pick.l10_hr != null ? `${Math.round(pick.l10_hr)}%` : '—' }}
                </td>
                <td class="px-3 py-1.5 text-right" :class="pick.cv != null ? cvTextClass(pick.cv) : 'text-zinc-600'">
                  {{ pick.cv != null ? pick.cv.toFixed(2) : '—' }}
                </td>
                <td class="px-3 py-1.5 text-zinc-600 text-[11px]">
                  {{ skipReason(pick) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { X, Zap, ImagePlus, Sparkles, CheckCircle, RotateCcw, ChevronDown } from 'lucide-vue-next'
import { useStoiximanParser, type ParsedProps } from '~/composables/useStoiximanParser'

const props = defineProps<{
  gameId: number
  leagueKey: string
  homeTeam: string
  awayTeam: string
  gameDate: string
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)
const ocrRunning = ref(false)
const ocrQueue = ref(0)
const ocrStatus = ref('')
const analyzing = ref(false)
const parseError = ref('')
const showTier3 = ref(false)
const showOcrDebug = ref(false)
const rawOcrText = ref('')

const screenshots = ref<{ file: File; preview: string; processing: boolean; done: boolean }[]>([])
const mergedProps = ref<ParsedProps>({ players: {}, alt_lines: {} })
const picks = ref<any[]>([])
const analysisMeta = ref<{ total_parsed: number; total_picks: number; matched_with_data: number; no_data: number; roster_size: number } | null>(null)
const { parse } = useStoiximanParser()

const parsedPlayers = computed(() => {
  const fromOU = Object.keys(mergedProps.value.players).length
  if (fromOU > 0) return fromOU
  // Count unique players across all alt_lines markets
  const altNames = new Set<string>()
  for (const mkt of Object.values(mergedProps.value.alt_lines)) {
    for (const name of Object.keys(mkt)) altNames.add(name)
  }
  return altNames.size
})
const parsedMarkets = computed(() => {
  const markets = new Set<string>()
  for (const p of Object.values(mergedProps.value.players)) {
    for (const k of ['points', 'rebounds', 'assists', 'pra'] as const) {
      if ((p as any)[k]) markets.add(k)
    }
  }
  for (const m of Object.keys(mergedProps.value.alt_lines)) markets.add(m)
  return markets.size
})
const displayPlayers = computed(() => mergedProps.value.players)
const tier1 = computed(() => picks.value.filter(p => (p.tier || p.trad_tier) === 1))
const tier2 = computed(() => picks.value.filter(p => (p.tier || p.trad_tier) === 2))
const tier3 = computed(() => picks.value.filter(p => (p.tier || p.trad_tier || 3) >= 3))

function playerMarkets(name: string): string[] {
  const p = mergedProps.value.players[name] as any
  const result: string[] = []
  for (const m of ['points', 'rebounds', 'assists', 'pra']) {
    if (p?.[m]) result.push(m.slice(0, 3))
  }
  for (const m of Object.keys(mergedProps.value.alt_lines)) {
    if (mergedProps.value.alt_lines[m][name] && !result.includes(m.slice(0, 3))) {
      result.push(m.slice(0, 3))
    }
  }
  return [...new Set(result)]
}

function handleFiles(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) processFiles(Array.from(files))
  if (fileInput.value) fileInput.value.value = ''
}

function handleDrop(e: DragEvent) {
  dragOver.value = false
  const files = e.dataTransfer?.files
  if (files) processFiles(Array.from(files))
}

function removeScreenshot(i: number) {
  URL.revokeObjectURL(screenshots.value[i].preview)
  screenshots.value.splice(i, 1)
  if (screenshots.value.length === 0) {
    mergedProps.value = { players: {}, alt_lines: {} }
    parseError.value = ''
  }
}

async function processFiles(files: File[]) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const preview = URL.createObjectURL(file)
    const idx = screenshots.value.length
    screenshots.value.push({ file, preview, processing: true, done: false })
    await ocrFile(file, idx)
  }
}

async function ocrFile(file: File, idx: number) {
  ocrRunning.value = true
  ocrQueue.value++
  ocrStatus.value = 'Initializing OCR engine…'
  parseError.value = ''

  try {
    const Tesseract = (await import('tesseract.js')).default
    ocrStatus.value = 'Recognizing text…'

    const { data: { text } } = await Tesseract.recognize(file, 'eng+ell', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          ocrStatus.value = `Recognizing… ${Math.round((m.progress || 0) * 100)}%`
        }
      }
    })

    ocrStatus.value = 'Parsing Stoiximan table…'
    rawOcrText.value = (rawOcrText.value ? rawOcrText.value + '\n\n--- next image ---\n\n' : '') + text
    const parsed = parse(text)

    if (Object.keys(parsed.players).length === 0 && Object.keys(parsed.alt_lines).length === 0) {
      parseError.value = 'No player props found in screenshot. Expand "OCR Output" above to inspect what was read.'
      showOcrDebug.value = true  // auto-expand so user sees the text immediately
    } else {
      for (const [name, data] of Object.entries(parsed.players)) {
        if (!mergedProps.value.players[name]) mergedProps.value.players[name] = { team: data.team }
        Object.assign(mergedProps.value.players[name], data)
      }
      for (const [market, players] of Object.entries(parsed.alt_lines)) {
        if (!mergedProps.value.alt_lines[market]) mergedProps.value.alt_lines[market] = {}
        Object.assign(mergedProps.value.alt_lines[market], players)
      }
    }

    screenshots.value[idx].processing = false
    screenshots.value[idx].done = true
  } catch (err: any) {
    console.error('OCR error:', err)
    parseError.value = 'OCR failed: ' + (err?.message || 'Unknown error')
    screenshots.value[idx].processing = false
  } finally {
    ocrQueue.value--
    if (ocrQueue.value === 0) {
      ocrRunning.value = false
      ocrStatus.value = ''
      if (parsedPlayers.value > 0 && picks.value.length === 0) {
        await runAnalysis()
      }
    }
  }
}

async function runAnalysis() {
  if (parsedPlayers.value === 0) return
  analyzing.value = true
  picks.value = []

  try {
    const res = await $fetch<{ picks: any[]; meta?: any }>(`/api/game/${props.gameId}/player-props`, {
      method: 'POST',
      body: {
        game_id: props.gameId,
        league_key: props.leagueKey,
        game_date: props.gameDate,
        home_team: props.homeTeam,
        away_team: props.awayTeam,
        parsed_props: mergedProps.value,
      }
    })
    picks.value = res.picks || []
    analysisMeta.value = res.meta || null
  } catch (err: any) {
    console.error('Analysis failed:', err)
    parseError.value = 'Analysis failed: ' + (err?.message || 'Server error')
  } finally {
    analyzing.value = false
  }
}

function reset() {
  for (const ss of screenshots.value) URL.revokeObjectURL(ss.preview)
  screenshots.value = []
  mergedProps.value = { players: {}, alt_lines: {} }
  picks.value = []
  parseError.value = ''
  rawOcrText.value = ''
  showOcrDebug.value = false
  ocrRunning.value = false
  ocrQueue.value = 0
}

onMounted(async () => {
  try {
    const res = await $fetch<{ picks: any[] }>(`/api/game/${props.gameId}/player-props`)
    if (res.picks?.length) picks.value = res.picks
  } catch {
    // No existing picks
  }
})
</script>
