import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Palette alignée site next-impact.digital
        ink: {
          DEFAULT: "#101418",
          muted: "#5B6470",
          subtle: "#9BA3AD",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F5F5F2",
          subtle: "#FAFAF8",
        },
        accent: {
          DEFAULT: "#378ADD",      // bleu CTA
          dark: "#1F5AA0",
          light: "#E8F1FB",
        },
        success: {
          DEFAULT: "#639922",
          light: "#EAF4D8",
        },
        warning: {
          DEFAULT: "#BA7517",
          light: "#FAEEDC",
        },
        danger: {
          DEFAULT: "#C0392B",
          light: "#FAEAE7",
        },
        violet: {
          DEFAULT: "#534AB7",
          light: "#EEEDFE",
        },
      },
      boxShadow: {
        card: "0 0.5px 0 0 rgba(16,20,24,0.08), 0 1px 2px 0 rgba(16,20,24,0.04)",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
