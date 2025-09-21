import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/renderer/**/*.{html,js}",
    "./src/**/*.{js}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 2s linear infinite',
      }
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark", "cupcake", "autumn"],
  },
}
