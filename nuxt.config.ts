export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/panels.css'],
  app: {
    head: {
      title: 'ΠροΤερο Admin',
      link: [
        { rel: 'icon', type: 'image/png', href: '/proteroLogo.png' }
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
      // True when this build is wrapped by Capacitor (APK).
      // When true, useAuth() routes through Supabase Edge Functions
      // (`/functions/v1/auth-*`) instead of Nitro `/api/auth/*`.
      capacitor: process.env.CAPACITOR_BUILD === 'true',
    }
  }
})
