/*
 * Tailwind reads the SAME values as `assets/css/tokens.css`, so a utility class
 * and a hand-written `<style>` block cannot drift. Where a value is a plain hex
 * it is duplicated (Tailwind cannot compute opacity variants from a custom
 * property without the `<alpha-value>` dance, and this palette is small enough
 * that the duplication is cheaper than the indirection). tokens.css is the
 * source of truth; if you change a value, change it in both and re-run
 * `node scripts/validate_palette.js`.
 */
module.exports = {
  content: [
    './pages/**/*.vue',
    './components/**/*.vue',
    './layouts/**/*.vue',
    './app.vue',
    './node_modules/nuxt/**/dist/**/*.{js,vue}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1c1f27',
          base: '#14161b',
          light: '#252830',
          lift: '#232732',
          hover: '#2d3139',
        },
        edge: {
          DEFAULT: '#2a2f3a',
          light: '#353c48',
        },
        // The logo pair. `pure` is the wordmark's own ink — legible on white,
        // NOT on a dark surface (#0040a0 is 1.76:1 there). `DEFAULT` is the
        // dark-surface-safe step and is what marks and text should use.
        brand: {
          red: {
            DEFAULT: '#f8514f',
            pure: '#f02020',
            hi: '#ff6b6b',
          },
          blue: {
            DEFAULT: '#4d8fff',
            pure: '#0040a0',
            hi: '#7aabff',
          },
        },
        // Money and state. `positive` is deliberately not brand blue.
        positive: '#34d399',
        negative: '#f8514f',
        warning: '#fab219',
        // Nuxt UI's `primary` (app.config.ts). A full 50–950 scale on the logo
        // blue so buttons, focus rings and toggles carry the wordmark's hue
        // instead of Tailwind's stock blue. 500 is the dark-surface-safe step
        // (`brand.blue.DEFAULT`), 800 is the logo ink itself.
        protero: {
          50: '#eef4ff',
          100: '#dce8ff',
          200: '#bcd3ff',
          300: '#92b7ff',
          400: '#6ea0ff',
          500: '#4d8fff',
          600: '#2f72f2',
          700: '#1f5ad6',
          800: '#0040a0',
          900: '#0a3580',
          950: '#071f4f',
        },
      },
      // Readability. On the #1c1f27 panel, stock zinc-600 text scored 2.1:1
      // and zinc-500 3.4:1 — 740 captions and labels under any legibility
      // floor. Only the TEXT utilities are lifted; bg-/border-zinc-* keep the
      // stock values. Mirrors --ink-faint / --ink-mute in tokens.css.
      //   700 → 3.1:1 · 600 → 4.1:1 (4.5 on the page) · 500 → 5.2:1
      textColor: {
        zinc: {
          700: '#6b6b76',
          600: '#7e7e8a',
          500: '#8f8f9b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      maxWidth: {
        page: '1760px',
      },
      transitionTimingFunction: {
        rise: 'cubic-bezier(0.22, 1, 0.36, 1)',
        glide: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: []
}
