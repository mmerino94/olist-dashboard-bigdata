import HeroBanner from "../components/HeroBanner";
import Placeholder from "../components/Placeholder";

export default function Logistica() {
  return (
    <div>
      <HeroBanner
        eyebrow="P3 · LOGÍSTICA"
        title="¿En qué rutas se concentran los retrasos?"
        subtitle="Mapa de Brasil con concentración de operación · heatmap origen×destino · comparativo intra vs inter-estado."
      />
      <Placeholder vista="P3 Logística" dia="Día 4" />
    </div>
  );
}
