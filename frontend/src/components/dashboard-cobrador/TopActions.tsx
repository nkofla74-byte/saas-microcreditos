import React from "react";
import { FileText, Map, Receipt, Calculator } from "lucide-react";

interface TopActionsProps {
  onAction: (action: "informes" | "enrutar" | "gastos" | "totalizar") => void;
}

export default function TopActions({ onAction }: TopActionsProps) {
  return (
    <section className="grid grid-cols-2 gap-3">
      <button
        onClick={() => onAction("informes")}
        className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 active:bg-slate-50 transition"
      >
        <FileText className="w-6 h-6 text-blue-600 mb-1" />
        <span className="text-xs font-semibold text-slate-700">Informes</span>
      </button>
      <button
        onClick={() => onAction("enrutar")}
        className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 active:bg-slate-50 transition"
      >
        <Map className="w-6 h-6 text-green-600 mb-1" />
        <span className="text-xs font-semibold text-slate-700">Enrutar</span>
      </button>
      <button
        onClick={() => onAction("gastos")}
        className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 active:bg-slate-50 transition"
      >
        <Receipt className="w-6 h-6 text-red-500 mb-1" />
        <span className="text-xs font-semibold text-slate-700">
          Gastos del día
        </span>
      </button>
      <button
        onClick={() => onAction("totalizar")}
        className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 active:bg-slate-50 transition"
      >
        <Calculator className="w-6 h-6 text-purple-600 mb-1" />
        <span className="text-xs font-semibold text-slate-700">Totalizar</span>
      </button>
    </section>
  );
}
