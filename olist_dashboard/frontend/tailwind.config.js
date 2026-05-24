/** @type {import('tailwindcss').Config} */
// Paleta corporativa Olist Dashboard — alineada con el diseño del zip
// (BRIEF_DISENO_DASHBOARD_OLIST.md). Tono McKinsey/BCG: sobrio, denso, azul navy.
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta corporativa
        navy: "#27295a",          // fondo portada/footer/header principal
        "navy-medium": "#304b9a", // cards oscuras, nodos secundarios
        "blue-accent": "#3c78bb", // líneas, gradiente del logo, énfasis primario
        "blue-accent-text": "#2e6aa8", // texto pequeño sobre tinted bg
        "blue-light": "#85B7EB",  // apoyo en fondos oscuros, hover, métricas 2°
        gray: "#71706f",          // texto secundario, ejes
        "gray-300": "#d1d0d6",
        "gray-200": "#e3e2e8",
        "gray-100": "#ecebf1",
        bg: "#F0F0F8",            // background del área de contenido
        paper: "#ffffff",
        ink: "#14163a",           // texto principal sobre fondos claros

        // Semánticos (sobrios, NO saturados)
        good: "#2f7d5b",          // Elite / positivo
        warn: "#b27a1a",          // En observación
        bad: "#a8423a",           // Crítico / negativo

        // Aliases para semáforo (compatibilidad con código existente)
        critico: "#a8423a",
        observacion: "#b27a1a",
        estandar: "#3c78bb",
        elite: "#2f7d5b",
      },
      fontFamily: {
        sans: [
          "IBM Plex Sans",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Helvetica Neue",
          "Arial",
        ],
        mono: [
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "monospace",
        ],
        serif: [
          "IBM Plex Serif",
          "Georgia",
          "serif",
        ],
      },
      fontSize: {
        // Sobre-escribir base para look corporativo más compacto
        base: ["14px", { lineHeight: "1.5" }],
      },
    },
  },
  plugins: [],
};
