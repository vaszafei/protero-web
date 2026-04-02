<template>
  <div 
    class="bg-surface rounded-lg border border-edge hover:border-blue-400 hover:shadow-sm transition-all"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    :class="{ 'border-blue-500 bg-blue-500/20': isDragging }"
  >
    <!-- Single row with two columns -->
    <div class="grid grid-cols-[1fr_auto] gap-3 px-3 py-2 text-sm items-center">
      <!-- LEFT COLUMN: Match Info -->
      <div class="flex items-center gap-2">
        <!-- Round -->
        <div class="flex-shrink-0 w-8 text-center font-bold text-gray-700">
          {{ match.round }}
        </div>

        <!-- Home Team -->
        <div class="flex-shrink-0 min-w-[120px]">
          <span class="font-semibold text-gray-900 truncate text-xs">{{ match.home_name }}</span>
        </div>

        <!-- Home Score -->
        <div class="flex-shrink-0 w-10">
          <input
            v-model.number="homeScore"
            type="number"
            min="0"
            class="w-full px-1 py-0.5 text-xs text-center font-bold border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50"
            :disabled="!editing"
            placeholder="-"
          />
        </div>

        <!-- Separator -->
        <div class="flex-shrink-0 text-gray-400 text-xs font-bold">-</div>

        <!-- Away Score -->
        <div class="flex-shrink-0 w-10">
          <input
            v-model.number="awayScore"
            type="number"
            min="0"
            class="w-full px-1 py-0.5 text-xs text-center font-bold border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 disabled:bg-gray-50"
            :disabled="!editing"
            placeholder="-"
          />
        </div>

        <!-- Away Team -->
        <div class="flex-shrink-0 min-w-[120px]">
          <span class="font-semibold text-gray-900 truncate text-xs">{{ match.away_name }}</span>
        </div>

        <!-- Date -->
        <div class="flex-shrink-0 text-gray-500 text-[11px]">
          {{ formatDate(match.date) }}
        </div>

        <!-- Status Badges -->
        <div class="flex-shrink-0 flex items-center gap-1">
          <template>
            <UBadge 
              v-if="isPlayed" 
              color="green" 
              size="xs" 
              variant="soft"
            >
              ✓ Played
            </UBadge>
            <UBadge 
              v-else 
              color="gray" 
              size="xs" 
              variant="soft"
            >
              ○ Not Played
            </UBadge>
            <UBadge v-if="hasOdds" color="amber" size="xs" variant="soft">Odds</UBadge>
            <UBadge v-if="hasStats" color="blue" size="xs" variant="soft">Game Stats</UBadge>
            <UBadge v-if="hasReferee" color="purple" size="xs" variant="soft">Referee</UBadge>
            <UBadge v-if="hasLineups" color="emerald" size="xs" variant="soft">Lineups</UBadge>
            <UBadge v-if="hasPlayerStats" color="indigo" size="xs" variant="soft">Player Stats</UBadge>
          </template>
        </div>
      </div>

      <!-- RIGHT COLUMN: URL + Actions -->
      <div class="flex items-center gap-2">
        <!-- URL Input -->
        <div class="flex items-center gap-1 min-w-[200px]">
          <Globe :size="12" class="text-zinc-500 flex-shrink-0" />
          <input
            v-model="flashscoreUrl"
            @blur="saveUrlIfChanged"
            @paste="handlePaste"
            @input="handleInput"
            @drop.stop
            type="text"
            placeholder="Drop URL here..."
            class="flex-1 px-2 py-1 text-[11px] bg-surface text-zinc-100 border border-edge rounded focus:border-primary-500 focus:ring-1 focus:ring-primary-200 placeholder:text-zinc-500"
          />
        </div>

        <!-- Actions -->
        <div class="flex-shrink-0 flex gap-1">
          <template v-if="!editing">
            <button
              @click="startEdit"
              class="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-surface-light rounded transition-colors"
              title="Edit scores"
            >
              <Pencil :size="13" />
            </button>
            <button
              @click="openFullEditor"
              class="p-1 text-primary-400 hover:text-primary-400 hover:bg-primary-500/10 rounded transition-colors"
              title="Full stats editor"
            >
              <BarChart2 :size="13" />
            </button>
            <button
              @click="deleteMatch"
              :disabled="deleting"
              class="p-1 text-red-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
              title="Delete match"
            >
              <Trash2 :size="13" />
            </button>
          </template>
          <template v-else>
            <button
              @click="saveMatch"
              :disabled="saving"
              class="p-1 text-green-400 hover:text-green-400 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50"
              title="Save"
            >
              <Check :size="13" />
            </button>
            <button
              @click="cancelEdit"
              class="p-1 text-red-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
              title="Cancel"
            >
              <X :size="13" />
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>

  <!-- Full Statistics Editor Modal -->
  <AdminMatchStatsEditor
    v-model="showStatsEditor"
    :match="match"
    @saved="handleStatsSaved"
  />
</template>

<script setup>
import { nextTick } from 'vue'
import { Pencil, BarChart2, Check, X, Globe, Download, RefreshCw, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  match: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['saved', 'url-changed', 'deleted'])

const editing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const showStatsEditor = ref(false)
const homeScore = ref(props.match.home_goals ?? null)
const awayScore = ref(props.match.away_goals ?? null)
const flashscoreUrl = ref(props.match.flashscore_url ?? '')

const isDragging = ref(false)
const toast = useToast()

// Sync local state when props change (e.g., after bulk scrape refresh)
// Only sync URL if the server value changed (not clearing user input)
watch(() => props.match, (newMatch, oldMatch) => {
  if (!editing.value) {
    homeScore.value = newMatch.home_goals ?? null
    awayScore.value = newMatch.away_goals ?? null
    // Only sync URL if it actually changed on the server (has a new value)
    // Don't reset user input if server URL is still empty
    if (newMatch.flashscore_url && newMatch.flashscore_url !== oldMatch?.flashscore_url) {
      flashscoreUrl.value = newMatch.flashscore_url
    }
  }
}, { deep: true })

// Emit URL changes to parent for bulk scraping
watch(flashscoreUrl, (newUrl) => {
  emit('url-changed', { gameId: props.match.id, url: newUrl })
}, { immediate: true })

const startEdit = () => {
  editing.value = true
  homeScore.value = props.match.home_goals ?? null
  awayScore.value = props.match.away_goals ?? null
  flashscoreUrl.value = props.match.flashscore_url ?? ''
}

const cancelEdit = () => {
  editing.value = false
  homeScore.value = props.match.home_goals ?? null
  awayScore.value = props.match.away_goals ?? null
  flashscoreUrl.value = props.match.flashscore_url ?? ''
}

const openFullEditor = () => {
  showStatsEditor.value = true
}

const handleStatsSaved = () => {
  emit('saved')
}

const saveUrlIfChanged = async () => {
  if (flashscoreUrl.value !== props.match.flashscore_url) {
    try {
      await $fetch(`/api/admin/games/${props.match.id}`, {
        method: 'PATCH',
        body: { flashscore_url: flashscoreUrl.value || null }
      })
      // Update local match object without triggering full refresh
      props.match.flashscore_url = flashscoreUrl.value || null
      emit('url-changed', props.match.id, flashscoreUrl.value)
    } catch (error) {
      console.error('Failed to save URL:', error)
    }
  }
}

const handlePaste = async (event) => {
  // Get pasted text directly from clipboard event
  const pastedText = event.clipboardData?.getData('text') || ''
  
  console.log('Paste event triggered, text:', pastedText.substring(0, 50))
  
  // Wait for v-model to update
  await nextTick()
  
  // Give a small delay to ensure flashscoreUrl.value has the pasted content
  setTimeout(async () => {
    console.log('Current flashscoreUrl value:', flashscoreUrl.value?.substring(0, 50))
    console.log('Saved match URL:', props.match.flashscore_url?.substring(0, 50))
    
    if (flashscoreUrl.value && flashscoreUrl.value !== props.match.flashscore_url) {
      console.log('Saving URL to Turso...')
      try {
        const response = await $fetch(`/api/admin/games/${props.match.id}`, {
          method: 'PATCH',
          body: { flashscore_url: flashscoreUrl.value || null }
        })
        
        console.log('URL saved successfully', response)
        
        // Update local match object
        props.match.flashscore_url = flashscoreUrl.value || null
        emit('url-changed', props.match.id, flashscoreUrl.value)
        
        // Show success notification
        toast.add({
          title: '✓ URL Saved',
          description: 'FlashScore URL auto-saved',
          color: 'green',
          timeout: 2000
        })
      } catch (error) {
        console.error('Failed to auto-save URL:', error)
        toast.add({
          title: 'Save Failed',
          description: 'Could not save URL',
          color: 'red'
        })
      }
    } else {
      console.log('No save needed - URL unchanged or empty')
    }
  }, 100)
}

let inputTimeout = null
const handleInput = async (event) => {
  // Clear previous timeout
  if (inputTimeout) {
    clearTimeout(inputTimeout)
  }
  
  console.log('Input event triggered, value length:', flashscoreUrl.value?.length)
  
  // Debounce to avoid saving on every keystroke
  inputTimeout = setTimeout(async () => {
    if (flashscoreUrl.value && 
        flashscoreUrl.value.includes('flashscore.com') && 
        flashscoreUrl.value !== props.match.flashscore_url) {
      
      console.log('Auto-saving URL via input event...')
      
      try {
        const response = await $fetch(`/api/admin/games/${props.match.id}`, {
          method: 'PATCH',
          body: { flashscore_url: flashscoreUrl.value || null }
        })
        
        console.log('URL saved successfully via input', response)
        
        // Update local match object
        props.match.flashscore_url = flashscoreUrl.value || null
        emit('url-changed', props.match.id, flashscoreUrl.value)
        
        // Show success notification
        toast.add({
          title: '✓ URL Auto-Saved',
          description: 'FlashScore URL saved',
          color: 'green',
          timeout: 2000
        })
      } catch (error) {
        console.error('Failed to auto-save URL via input:', error)
      }
    }
  }, 500) // Wait 500ms after last input change
}

const saveMatch = async () => {
  saving.value = true
  try {
    await $fetch(`/api/admin/games/${props.match.id}`, {
      method: 'PATCH',
      body: {
        home_goals: homeScore.value,
        away_goals: awayScore.value,
        flashscore_url: flashscoreUrl.value || null
      }
    })
    
    editing.value = false
    emit('saved')
    
    // Success feedback
    useToast().add({
      title: 'Success',
      description: 'Match updated successfully',
      color: 'green'
    })
  } catch (error) {
    console.error('Error saving match:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to update match',
      color: 'red'
    })
  } finally {
    saving.value = false
  }
}

const deleteMatch = async () => {
  if (!confirm(`Are you sure you want to delete this match?\n\n${props.match.home_name} vs ${props.match.away_name}\n\nThis will delete all associated data (lineups, predictions, etc.)`)) {
    return
  }

  deleting.value = true
  try {
    await $fetch(`/api/admin/games/${props.match.id}`, {
      method: 'DELETE'
    })
    
    emit('deleted', props.match.id)
    
    // Success feedback
    useToast().add({
      title: 'Deleted',
      description: 'Match deleted successfully',
      color: 'green'
    })
  } catch (error) {
    console.error('Error deleting match:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to delete match',
      color: 'red'
    })
  } finally {
    deleting.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Date TBD'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })
}

// Computed property to check if game has been played (based on scores, not status)
const isPlayed = computed(() => {
  return props.match.home_goals !== null && props.match.away_goals !== null
})

// Check if match has odds data
const hasOdds = computed(() => {
  return !!(props.match.odds_home || props.match.odds_draw || props.match.odds_away)
})

// Check if match has FULL statistics data (not just scores - needs shots, corners, possession)
const hasStats = computed(() => {
  // Must have at least shots AND (corners OR possession != 50)
  const hasShots = props.match.home_shots > 0 || props.match.away_shots > 0
  const hasCorners = props.match.home_corners > 0 || props.match.away_corners > 0
  const hasPossession = props.match.home_possession_pct && props.match.home_possession_pct !== 50
  
  return hasShots && (hasCorners || hasPossession)
})

// Check if match has referee data
const hasReferee = computed(() => {
  return !!(props.match.referee_id || props.match.referee_name)
})

// Check if match has lineups (formation data)
const hasLineups = computed(() => {
  return !!(props.match.home_formation || props.match.away_formation)
})

// Check if match has player stats (check if match has formations)
const hasPlayerStats = computed(() => {
  // Games with formations typically have player stats scraped
  return !!(props.match.home_formation && props.match.away_formation)
})

// Drag & Drop handlers
const handleDragOver = (event) => {
  isDragging.value = true
  event.dataTransfer.dropEffect = 'copy'
}

const handleDragLeave = (event) => {
  isDragging.value = false
}

const handleDrop = async (event) => {
  isDragging.value = false
  
  // Get URL from dropped data
  const url = event.dataTransfer.getData('text/plain') || event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('URL')
  
  console.log('Dropped URL:', url)
  
  if (!url) {
    toast.add({
      title: 'No URL detected',
      description: 'Please drag a URL from your browser',
      color: 'amber'
    })
    return
  }
  
  if (!url.includes('flashscore')) {
    toast.add({
      title: 'Invalid URL',
      description: 'Please drop a FlashScore URL',
      color: 'amber'
    })
    return
  }
  
  // Smart validation: Extract team names from URL and match with game teams
  // FlashScore URL format: /match/.../team-a-xxx/team-b-yyy/...
  const urlPattern = /\/match\/[^\/]+\/([^\/]+)\/([^\/]+)/
  const urlMatch = url.match(urlPattern)
  
  if (urlMatch) {
    // Normalize function: removes accents and special characters
    const normalize = (str) => {
      return str.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .trim()
    }
    
    // Remove FlashScore team ID (format: -XXXXXXXX at end) before normalizing
    const cleanTeamName = (name) => {
      return name.replace(/-[a-zA-Z0-9]+$/, '').replace(/-/g, ' ')
    }
    
    const urlTeam1 = normalize(cleanTeamName(urlMatch[1]))
    const urlTeam2 = normalize(cleanTeamName(urlMatch[2]))
    
    const homeName = normalize(props.match.home_name)
    const awayName = normalize(props.match.away_name)
    
    console.log('URL teams (normalized):', urlTeam1, urlTeam2)
    console.log('Game teams (normalized):', homeName, awayName)
    
    // Common team abbreviations mapping
    const abbreviationMap = {
      'psg': 'paris saint germain',
      'rb': 'red bull',
      'rbl': 'rb leipzig',
      'rbm': 'rb monchengladbach',
      'fcb': 'fc barcelona',
      'scb': 'sc barcelona',
      'bar': 'barcelona',
      'rmf': 'real madrid',
      'rm': 'real madrid',
      'mun': 'manchester united',
      'man': 'manchester',
      'mcity': 'manchester city',
      'liv': 'liverpool',
      'lpool': 'liverpool',
      'chelsea': 'chelsea fc',
      'cfc': 'chelsea',
      'mufc': 'manchester united',
      'ars': 'arsenal',
      'afcl': 'arsenal',
      'spurs': 'tottenham',
      'thfc': 'tottenham',
      'ben': 'bayer bayer leverkusen',
      'bayern': 'bayern munich',
      'bm': 'bayern munich',
      'dortmund': 'borussia dortmund',
      'bvb': 'borussia dortmund',
      'schalke': 'fc schalke 04',
      'hamburg': 'hamburger sv',
      'hsv': 'hamburger sv',
      'inter': 'internazionale',
      'inter mi': 'internazionale',
      'imf': 'internazionale milan',
      'mal': 'ac milan',
      'am': 'ac milan',
      'juve': 'juventus',
      'juv': 'juventus',
      'napoli': 'ssc napoli',
      'napo': 'ssc napoli',
      'roma': 'as roma',
      'asr': 'as roma',
      'lazio': 'ss lazio',
      'az': 'az alkmaar',
      'atalanta': 'atalanta bergamo',
      'atb': 'atalanta bergamo',
      // Portuguese teams
      'porto': 'fc porto',
      'fcp': 'fc porto',
      'benfica': 'sl benfica',
      'slb': 'sl benfica',
      'sporting': 'sporting cp',
      'scp': 'sporting cp',
      'braga': 'sc braga',
      'scbraga': 'sc braga'
    }
    
    // Expand abbreviations in team names
    const expandAbbreviations = (teamName) => {
      const words = teamName.split(' ')
      return words.map(word => abbreviationMap[word] || word).join(' ')
    }
    
    // Smart matching: check if team names match (handles abbreviations like "PSG" for "Paris Saint Germain")
    const teamsMatch = (urlTeam, gameName) => {
      // Expand abbreviations
      const expandedUrl = expandAbbreviations(urlTeam)
      const expandedGame = expandAbbreviations(gameName)
      
      const urlWords = expandedUrl.split(' ').filter(w => w.length > 0)
      const gameWords = expandedGame.split(' ').filter(w => w.length > 0)
      
      // Check if significant words match (at least one significant match)
      let matches = 0
      for (const urlWord of urlWords) {
        for (const gameWord of gameWords) {
          // Either word contains the other, or starts with same 3+ chars
          if (urlWord.length >= 3 && gameWord.length >= 3) {
            if (urlWord.includes(gameWord) || gameWord.includes(urlWord) ||
                (urlWord.substring(0, 3) === gameWord.substring(0, 3))) {
              matches++
              break
            }
          }
        }
      }
      
      // Be more lenient: if any significant word matches AND we have a match, it's valid
      // This handles cases like "estrela da amadora" (URL) matching "Estrela" (game)
      if (matches > 0) {
        // If either URL or game name is short (1-2 words), any match is enough
        if (urlWords.length <= 2 || gameWords.length <= 2) {
          return true
        }
        // For longer names, accept if any key word matches (not just majority)
        // This is more forgiving for multi-word team names
        return true
      }
      
      return false
    }
    
    const hasHomeTeam = teamsMatch(urlTeam1, homeName) || teamsMatch(urlTeam2, homeName)
    const hasAwayTeam = teamsMatch(urlTeam1, awayName) || teamsMatch(urlTeam2, awayName)
    
    if (!hasHomeTeam || !hasAwayTeam) {
      // Use cleaned names for error message
      const cleanTeam1 = cleanTeamName(urlMatch[1])
      const cleanTeam2 = cleanTeamName(urlMatch[2])
      toast.add({
        title: '⚠️ Wrong Match URL',
        description: `This URL is for "${cleanTeam1} vs ${cleanTeam2}", not for "${props.match.home_name} vs ${props.match.away_name}"`,
        color: 'red',
        timeout: 5000
      })
      return
    }
  }
  
  // Auto-save the URL
  try {
    console.log(`📤 Saving URL for game ${props.match.id}: ${url}`)
    const response = await $fetch(`/api/admin/games/${props.match.id}`, {
      method: 'PATCH',
      body: { flashscore_url: url }
    })
    
    console.log('✓ API Response:', response)
    
    // Only update local state AFTER successful save
    flashscoreUrl.value = url
    props.match.flashscore_url = url
    emit('url-changed', { gameId: props.match.id, url })
    
    console.log('✓ URL saved successfully via drag & drop')
    
    // Success toast
    toast.add({
      title: '✓ URL Saved!',
      description: `FlashScore URL saved for ${props.match.home_name} vs ${props.match.away_name}`,
      color: 'green',
      timeout: 3000
    })
  } catch (error) {
    console.error('❌ Failed to save dropped URL:', error)
    console.error('Error details:', {
      message: error?.message,
      status: error?.status,
      statusCode: error?.statusCode,
      data: error?.data
    })
    
    // REVERT local state on failure
    flashscoreUrl.value = props.match.flashscore_url || ''
    
    toast.add({
      title: '✗ Save Failed',
      description: error?.data?.message || error?.message || 'Could not save URL to database',
      color: 'red',
      timeout: 4000
    })
  }
}
</script>
