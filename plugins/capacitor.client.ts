/**
 * Capacitor native integration plugin.
 *
 * Runs once on app boot (client-only). Wires up:
 *   - Status bar styling (dark theme default)
 *   - Splash screen fade-out after first paint + auth hydration
 *   - Android hardware back button:
 *       1. Close open modals/sheets (via custom 'protero:close-sheet' event)
 *       2. Else router.back() when possible
 *       3. Else exit app
 *   - Viewport resume refresh hook (emits 'protero:resume' on window)
 *
 * Page components can subscribe to `window.addEventListener('protero:resume', ...)`
 * to refetch time-sensitive data.
 */
export default defineNuxtPlugin(async () => {
  if (import.meta.server) return

  const cap = useCapacitor()
  if (!cap.isNative()) {
    // Give detection a tick to resolve; if still web, skip native wiring entirely.
    await new Promise(r => setTimeout(r, 0))
    if (!cap.isNative()) return
  }

  const router = useRouter()

  // ─── Status bar ─────────────────────────────────────────
  // Dark theme surface color; content stays light.
  await cap.setStatusBar('#14161b', 'dark')

  // ─── Splash: fade out once Nuxt has mounted ─────────────
  // Wait one frame so the first page paints, then hide.
  requestAnimationFrame(() => {
    cap.hideSplash(300).catch(() => { /* ignore */ })
  })

  // ─── Hardware back ──────────────────────────────────────
  await cap.onBackButton(async () => {
    // 1. Give any open sheet/modal a chance to close first.
    const evt = new CustomEvent('protero:back-pressed', { cancelable: true })
    const notConsumed = window.dispatchEvent(evt)
    if (!notConsumed) return true // a listener called preventDefault

    // 2. Router back if we have history.
    if (window.history.length > 1 && router.currentRoute.value.path !== '/') {
      router.back()
      return true
    }

    // 3. Nothing to go back to: let the plugin exit the app.
    return false
  })

  // ─── Resume hook ────────────────────────────────────────
  await cap.onResume(() => {
    window.dispatchEvent(new CustomEvent('protero:resume'))
  })
})
