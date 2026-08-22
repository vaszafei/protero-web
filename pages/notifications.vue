<template>
  <div class="px-3 py-3 sm:px-6 sm:py-6 max-w-2xl mx-auto">
    <div class="mb-3 flex items-center gap-2">
      <UButton
        size="xs"
        color="white"
        variant="ghost"
        icon="i-heroicons-arrow-left"
        @click="goBack"
      />
      <h1 class="text-base font-bold text-zinc-100">Notifications</h1>
    </div>
    <AccountNotificationsCard />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const router = useRouter()
function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/account')
}

useHead({
  title: 'Notifications · Protero',
})
</script>
