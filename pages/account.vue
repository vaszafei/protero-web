<template>
  <div class="p-3 sm:p-8 max-w-4xl mx-auto">
    <PageHeader 
      title="Account Settings"
      description="Manage your account information and preferences"
    />

    <div v-if="loading" class="flex justify-center py-16">
      <LoadingSpinner size="lg" text="Loading account information..." />
    </div>

    <div v-else class="space-y-6">
      <!-- User Information Card -->
      <Card padding="6">
        <h2 class="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <User :size="20" class="text-primary-400" />
          Profile Information
        </h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-zinc-400 mb-1">Name</label>
            <p class="text-base text-zinc-100">{{ user?.name || 'N/A' }}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-zinc-400 mb-1">Email</label>
            <p class="text-base text-zinc-100">{{ user?.email || 'N/A' }}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-zinc-400 mb-1">Role</label>
            <UBadge 
              :color="user?.role === 'admin' ? 'red' : 'blue'" 
              variant="soft"
            >
              {{ user?.role || 'user' }}
            </UBadge>
          </div>
        </div>
      </Card>

      <!-- Account Stats Card -->
      <Card padding="6">
        <h2 class="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Activity :size="20" class="text-primary-400" />
          Account Statistics
        </h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Member Since"
            :value="formatDate(user?.created_at)"
            icon="Calendar"
          />
          <StatCard
            label="Selected Leagues"
            :value="selectedLeaguesCount.toString()"
            icon="Trophy"
          />
          <StatCard
            label="Last Login"
            :value="formatDate(user?.last_login || user?.created_at)"
            icon="Clock"
          />
        </div>
      </Card>

      <!-- Actions Card -->
      <Card padding="6">
        <h2 class="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
          <Settings :size="20" class="text-primary-400" />
          Quick Actions
        </h2>
        
        <div class="flex flex-wrap gap-3">
          <UButton 
            color="primary" 
            variant="outline"
            icon="i-heroicons-adjustments-horizontal"
            to="/preferences"
          >
            Manage League Preferences
          </UButton>
          
          <UButton 
            color="red" 
            variant="outline"
            icon="i-heroicons-arrow-right-on-rectangle"
            @click="handleLogout"
          >
            Logout
          </UButton>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { User, Activity, Settings, Calendar, Trophy, Clock } from 'lucide-vue-next'
import PageHeader from '~/components/ui/PageHeader.vue'
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue'
import Card from '~/components/ui/Card.vue'
import StatCard from '~/components/ui/StatCard.vue'

definePageMeta({
  middleware: 'auth'
})

const { user, logout } = useAuth()
const api = useApi()
const loading = ref(false)
const selectedLeaguesCount = ref(0)

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

const handleLogout = async () => {
  await logout()
}

// Fetch user's selected leagues count
onMounted(async () => {
  loading.value = true
  try {
    const response = await api.fetchSubscriptions()
    if (response?.subscriptions) {
      selectedLeaguesCount.value = response.subscriptions.length
    }
  } catch (error) {
    console.error('Error loading user data:', error)
  } finally {
    loading.value = false
  }
})
</script>
