<template>
  <div class="inline-block">
    <UButton
      icon="i-heroicons-photo"
      color="emerald"
      variant="soft"
      size="sm"
      @click="openModal"
    >
      Upload Round Image
    </UButton>

    <!-- Upload Modal -->
    <UModal v-model="isOpen">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-blue-900">Upload Round {{ round }} Results</h3>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- File Upload Area -->
          <div
            @drop.prevent="handleDrop"
            @dragover.prevent
            class="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors"
            :class="{ 'bg-blue-50': isDragging }"
            @dragenter="isDragging = true"
            @dragleave="isDragging = false"
          >
            <div v-if="!imagePreview" class="space-y-4">
              <UIcon name="i-heroicons-photo" class="text-6xl text-blue-400 mx-auto" />
              <div>
                <p class="text-blue-900 font-medium">Drop image here or click to upload</p>
                <p class="text-sm text-blue-600 mt-1">PNG, JPG up to 10MB</p>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileSelect"
                class="hidden"
              />
              <UButton
                color="primary"
                @click="$refs.fileInput.click()"
              >
                Select Image
              </UButton>
            </div>

            <!-- Image Preview -->
            <div v-else class="space-y-4">
              <img :src="imagePreview" alt="Preview" class="max-h-96 mx-auto rounded-lg shadow-lg" />
              <UButton
                color="red"
                variant="soft"
                @click="clearImage"
              >
                Remove Image
              </UButton>
            </div>
          </div>

          <!-- Processing Status -->
          <div v-if="processing" class="text-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="text-4xl text-blue-600 animate-spin mx-auto mb-2" />
            <p class="text-blue-900 font-medium">Processing image with OCR...</p>
            <p class="text-sm text-blue-600">Extracting match results</p>
          </div>

          <!-- Extracted Results -->
          <div v-if="extractedResults.length > 0" class="space-y-3">
            <h4 class="font-bold text-blue-900">Extracted Results ({{ extractedResults.length }} matches)</h4>
            <div class="max-h-64 overflow-y-auto space-y-2">
              <div
                v-for="(result, index) in extractedResults"
                :key="index"
                class="p-3 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div class="flex items-center justify-between text-sm">
                  <span class="font-medium text-blue-900">{{ result.home_team }}</span>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-lg text-blue-900">{{ result.home_score }}</span>
                    <span class="text-blue-600">-</span>
                    <span class="font-bold text-lg text-blue-900">{{ result.away_score }}</span>
                  </div>
                  <span class="font-medium text-teal-900">{{ result.away_team }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="gray"
              variant="ghost"
              @click="isOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :disabled="!imagePreview || processing"
              :loading="processing"
              @click="processImage"
            >
              Process Image
            </UButton>
            <UButton
              v-if="extractedResults.length > 0"
              color="green"
              :loading="saving"
              @click="saveResults"
            >
              Save All Results
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup>
const props = defineProps({
  round: {
    type: [Number, String],
    required: true
  },
  leagueKey: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['saved'])

const isOpen = ref(false)
const isDragging = ref(false)
const imagePreview = ref(null)
const imageFile = ref(null)
const processing = ref(false)
const saving = ref(false)
const extractedResults = ref([])
const fileInput = ref(null)

const openModal = () => {
  isOpen.value = true
}

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    processFile(file)
  }
}

const handleDrop = (event) => {
  isDragging.value = false
  const file = event.dataTransfer.files[0]
  if (file && file.type.startsWith('image/')) {
    processFile(file)
  }
}

const processFile = (file) => {
  imageFile.value = file
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

const clearImage = () => {
  imagePreview.value = null
  imageFile.value = null
  extractedResults.value = []
}

const processImage = async () => {
  if (!imageFile.value) return

  processing.value = true
  const formData = new FormData()
  formData.append('image', imageFile.value)
  formData.append('round', props.round)
  formData.append('leagueKey', props.leagueKey)

  try {
    const response = await $fetch('/api/admin/ocr-results', {
      method: 'POST',
      body: formData
    })

    extractedResults.value = response.results || []

    useToast().add({
      title: 'Success',
      description: `Extracted ${extractedResults.value.length} match results`,
      color: 'green'
    })
  } catch (error) {
    console.error('Error processing image:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to process image',
      color: 'red'
    })
  } finally {
    processing.value = false
  }
}

const saveResults = async () => {
  saving.value = true
  try {
    await $fetch('/api/admin/bulk-update-results', {
      method: 'POST',
      body: {
        leagueKey: props.leagueKey,
        round: props.round,
        results: extractedResults.value
      }
    })

    useToast().add({
      title: 'Success',
      description: `Updated ${extractedResults.value.length} matches`,
      color: 'green'
    })

    isOpen.value = false
    clearImage()
    emit('saved')
  } catch (error) {
    console.error('Error saving results:', error)
    useToast().add({
      title: 'Error',
      description: 'Failed to save results',
      color: 'red'
    })
  } finally {
    saving.value = false
  }
}
</script>
