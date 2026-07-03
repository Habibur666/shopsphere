/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B1220",
          900: "#101B2D",
          800: "#16233A",
        },
        brand: {
          50: "#EEF6F6",
          100: "#D3E9E8",
          300: "#7FBEBB",
          500: "#1F7A75",
          600: "#176560",
          700: "#124F4B",
        },
        amber: {
          400: "#E8A33D",
          500: "#D6892A",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
