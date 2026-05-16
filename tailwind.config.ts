import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0d12",
          soft: "#11141b",
          card: "#161a23",
          hover: "#1c2130",
        },
        border: {
          DEFAULT: "#222838",
          soft: "#1a1f2c",
        },
        ink: {
          DEFAULT: "#e6e8ee",
          dim: "#9aa3b2",
          faint: "#6b7280",
        },
        accent: {
          DEFAULT: "#7c8cff",
          soft: "#3b3f72",
        },
        physics: "#5aa9ff",
        chemistry: "#5fd0a3",
        maths: "#ffb86b",
        good: "#52d195",
        warn: "#ffb86b",
        bad: "#ff6b6b",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
