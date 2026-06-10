/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,vue}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B2A4A',
          light: '#2A3F6A',
          dark: '#0F1A33',
        },
        accent: {
          DEFAULT: '#FF6B35',
          light: '#FF8A5C',
          dark: '#E5551F',
        },
        bg: {
          DEFAULT: '#F5F6FA',
          card: '#FFFFFF',
        },
        text: {
          DEFAULT: '#2D3748',
          light: '#718096',
          muted: '#A0AEC0',
        },
        border: '#E2E8F0',
        success: '#38A169',
        danger: '#E53E3E',
        info: '#3182CE',
      },
    },
  },
  plugins: [],
};
