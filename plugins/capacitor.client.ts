/**
 * Capacitor plugin — handles Android back button and app lifecycle.
 * Only runs on the client side (*.client.ts).
 *
 * Uses globalThis.Capacitor (injected by the native shell) to detect
 * native context without importing @capacitor/core — which would fail
 * Vite's static import analysis during `nuxi dev`.
 */
export default defineNuxtPlugin(() => {
  // Capacitor native shell injects window.Capacitor before any JS runs.
  // If it's not there, we're in a plain browser — nothing to do.
  const cap = (globalThis as any).Capacitor
  if (!cap?.isNativePlatform?.()) return

  const router = useRouter()

  // Android hardware back button → navigate back or minimize app
  cap.Plugins?.App?.addListener?.('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
    if (canGoBack) {
      router.back()
    } else {
      cap.Plugins.App.minimizeApp()
    }
  })

  // App resume — log (could trigger data refresh later)
  cap.Plugins?.App?.addListener?.('appStateChange', ({ isActive }: { isActive: boolean }) => {
    if (isActive) {
      console.log('[Capacitor] App resumed')
    }
  })
})
