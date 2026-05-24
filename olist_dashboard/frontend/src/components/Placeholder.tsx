// Placeholder visual mientras la vista detallada se implementa.
// Se reemplaza en los Días 3-5 del plan de migración.
type Props = {
  vista: string;
  dia: string;
};

export default function Placeholder({ vista, dia }: Props) {
  return (
    <div className="px-8 py-16">
      <div className="bg-paper border border-gray-200 rounded p-10 text-center max-w-xl mx-auto">
        <div className="text-[10.5px] tracking-[0.14em] uppercase text-blue-accent-text font-mono mb-2">
          En construcción
        </div>
        <h2 className="text-[18px] font-semibold text-ink mb-3">
          Vista {vista}
        </h2>
        <p className="text-[13px] text-gray leading-relaxed mb-4">
          Esta vista se implementa en el <strong>{dia}</strong> del plan de migración.
          Los datos ya están materializados en el data mart correspondiente y
          disponibles como JSON en <code className="font-mono text-[11.5px]">public/data/</code>.
        </p>
        <p className="text-[12px] text-gray font-mono">
          Mientras tanto, podés ver la versión HTML estática del diseño en{" "}
          <code>dashboards/</code>.
        </p>
      </div>
    </div>
  );
}
