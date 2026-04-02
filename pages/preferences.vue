<template>
  <div class="p-3 sm:p-8 max-w-4xl mx-auto">
    <PageHeader 
      title="League Preferences"
      description="Select the leagues you want to follow"
    />

    <div class="space-y-6">
      <!-- League Preferences Component -->
      <LeaguePreferences @saved="handlePreferencesSaved" />

      <!-- Admin Notice -->
      <Card v-if="isAdmin" padding="4">
        <div class="flex items-start gap-3">
          <Info :size="20" class="text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <p class="font-semibold text-zinc-100">Admin Account</p>
            <p class="text-sm text-zinc-400 mt-1">As an administrator, you have access to all leagues and the admin panel regardless of preferences.</p>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { Info } from 'lucide-vue-next'
import PageHeader from '~/components/ui/PageHeader.vue'
import Card from '~/components/ui/Card.vue'

definePageMeta({
  middleware: 'auth'
})

const { isAdmin } = useAuth()
const router = useRouter()
const toast = useToast()

const handlePreferencesSaved = () => {
  toast.add({
    title: 'Preferences saved',
    description: 'Your league preferences have been updated',
    color: 'green'
  })
  
  setTimeout(() => {
    router.push('/leagues')
  }, 1000)
}
</script>
