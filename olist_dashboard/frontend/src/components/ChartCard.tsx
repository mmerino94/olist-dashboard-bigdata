import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  className?: string;
};

export default function ChartCard({
  title,
  subtitle,
  children,
  height = 320,
  className = "",
}: Props) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-100 p-5 ${className}`}
    >
      <h3 className="text-base font-bold text-grisTexto">{title}</h3>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-0.5 mb-3">{subtitle}</p>
      )}
      <div style={{ width: "100%", height }}>{children}</div>
    </div>
  );
}

export function PageTitle({
  problema,
  titulo,
  intro,
}: {
  problema?: string;
  titulo: string;
  intro?: string;
}) {
  return (
    <header className="mb-6">
      {problema && (
        <div className="text-xs uppercase tracking-wider text-acento font-bold">
          {problema}
        </div>
      )}
      <h1 className="text-2xl font-bold text-grisTexto">{titulo}</h1>
      {intro && (
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">{intro}</p>
      )}
    </header>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400">
      Cargando…
    </div>
  );
}

export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      Error: {msg}
    </div>
  );
}
