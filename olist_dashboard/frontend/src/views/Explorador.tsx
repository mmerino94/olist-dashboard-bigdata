import KpiRow from "../components/explorador/KpiRow";
import RentabilidadPanel from "../components/explorador/charts/RentabilidadPanel";
import TreemapRFM from "../components/explorador/charts/TreemapRFM";
import MapaRegiones from "../components/explorador/charts/MapaRegiones";
import CuadranteVendedores from "../components/explorador/charts/CuadranteVendedores";
import BalanceSatisfaccion from "../components/explorador/charts/BalanceSatisfaccion";

export default function Explorador() {
  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold text-ink tracking-tight">Explorador ejecutivo</h1>
          <p className="text-[13.5px] text-gray mt-0.5">Visión 360° del negocio · cada panel profundiza en su análisis</p>
        </div>
        <div className="flex items-center gap-2 text-[12.5px] text-good font-medium">
          <span className="w-2 h-2 rounded-full bg-good" /> Datos en vivo
        </div>
      </header>

      <KpiRow />

      <div className="text-[11px] uppercase tracking-[0.1em] text-gray font-mono mt-1">
        Análisis por problema · clic para profundizar
      </div>
      <RentabilidadPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <TreemapRFM />
        <MapaRegiones />
        <CuadranteVendedores />
        <BalanceSatisfaccion />
      </div>
    </div>
  );
}
