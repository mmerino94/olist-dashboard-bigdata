import HeroBanner from "../components/HeroBanner";
import Placeholder from "../components/Placeholder";

export default function Vendedores() {
  return (
    <div>
      <HeroBanner
        eyebrow="P4 · VENDEDORES"
        title="¿Quiénes son los vendedores tóxicos?"
        subtitle="Scorecard de 3,094 vendedores con semáforo Elite / Estándar / En observación / Crítico · scatter ingreso × rating."
      />
      <Placeholder vista="P4 Vendedores" dia="Día 5" />
    </div>
  );
}
