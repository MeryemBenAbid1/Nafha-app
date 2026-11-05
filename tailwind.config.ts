import type { Config } from "tailwindcss";

// Meryem's Nafha brand (moodboard): light cream background, plum text, gold and rose accents.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "var(--font-arabic)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "serif"],
      },
      colors: {
        cream: "#F5EFE6",
        sand: "#D9C5AE",
        plum: "#4A2D2D",
        rose: "#B77B70",
        gold: "#C18A4A",
        ink: "#241D1E",
        genuine: "#2F7D57",
        diluted: "#C28A1E",
        synthetic: "#B23B2E",
        unknown: "#6B7680",
      },
    },
  },
  plugins: [],
};
export default config;
