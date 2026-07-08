/**
 * Capacitor native integration helpers.
 *
 * All methods are **safe to call on web** — they no-op when running outside
 * a Capacitor native runtime. Plugin modules are dynamically imported so a
 * missing native dep (e.g. @capacitor/haptics not installed yet) does not
 * break the build.
 *
 * Usage:
 *   const cap = useCapacitor()
 *   cap.haptic('light')
 *   cap.setStatusBar('#14161b')
 *   cap.hideSplash()
 */

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection'

// ─── Lazy module loaders ──────────────────────────────────
let _core: Promise<any> | null = null
function loadCore() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (!_core) _core = import('@capacitor/core').catch(() => null)
  return _core
}

async function loadPlugin<T = any>(name: string): Promise<T | null> {
  if (typeof window === 'undefined') return null
  try {
    const mod = await import(/* @vite-ignore */ name)
    return mod as T
  } catch {
    return null
  }
}

// ─── Platform detection ───────────────────────────────────
async function detectNative(): Promise<boolean> {
  const core = await loadCore()
  try { return !!core?.Capacitor?.isNativePlatform?.() } catch { return false }
}

// Cached sync value populated on first call; safe to read as "best-effort".
let _isNativeCached: boolean | null = null
detectNative().then(v => { _isNativeCached = v })

export function useCapacitor() {
  /** Synchronous best-effort flag. `null` during the first render, then `true|false`. */
  const isNative = () => _isNativeCached === true

  /**
   * Trigger haptic feedback on native platforms. No-op on web.
   */
  async function haptic(style: HapticStyle = 'light'): Promise<void> {
    if (!(await detectNative())) return
    const mod: any = await loadPlugin('@capacitor/haptics')
    if (!mod?.Haptics) return
    try {
      if (style === 'selection') await mod.Haptics.selectionChanged()
      else await mod.Haptics.impact({ style: mod.ImpactStyle?.[style.charAt(0).toUpperCase() + style.slice(1)] ?? 'Light' })
    } catch { /* ignore */ }
  }

  /**
   * Set status bar background + content style. No-op on web.
   * @param backgroundColor hex string, e.g. '#14161b'
   * @param style 'dark' (light content on dark bg) | 'light'
   */
  async function setStatusBar(backgroundColor: string, style: 'dark' | 'light' = 'dark'): Promise<void> {
    if (!(await detectNative())) return
    const mod: any = await loadPlugin('@capacitor/status-bar')
    if (!mod?.StatusBar) return
    try {
      await mod.StatusBar.setBackgroundColor({ color: backgroundColor })
      await mod.StatusBar.setStyle({ style: style === 'dark' ? mod.Style?.Dark ?? 'DARK' : mod.Style?.Light ?? 'LIGHT' })
    } catch { /* ignore */ }
  }

  /**
   * Hide the splash screen with fade. Safe to call more than once.
   */
  async function hideSplash(fadeOutDuration = 300): Promise<void> {
    if (!(await detectNative())) return
    const mod: any = await loadPlugin('@capacitor/splash-screen')
    if (!mod?.SplashScreen) return
    try { await mod.SplashScreen.hide({ fadeOutDuration }) } catch { /* ignore */ }
  }

  /**
   * Register a handler for Android hardware back button.
   * Returns a disposer. Handler receives `{ canGoBack }`; if it returns true,
   * navigation is considered consumed (don't fall back to default behavior).
   */
  async function onBackButton(handler: (ev: { canGoBack: boolean }) => boolean | Promise<boolean>): Promise<() => void> {
    if (!(await detectNative())) return () => { /* noop */ }
    const mod: any = await loadPlugin('@capacitor/app')
    if (!mod?.App) return () => { /* noop */ }
    try {
      const listener = await mod.App.addListener('backButton', async (ev: { canGoBack: boolean }) => {
        const consumed = await handler(ev)
        if (!consumed && !ev.canGoBack) {
          try { await mod.App.exitApp() } catch { /* ignore */ }
        }
      })
      return () => { try { listener.remove() } catch { /* ignore */ } }
    } catch {
      return () => { /* noop */ }
    }
  }

  /**
   * Fire a callback whenever the app resumes from background.
   */
  async function onResume(handler: () => void): Promise<() => void> {
    if (!(await detectNative())) return () => { /* noop */ }
    const mod: any = await loadPlugin('@capacitor/app')
    if (!mod?.App) return () => { /* noop */ }
    try {
      const listener = await mod.App.addListener('appStateChange', (state: { isActive: boolean }) => {
        if (state.isActive) handler()
      })
      return () => { try { listener.remove() } catch { /* ignore */ } }
    } catch {
      return () => { /* noop */ }
    }
  }

  return { isNative, haptic, setStatusBar, hideSplash, onBackButton, onResume }
}
