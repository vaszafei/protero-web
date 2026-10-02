export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  // tokens.css must load FIRST — panels.css and every component `<style>`
  // resolve their custom properties from it.
  css: ['~/assets/css/tokens.css', '~/assets/css/panels.css'],
  app: {
    // 160 ms fade + 4 px rise between routes (CSS in assets/css/panels.css, with its own
    // reduced-motion kill switch). Every page has ONE root element, which Transition requires.
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'ΠροΤερο Admin',
      link: [
        { rel: 'icon', type: 'image/png', href: '/proteroLogo.png' },
        // Inter: tabular figures and a tall x-height hold up at the 10–12px
        // sizes this console is full of. Falls back to system-ui offline.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' }
      ],
      meta: [
        { name: 'description', content: 'ΠροΤερο — Admin Dashboard' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },
  colorMode: {
    preference: 'dark'
  },
  ssr: false,
  compatibilityDate: '2025-12-12',
  nitro: {
    compatibilityDate: '2025-12-12',
    externals: {
      inline: ['@supabase/supabase-js', 'bcryptjs']
    },
    rollupConfig: {
      // Inlining supabase-js makes Rollup report every error class it
      // re-exports (StorageApiError, PostgrestError, FunctionsError…) as an
      // unused external import. Harmless, and it buried real warnings in
      // every dev start. Nitro's own filter (circular deps, eval) is kept.
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.exporter?.includes('@supabase/')) return
        if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'EVAL') return
        if (warning.message.includes('Unsupported source map comment')) return
        warn(warning)
      }
    }
  },
  ui: {
    icons: ['heroicons'],
    notifications: {
      position: 'top-0 center'
    }
  },
  runtimeConfig: {
    // Private (server-only) — local Supabase
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,

    // Admin & Security
    adminPassword: process.env.ADMIN_PASSWORD,
    jwtSecret: process.env.JWT_SECRET,
    // HS256 secret matching the target Supabase project (local OR cloud).
    // Tokens signed with this pass Supabase RLS via `Authorization: Bearer`.
    supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,

    // Public (exposed to frontend)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    }
  }
})
