<template>
  <div class="px-3 py-3 sm:px-6 sm:py-6 max-w-2xl mx-auto space-y-3">
    <ProfileCard :user="user" />
    <SubscriptionsCard />
    <CreditsCard />
    <NotificationsCard />
    <DangerZone />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

const { user } = useAuth()

useHead({
  title: 'Account · Protero',
})
</script>
