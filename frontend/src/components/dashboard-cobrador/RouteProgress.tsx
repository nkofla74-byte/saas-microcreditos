import React from "react";

interface RouteProgressProps {
  cobrados: number;
  total: number;
}

export default function RouteProgress({ cobrados, total }: RouteProgressProps) {
  const porcentaje = total > 0 ? Math.round((cobrados / total) * 100) : 0;

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
      <div className="flex justify-between items-end mb-3">
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
          Progreso de Ruta
        </h2>
        <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">
          {cobrados} / {total} clientes
        </span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-5 overflow-hidden relative shadow-inner">
        <div
          className="bg-green-500 h-5 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
          style={{ width: `${porcentaje}%` }}
        >
          {porcentaje > 10 && (
            <span className="text-[10px] text-white font-black">
              {porcentaje}%
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
