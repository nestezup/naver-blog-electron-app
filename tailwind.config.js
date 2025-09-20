/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/renderer/**/*.{html,js}",
    "./app/renderer/index.html",
    "./app/renderer/js/**/*.js"
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: ["light", "dark"]
  }
}