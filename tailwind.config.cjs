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
