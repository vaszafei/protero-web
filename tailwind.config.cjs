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
          hover: '#2d3139',
        },
        edge: {
          DEFAULT: '#2a2f3a',
          light: '#353c48',
        },
      },
    },
  },
  plugins: []
}
