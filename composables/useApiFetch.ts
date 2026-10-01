/**
 * `$fetch` for our own /api: sends the stored JWT as a Bearer header.
 *
 * The app counts a user as signed in on the localStorage token alone, so a
 * request carrying only the httpOnly cookie answers 401 whenever the cookie is
 * gone (/my-real-bets and /fantasy, 2026-10-01). A 401 here means the token is
 * dead: clear it and go to /login rather than render an empty page.
 */
export const useApiFetch = () => {
  const { getToken, setToken } = useAuthToken()
  const user = useState<unknown>('user')

  return $fetch.create({
    onRequest({ options }) {
      const token = getToken()
      if (!token) return
      const headers = new Headers(options.headers as HeadersInit | undefined)
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    },
    onResponseError({ response }) {
      if (response.status !== 401) return
      setToken(null)
      user.value = null
      navigateTo('/login')
    }
  })
}
