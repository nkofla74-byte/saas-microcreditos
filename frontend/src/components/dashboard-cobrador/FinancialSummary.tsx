import React from "react";

interface FinancialProps {
  prestado: number;
  cobrado: number;
  falta: number;
  meta: number;
}

export default function FinancialSummary({
  prestado,
  cobrado,
  falta,
  meta,
}: FinancialProps) {
  const formatearDinero = (valor: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor || 0);
  };

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-4">
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
        Resumen Financiero
      </h2>

      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
        <span className="text-slate-600 font-medium">Dinero Prestado</span>
        <span className="font-black text-slate-800">
          {formatearDinero(prestado)}
        </span>
      </div>

      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
        <span className="text-slate-600 font-medium">Dinero Cobrado</span>
        <span className="font-black text-green-600">
          {formatearDinero(cobrado)}
        </span>
      </div>

      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
        <span className="text-slate-600 font-medium">Falta por Cobrar</span>
        <span className="font-black text-red-500">
          {formatearDinero(falta)}
        </span>
      </div>

      <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl mt-2 border border-blue-100">
        <span className="text-blue-800 font-black uppercase text-xs tracking-wider">
          Meta del Día
        </span>
        <span className="font-black text-blue-900 text-lg">
          {formatearDinero(meta)}
        </span>
      </div>
    </section>
  );
}
