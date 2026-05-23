export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"]
      },
      colors: {
        ink: "#05050a",
        paper: "#f8fafc",
        acid: "#b9ff3d",
        cyanx: "#37e7ff",
        rosefire: "#ff4d8d",
        violetx: "#8b5cf6"
      },
      boxShadow: {
        glow: "0 0 48px rgba(55, 231, 255, 0.28)",
        acid: "0 0 42px rgba(185, 255, 61, 0.2)"
      }
    }
  },
  plugins: []
};
