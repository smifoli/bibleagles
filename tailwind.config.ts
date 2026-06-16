import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f5efe4",
        canvas: "#e8e0d4",
        surface: "#fbf7ef",
        border: "#e6dac6",
        "card-dark": "#2a2017",
        "text-primary": "#1c150e",
        "text-secondary": "#52442f",
        "text-muted": "#93826d",
        accent: "#f1e6a0",
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        serif: ["var(--font-spectral)", "Georgia", "serif"],
      },
      fontSize: {
        verse: ["16px", { lineHeight: "1.8" }],
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};

export default config;
