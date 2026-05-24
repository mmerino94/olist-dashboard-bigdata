import HeroBanner from "../components/HeroBanner";
import Placeholder from "../components/Placeholder";

export default function Satisfaccion() {
  return (
    <div>
      <HeroBanner
        eyebrow="P5 · SATISFACCIÓN"
        title="¿Cuáles son las causas de insatisfacción?"
        subtitle="Distribución bimodal de puntuaciones · NPS estimado mensual · 4 causas de quejas (NLP en bigramas) · positivos vs negativos."
      />
      <Placeholder vista="P5 Satisfacción" dia="Día 5" />
    </div>
  );
}
