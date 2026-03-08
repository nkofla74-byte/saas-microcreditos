import React, { useState } from 'react';
import { DollarSign, Wallet, MessageCircle, Navigation, History, PlusCircle } from 'lucide-react';
import { useCobrosStore } from '@/store/useCobrosStore';
import { useApi } from '@/hooks/useApi';

interface ClientCardProps {
  loan: any;
  index: number;
  onPaymentSuccess: () => void;
  onRenewLoan: (client: any) => void;
}

export default function ClientCard({ loan, index, onPaymentSuccess, onRenewLoan }: ClientCardProps) {
  const client = loan.clients || {};
  const [inputValue, setInputValue] = useState<number | string>(loan.quota_amount);
  const [isPaying, setIsPaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const { isOnline, addOfflinePayment } = useCobrosStore();
  const { fetchWithAuth } = useApi();

  const quotasPending = Math.ceil(loan.balance / loan.quota_amount);
  const quotasPaid = loan.total_quotas - quotasPending;

  const handlePayment = async () => {
    const amountToPay = Number(inputValue);
    if (amountToPay <= 0) return alert("El abono debe ser mayor a $0");
    
    setIsPaying(true);
    const paymentData = {
      sync_id: crypto.randomUUID(),
      loan_id: loan.id,
      amount: amountToPay,
      offline_timestamp: new Date().toISOString()
    };

    if (isOnline) {
      // Flujo con Internet
      try {
        await fetchWithAuth('/transactions/sync', { 
          method: 'POST', 
          body: JSON.stringify({ transactions: [paymentData] }) 
        });
        alert(`✅ Pago de $${amountToPay.toLocaleString()} registrado.`);
        setInputValue('');
        onPaymentSuccess(); // Recarga la lista
      } catch (error: any) {
        alert("Error: " + error.message);
      }
    } else {
      // Flujo SIN Internet
      addOfflinePayment(paymentData);
      alert('🟡 Sin conexión. Pago guardado localmente.');
      setInputValue('');
      onPaymentSuccess(); // Podríamos simular la actualización del saldo localmente si quisiéramos
    }
    setIsPaying(false);
  };

  const enviarWhatsApp = () => {
    const saldoRestante = loan.balance - (isOnline ? 0 : 0); // Idealmente calculado con el abono recién hecho
    const mensaje = `Hola ${client.name}, su pago ha sido procesado. Su saldo restante es de $${saldoRestante.toLocaleString()}. Gracias por su puntualidad.`;
    window.open(`https://wa.me/${client.whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className="bg-white p-5 rounded-[35px] shadow-sm border border-slate-100 flex flex-col gap-5">
      {/* Cabecera del Cliente */}
      <div className="flex items-center gap-4">
        <div className="bg-slate-900 text-white w-12 h-12 rounded-[20px] flex items-center justify-center font-black text-lg shadow-lg">
          {client.priority || index + 1}
        </div>
        <div className="flex-1">
          <p className="font-black text-slate-800 text-base uppercase tracking-tight">{client.name}</p>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Saldo: <span className="text-red-500">${loan.balance?.toLocaleString()}</span></p>
        </div>
      </div>

      {/* Resumen de Cuotas */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-4 rounded-[24px] border border-slate-100">
        <div className="text-center"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cuota</p><p className="font-black text-blue-600">${loan.quota_amount?.toLocaleString()}</p></div>
        <div className="text-center border-l border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Pagadas</p><p className="font-black text-green-600">{quotasPaid}</p></div>
        <div className="text-center border-l border-slate-200"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Faltan</p><p className="font-black text-red-500">{quotasPending}</p></div>
      </div>

      {/* Botones de Acción (WhatsApp, GPS, Renovar) */}
      <div className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <button onClick={enviarWhatsApp} className="bg-green-50 text-green-600 p-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase"><MessageCircle size={16}/></button>
          {client.latitude && <a href={`http://googleusercontent.com/maps.google.com/?q=${client.latitude},${client.longitude}`} target="_blank" className="bg-blue-50 text-blue-600 p-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase"><Navigation size={16}/></a>}
        </div>
        <button onClick={() => onRenewLoan(client)} className="bg-slate-100 text-slate-600 p-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase"><PlusCircle size={16}/> Renovar</button>
      </div>

      {/* Input de Pago */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-white p-3 rounded-[28px] border-2 border-blue-100">
        <div className="flex-1 flex items-center gap-2 pl-3">
          <DollarSign size={18} className="text-blue-400" />
          <input 
            type="number" 
            className="bg-transparent font-black text-xl text-blue-900 outline-none w-full" 
            value={inputValue === 0 ? '' : inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
          />
        </div>
        <button disabled={isPaying} onClick={handlePayment} className="bg-blue-600 text-white px-6 py-4 rounded-[22px] font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 shadow-lg disabled:opacity-50">
          <Wallet size={16} /> {isPaying ? '...' : 'Abonar'}
        </button>
      </div>
    </div>
  );
}