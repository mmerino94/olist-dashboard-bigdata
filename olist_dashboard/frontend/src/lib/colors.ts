// Paleta de gráficos alineada a la identidad navy corporativa.
// Espejo de tailwind.config.js + BRIEF_DISENO_DASHBOARD_OLIST.md.
export const colors = {
  primario: "#27295a",   // navy
  secundario: "#304b9a", // navy-medium
  acento: "#3c78bb",     // blue-accent
  claro: "#85B7EB",      // blue-light
  verde: "#2f7d5b",      // good
  amarillo: "#b27a1a",   // warn
  rojo: "#a8423a",       // bad
  gris: "#71706f",
};

export const segmentColors: Record<string, string> = {
  VIP: "#27295a",
  Frecuentes: "#304b9a",
  "En riesgo": "#b27a1a",
  Dormidos: "#85B7EB",
  Perdidos: "#d1d0d6",
};

export const sellerColors: Record<string, string> = {
  Elite: "#2f7d5b",
  Estándar: "#3c78bb",
  "En observación": "#b27a1a",
  Crítico: "#a8423a",
};

export const ratingColors: Record<string, string> = {
  Buena: "#2f7d5b",
  Regular: "#b27a1a",
  Mala: "#a8423a",
};

export const palette = [
  "#27295a", "#304b9a", "#3c78bb", "#85B7EB",
  "#2f7d5b", "#b27a1a", "#a8423a", "#71706f",
];
