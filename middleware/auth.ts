export default defineNuxtRouteMiddleware(async (to, from) => {
  const { isAuthenticated, checkAuth } = useAuth()

  if (!isAuthenticated.value) {
    const isAuth = await checkAuth()
    if (!isAuth) {
      return navigateTo('/login')
    }
  }
})
