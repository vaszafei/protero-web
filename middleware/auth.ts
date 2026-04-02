export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, needsOnboarding, checkAuth } = useAuth()
  
  // Check if user is authenticated
  if (!isAuthenticated.value) {
    const isAuth = await checkAuth()
    
    if (!isAuth) {
      return navigateTo('/login')
    }
  }

  // Redirect to onboarding if profile is incomplete
  // (skip if already on the onboarding page)
  if (needsOnboarding.value && to.path !== '/onboarding') {
    return navigateTo('/onboarding')
  }
})
