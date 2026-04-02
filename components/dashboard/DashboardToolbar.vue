<template>
  <div class="flex items-center justify-between gap-3">
    <!-- Left: Wallet switcher dropdown -->
    <div v-if="wallets.length > 0" class="relative" ref="walletDropdownRef">
      <button
        class="toolbar-btn flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
        @click="walletOpen = !walletOpen"
      >
        <span class="font-medium text-zinc-300 max-w-[160px] truncate">{{ activeWallet?.name || 'Select Wallet' }}</span>
      </button>

      <!-- Wallet list panel -->
      <Transition name="dropdown">
        <div v-if="walletOpen" class="dropdown-panel absolute left-0 top-full mt-1.5 z-50 min-w-[220px] rounded-lg py-1.5">
          <p class="px-3 pb-1.5 pt-0.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Switch Wallet</p>
          <button
            v-for="w in wallets"
            :key="w.id"
            class="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-zinc-700/30 transition-colors"
            :class="selectedWalletId === w.id ? 'text-zinc-100' : 'text-zinc-400'"
            @click="selectWallet(w.id)"
          >
            <div class="flex flex-col items-start gap-0.5 min-w-0">
              <span class="font-medium truncate" :class="selectedWalletId === w.id ? 'text-zinc-100' : 'text-zinc-300'">{{ w.name }}</span>
            </div>
            <span class="ml-3 tabular-nums text-xs flex-shrink-0" :class="selectedWalletId === w.id ? 'text-emerald-400' : 'text-zinc-500'">
              {{ formatCurrency(toNum(w.balance)) }}
            </span>
          </button>
        </div>
      </Transition>
    </div>

    <div v-else class="w-0" />

    <!-- Right: Sport dropdown (only when multi-sport) -->
    <div v-if="availableSports.length > 1" class="relative" ref="sportDropdownRef">
      <button
        class="toolbar-btn flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
        @click="sportOpen = !sportOpen"
      >
        <span class="font-medium text-zinc-300 capitalize">{{ selectedSport === 'all' ? 'All Sports' : selectedSport }}</span>
      </button>

      <Transition name="dropdown">
        <div v-if="sportOpen" class="dropdown-panel absolute right-0 top-full mt-1.5 z-50 w-44 rounded-lg py-1.5">
          <button
            v-for="sport in ['all', ...availableSports]"
            :key="sport"
            class="w-full flex items-center px-3 py-2 text-sm hover:bg-zinc-700/30 transition-colors capitalize"
            :class="selectedSport === sport ? 'text-zinc-100 font-semibold' : 'text-zinc-400'"
            @click="selectSport(sport)"
          >
            {{ sport === 'all' ? 'All Sports' : sport }}
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  wallets: { id: number; name: string; balance: any; is_active?: boolean }[]
  selectedWalletId: number | null
  availableSports: string[]
  selectedSport: string
}>()

const emit = defineEmits<{
  'wallet-change': [id: number]
  'sport-change': [sport: string]
}>()

const walletOpen = ref(false)
const sportOpen = ref(false)
const walletDropdownRef = ref<HTMLElement | null>(null)
const sportDropdownRef = ref<HTMLElement | null>(null)

function onDocumentClick(e: MouseEvent) {
  if (walletDropdownRef.value && !walletDropdownRef.value.contains(e.target as Node)) {
    walletOpen.value = false
  }
  if (sportDropdownRef.value && !sportDropdownRef.value.contains(e.target as Node)) {
    sportOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

const activeWallet = computed(() => props.wallets.find(w => w.id === props.selectedWalletId) || props.wallets[0] || null)

function toNum(val: any): number {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)
}

function selectWallet(id: number) {
  emit('wallet-change', id)
  walletOpen.value = false
}

function selectSport(sport: string) {
  emit('sport-change', sport)
  sportOpen.value = false
}
</script>

<style scoped>
.toolbar-btn {
  background: rgba(28, 31, 39, 0.85);
  border: 1px solid rgba(42, 47, 58, 0.6);
  transition: background 0.15s, border-color 0.15s;
}
.toolbar-btn:hover {
  background: rgba(42, 47, 58, 0.7);
  border-color: rgba(42, 47, 58, 0.9);
}
.dropdown-panel {
  background: rgba(22, 25, 32, 0.98);
  border: 1px solid rgba(42, 47, 58, 0.7);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(8px);
}
.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
