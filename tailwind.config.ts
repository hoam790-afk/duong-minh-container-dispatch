import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1555A6",
          navy: "#0B2F63",
          sky: "#EAF3FF",
          red: "#CE1715",
          gold: "#D8A62B",
          orange: "#F0782D"
        }
      },
      boxShadow: {
        soft: "0 14px 40px rgba(15, 42, 85, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
