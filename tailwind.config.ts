import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cf: {
          page: "var(--cf-page)",
          surface: "var(--cf-surface)",
          "surface-muted": "var(--cf-surface-muted)",
          input: "var(--cf-input)",
          border: "var(--cf-border)",
          muted: "var(--cf-muted)",
          body: "var(--cf-body)",
          ink: "var(--cf-ink)",
          accent: "var(--cf-accent)",
          "accent-hover": "var(--cf-accent-hover)",
          quote: "var(--cf-quote-bg)",
          code: "var(--cf-code-bg)",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans-official)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
