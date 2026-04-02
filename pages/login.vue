<template>
  <LoginForm />
</template>

<script setup>
definePageMeta({
  layout: false
})

const { isAuthenticated } = useAuth()

// Redirect to dashboard if already logged in
onMounted(() => {
  if (isAuthenticated.value) {
    navigateTo('/')
  }
})
</script>
