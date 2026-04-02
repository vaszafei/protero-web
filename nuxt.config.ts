export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  app: {
    head: {
      title: 'ΠροΤερο',
      link: [
        { rel: 'icon', type: 'image/png', href: '/proteroLogo.png' },
        { rel: 'apple-touch-icon', href: '/proteroLogo.png' }
      ],
      meta: [
        { name: 'description', content: 'ΠροΤερο — Sports Prediction & Betting Intelligence' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'theme-color', content: '#14161b' },
        { name: 'format-detection', content: 'telephone=no' }
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
      inline: ['@supabase/supabase-js', 'bcryptjs', 'cheerio', 'jsdom', 'simple-statistics']
    },
    moduleSideEffects: ['puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'tesseract.js']
  },
  ui: {
    icons: ['heroicons'],
    notifications: {
      position: 'top-0 center'
    }
  },
  runtimeConfig: {
    // Private (server-only)
    // Supabase Configuration (NEW - Primary Database)
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    
    // Admin & Security
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET,
    
    // Public (exposed to frontend)
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    }
  }
})
