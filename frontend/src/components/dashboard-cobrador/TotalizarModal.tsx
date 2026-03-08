import React, { useEffect, useState, useCallback } from 'react';
import { X, Calculator, DollarSign, ArrowDownRight, ArrowUpRight, PlusCircle, AlertTriangle } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useCobrosStore } from '@/store/useCobrosStore';

interface TotalizarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ✅ FIX 7: Fallback seguro para crypto.randomUUID en Android WebView antiguos
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};

// ✅ FIX 2 + 3: Utilidad para obtener fecha local como string 'YYYY-MM-DD'
// Evita el bug UTC donde new Date().toISOString() puede dar el día anterior en UTC-5
const getLocalDateString = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function TotalizarModal({ isOpen, onClose }: TotalizarModalProps) {
  const { fetchWithAuth } = useApi();
  const { isOnline, addOfflinePayment } = useCobrosStore();
  
  const [loading, setLoading] = useState(true);
  const [isAddingBase, setIsAddingBase] = useState(false); // ✅ FIX 5: Estado de carga para el botón
  const [metrics, setMetrics] = useState({
    base_fund: 0,
    payments: 0,
    disbursements: 0,
    expenses: 0
  });

  const [showAddBase, setShowAddBase] = useState(false);
  const [baseAmount, setBaseAmount] = useState('');

  // ✅ FIX 6: useCallback para estabilizar la referencia y evitar re-renders
  const loadDailyTransactions = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ FIX 3: Pasar fecha como query param para que el backend filtre
      // Evita descargar toda la historia de transacciones en producción
      const todayStr = getLocalDateString();
      const data = await fetchWithAuth(`/transactions?date=${todayStr}`);

      // ✅ FIX 2: Comparar fechas en hora local, no UTC
      // Protección extra en caso de que el backend no filtre correctamente
      const todayTxs = data.filter((tx: any) => {
        const txDate = new Date(tx.offline_timestamp);
        return getLocalDateString(txDate) === todayStr;
      });

      // ✅ FIX 1: 'base_fund' ahora es un tipo válido (requiere ALTER TABLE en SQL)
      const calc = todayTxs.reduce((acc: any, tx: any) => {
        const amount = Number(tx.amount);
        if (tx.type === 'base_fund')    acc.base_fund    += amount;
        if (tx.type === 'payment')      acc.payments     += amount;
        if (tx.type === 'disbursement') acc.disbursements += amount;
        if (tx.type === 'expense')      acc.expenses     += amount;
        return acc;
      }, { base_fund: 0, payments: 0, disbursements: 0, expenses: 0 });

      setMetrics(calc);
    } catch (error) {
      console.error("Error cargando cuadre:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // ✅ FIX 6: Dependencia correcta en useEffect
  useEffect(() => {
    if (isOpen) {
      loadDailyTransactions();
      setShowAddBase(false);
      setBaseAmount('');
    }
  }, [isOpen, loadDailyTransactions]);

  const handleAddBaseFund = async () => {
    const amount = Number(baseAmount);
    if (amount <= 0) return alert("Ingrese un valor válido");

    // ✅ FIX 7: Usando generateUUID con fallback
    const txData = {
      sync_id: generateUUID(),
      type: 'base_fund', // ✅ FIX 1: Tipo válido tras el ALTER TABLE
      amount: amount,
      description: 'Recarga / Saldo Base asignado',
      offline_timestamp: new Date().toISOString()
    };

    // ✅ FIX 5: Estado de carga para evitar doble submit
    setIsAddingBase(true);
    try {
      if (isOnline) {
        await fetchWithAuth('/transactions/sync', {
          method: 'POST',
          body: JSON.stringify({ transactions: [txData] })
        });
        alert("✅ Base registrada");
        await loadDailyTransactions(); // Recargar datos reales desde el servidor
      } else {
        addOfflinePayment(txData as any);
        alert("🟡 Base guardada localmente (Modo Offline)");
        // ✅ Actualización optimista de UI para modo offline
        setMetrics(prev => ({ ...prev, base_fund: prev.base_fund + amount }));
      }
      // ✅ FIX 5: Limpiar siempre al terminar (éxito o offline)
      setBaseAmount('');
      setShowAddBase(false);
    } catch (error: any) {
      alert("Error registrando base: " + error.message);
      // ✅ FIX 5: No limpiar en error para que el cobrador pueda reintentar
    } finally {
      setIsAddingBase(false); // ✅ FIX 5: Siempre liberar el estado de carga
    }
  };

  if (!isOpen) return null;

  // FÓRMULA DEL CIERRE DE CAJA — lógica original intacta
  const efectivoEnMano = (metrics.base_fund + metrics.payments) - (metrics.disbursements + metrics.expenses);

  // ✅ FIX 4: Detectar cierre negativo para mostrar advertencia
  const cierreNegativo = efectivoEnMano < 0;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center animate-in fade-in">
      <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto overflow-y-auto rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col">
        
        {/* HEADER — sin cambios visuales */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
              <Calculator size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tighter">Cierre de Caja</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white rounded-2xl text-slate-400 shadow-sm active:scale-95">
            <X size={20}/>
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {loading ? (
            <p className="text-center py-10 text-slate-400 font-bold">Calculando finanzas...</p>
          ) : (
            <>
              {/* BLOQUE 1: ENTRADAS — sin cambios visuales */}
              <div className="bg-green-50 rounded-3xl p-5 border border-green-100">
                <div className="flex justify-between items-center border-b border-green-200/50 pb-3 mb-3">
                  <h3 className="text-xs font-black text-green-800 uppercase tracking-widest flex items-center gap-1">
                    <ArrowDownRight size={14}/> Entradas (+)
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-green-700">Total Cobrado</span>
                    <span className="font-black text-lg text-green-700">${metrics.payments.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-green-700 flex items-center gap-2">
                      Base / Recargas
                      <button
                        onClick={() => setShowAddBase(!showAddBase)}
                        className="bg-green-200 text-green-800 p-1 rounded-lg active:scale-95"
                      >
                        <PlusCircle size={14}/>
                      </button>
                    </span>
                    <span className="font-black text-lg text-green-700">${metrics.base_fund.toLocaleString()}</span>
                  </div>
                  
                  {showAddBase && (
                    <div className="flex gap-2 mt-2 bg-white p-2 rounded-xl border border-green-100 animate-in slide-in-from-top-2">
                      <input
                        type="number"
                        placeholder="Monto..."
                        className="flex-1 bg-transparent outline-none font-bold text-sm px-2 text-slate-700"
                        value={baseAmount}
                        onChange={e => setBaseAmount(e.target.value)}
                        // ✅ Permitir Enter para confirmar rápido
                        onKeyDown={e => e.key === 'Enter' && handleAddBaseFund()}
                      />
                      {/* ✅ FIX 5: Botón deshabilitado mientras procesa */}
                      <button
                        onClick={handleAddBaseFund}
                        disabled={isAddingBase}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-black disabled:opacity-50"
                      >
                        {isAddingBase ? '...' : 'Añadir'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* BLOQUE 2: SALIDAS — sin cambios visuales */}
              <div className="bg-red-50 rounded-3xl p-5 border border-red-100">
                <div className="flex justify-between items-center border-b border-red-200/50 pb-3 mb-3">
                  <h3 className="text-xs font-black text-red-800 uppercase tracking-widest flex items-center gap-1">
                    <ArrowUpRight size={14}/> Salidas (-)
                  </h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-red-700">Créditos Entregados</span>
                    <span className="font-black text-lg text-red-700">${metrics.disbursements.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-red-700">Gastos del Día</span>
                    <span className="font-black text-lg text-red-700">${metrics.expenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* ✅ FIX 4: Advertencia visible si el cierre es negativo */}
              {cierreNegativo && (
                <div className="bg-red-100 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                  <AlertTriangle size={20} className="text-red-600 shrink-0" />
                  <p className="text-xs font-black text-red-700 uppercase tracking-wide">
                    ⚠️ Cierre negativo — Los desembolsos y gastos superan el efectivo disponible. Verifique con el administrador.
                  </p>
                </div>
              )}

              {/* BLOQUE 3: GRAN TOTAL — lógica y visual intactos */}
              <div className={`rounded-3xl p-6 shadow-xl mt-4 relative overflow-hidden ${cierreNegativo ? 'bg-red-900' : 'bg-slate-900'}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <DollarSign size={100} />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">
                  Efectivo en mano a entregar
                </p>
                <p className={`text-4xl font-black relative z-10 ${cierreNegativo ? 'text-red-300' : 'text-green-400'}`}>
                  ${efectivoEnMano.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}