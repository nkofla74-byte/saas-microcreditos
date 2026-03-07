import React from "react";
import {
  X,
  FileDown,
  Printer,
  TrendingUp,
  Users,
  AlertCircle,
} from "lucide-react";

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeLoans: any[];
}

export default function ReportsModal({
  isOpen,
  onClose,
  routeLoans,
}: ReportsModalProps) {
  if (!isOpen) return null;

  // --- 📊 CÁLCULOS DEL INFORME ---
  // Nota: Más adelante conectaremos esto con la tabla real de pagos y gastos del día
  const clientesActivos = routeLoans.length;
  const dineroPrestado = routeLoans.reduce(
    (sum, loan) => sum + (Number(loan.principal_amount) || 0),
    0,
  );

  // Datos simulados (Mock) que reemplazaremos cuando hagamos el backend de pagos diarios
  const mockData = {
    clientesPorCobrar: clientesActivos,
    clientesPagaron: 0,
    clientesNoPagaron: clientesActivos,
    recaudadoHoy: 0,
    gastosHoy: 0,
  };

  const formatearDinero = (valor: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(valor);

  // --- 📥 FUNCIÓN PARA DESCARGAR EXCEL (CSV) ---
  const handleDownloadExcel = () => {
    const csvContent = [
      ["METRICA", "VALOR"],
      ["Fecha del Reporte", new Date().toLocaleDateString()],
      ["Clientes Activos", clientesActivos],
      ["Clientes por Cobrar Hoy", mockData.clientesPorCobrar],
      ["Clientes que Pagaron", mockData.clientesPagaron],
      ["Clientes que NO Pagaron", mockData.clientesNoPagaron],
      ["Dinero Prestado Total", dineroPrestado],
      ["Total Recaudado Hoy", mockData.recaudadoHoy],
      ["Total Gastos Hoy", mockData.gastosHoy],
    ]
      .map((e) => e.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Cierre_Ruta_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  // --- 🖨️ FUNCIÓN PARA PDF/IMPRIMIR ---
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex flex-col justify-end sm:justify-center sm:items-center print:bg-white print:fixed print:inset-0">
      <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-auto rounded-t-[40px] sm:rounded-[35px] shadow-2xl flex flex-col overflow-hidden print:h-auto print:shadow-none print:w-full print:rounded-none">
        {/* CABECERA */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
              <TrendingUp size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-800">
              Cierre de Ruta
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-50 rounded-full text-slate-400 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENIDO DEL INFORME */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 print:bg-white print:p-0">
          <div className="text-center print:block hidden mb-6">
            <h1 className="text-2xl font-black italic">JRX COBROS</h1>
            <p className="text-sm">
              Informe Diario - {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Recaudado Hoy
              </p>
              <p className="font-black text-xl text-green-600">
                {formatearDinero(mockData.recaudadoHoy)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Gastos Hoy
              </p>
              <p className="font-black text-xl text-red-500">
                {formatearDinero(mockData.gastosHoy)}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2">
              <Users size={16} className="text-blue-500" /> Resumen de Clientes
            </h3>

            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-sm font-medium text-slate-500">
                Activos en Ruta
              </span>
              <span className="font-black text-slate-700">
                {clientesActivos}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-sm font-medium text-slate-500">
                Por Cobrar Hoy
              </span>
              <span className="font-black text-blue-600">
                {mockData.clientesPorCobrar}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-sm font-medium text-slate-500">
                Realizaron Pago
              </span>
              <span className="font-black text-green-600">
                {mockData.clientesPagaron}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-500">
                No Pagaron
              </span>
              <span className="font-black text-red-500">
                {mockData.clientesNoPagaron}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-xs font-black text-slate-800 uppercase flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-orange-500" /> Capital en
              la Calle
            </h3>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-slate-500">
                Dinero Prestado Total
              </span>
              <span className="font-black text-slate-800">
                {formatearDinero(dineroPrestado)}
              </span>
            </div>
          </div>
        </div>

        {/* BOTONES DE EXPORTACIÓN */}
        <div className="p-6 bg-white border-t border-slate-100 grid grid-cols-2 gap-4 print:hidden">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center justify-center gap-2 bg-green-50 text-green-700 p-4 rounded-2xl font-black text-xs uppercase tracking-wider active:scale-95 transition-transform"
          >
            <FileDown size={18} /> Excel
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-transform"
          >
            <Printer size={18} /> PDF / Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}
