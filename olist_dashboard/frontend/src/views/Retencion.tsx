import HeroBanner from "../components/HeroBanner";
import Placeholder from "../components/Placeholder";

export default function Retencion() {
  return (
    <div>
      <HeroBanner
        eyebrow="P2 · RETENCIÓN · RFM"
        title="¿Por qué los clientes no vuelven?"
        subtitle="Segmentación RFM con F categórica (no NTILE) por el sesgo del 97% one-time · 6 segmentos accionables."
      />
      <Placeholder vista="P2 Retención" dia="Día 3" />
    </div>
  );
}
