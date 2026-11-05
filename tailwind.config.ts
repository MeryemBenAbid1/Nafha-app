import type { Config } from "tailwindcss";

// Plain colours on purpose: the new Nafha brand look is still being designed.
// When it is ready, put its colours here and every screen picks them up.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
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
