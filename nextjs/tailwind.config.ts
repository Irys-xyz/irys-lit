import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF8415",
        secondary: "#FFC46C",
        accent: "#FFC46C",
        background: "#FEF4EE",
      },
    },
  },
  plugins: [],
};
export default config;
