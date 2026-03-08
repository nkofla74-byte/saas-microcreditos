import React, { useState } from 'react';
import { X, Receipt, Save } from 'lucide-react';
import { useCobrosStore } from '@/store/useCobrosStore';
import { useApi } from '@/hooks/useApi';

interface GastosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GastosModal({ isOpen, onClose, onSuccess }: GastosModalProps) {
  const { isOnline, addOfflinePayment } = useCobrosStore();
  const { fetchWithAuth } = useApi();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    category: 'gasolina',
    amount: '',
    description: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const amountNum = Number(formData.amount);
    if (amountNum <= 0) {
      alert("El gasto debe ser mayor a 0");
      setIsSubmitting(false);
      return;
    }

    // Estructura universal de transacción (ahora adaptada para gastos)
    const transactionData = {
      sync_id: crypto.randomUUID(),
      type: 'expense',
      category: formData.category, // backend puede guardarlo en description por ahora o en una nueva columna
      description: `${formData.category.toUpperCase()} - ${formData.description}`,
      amount: amountNum,
      offline_timestamp: new Date().toISOString()
    };

    if (isOnline) {
      try {
        // Asumiendo que actualizaremos el backend para aceptar type="expense" en el sync
        await fetchWithAuth('/transactions/sync', {
          method: 'POST',
          body: JSON.stringify({ transactions: [transactionData] })
        });
        alert("✅ Gasto registrado correctamente");
        if (onSuccess) onSuccess();
        onClose();
        setFormData({ category: 'gasolina', amount: '', description: '' });
      } catch (error: any) {
        alert("Error guardando gasto: " + error.message);
      }
    } else {
      // Guardar localmente
      addOfflinePayment(transactionData as any);
      alert("🟡 Sin internet. Gasto guardado localmente para sincronizar luego.");
      if (onSuccess) onSuccess();
      onClose();
      setFormData({ category: 'gasolina', amount: '', description: '' });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center animate-in fade-in">
      <div className="bg-white w-full max-w-md h-[85vh] sm:h-auto rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-2xl text-orange-600">
              <Receipt size={24} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tighter">Registrar Gasto</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white rounded-2xl text-slate-400 border border-slate-100 shadow-sm active:scale-95">
            <X size={20}/>
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Categoría</label>
              <select 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-[20px] font-black text-sm outline-none text-slate-700"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                <option value="gasolina">⛽ Gasolina / Transporte</option>
                <option value="alimentacion">🍔 Alimentación</option>
                <option value="papeleria">📄 Papelería / Copias</option>
                <option value="imprevisto">⚠️ Imprevisto / Otros</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Valor ($)</label>
              <input 
                type="number" 
                required
                placeholder="Ej. 15000"
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[25px] font-black text-xl text-orange-600 outline-none focus:border-orange-300"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descripción Detallada</label>
              <textarea 
                required
                placeholder="Ej. Tanqueada moto placa ABC-123"
                className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[25px] font-bold text-sm outline-none h-32 resize-none focus:border-orange-300"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full p-5 bg-slate-900 text-white rounded-[25px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={18} /> {isSubmitting ? "Guardando..." : "Guardar Gasto"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}