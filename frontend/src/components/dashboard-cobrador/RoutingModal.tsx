import React, { useState, useEffect } from 'react';
import { X, Save, Map, CheckCircle2 } from 'lucide-react';

interface RoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  routeLoans: any[];
  onUpdatePriority: (clientId: string, newPriority: number) => Promise<void>;
}

export default function RoutingModal({ isOpen, onClose, routeLoans, onUpdatePriority }: RoutingModalProps) {
  const [localPriorities, setLocalPriorities] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    const initialPrios: Record<string, number> = {};
    routeLoans.forEach((loan, index) => {
      const client = loan.clients || {};
      // Extraemos la prioridad desde el CLIENTE
      initialPrios[client.id] = client.priority || index + 1;
    });
    setLocalPriorities(initialPrios);
  }, [routeLoans, isOpen]);

  if (!isOpen) return null;

  const handlePriorityChange = (clientId: string, val: string) => {
    setLocalPriorities(prev => ({ ...prev, [clientId]: Number(val) }));
  };

  const handleSave = async (clientId: string) => {
    setIsSaving(clientId);
    await onUpdatePriority(clientId, localPriorities[clientId]);
    setIsSaving(null);
  };

  // Ordenar visualmente según la prioridad del cliente
  const sortedLoans = [...routeLoans].sort((a, b) => {
    const prioA = localPriorities[a.clients?.id] || 0;
    const prioB = localPriorities[b.clients?.id] || 0;
    return prioA - prioB;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center">
      <div className="bg-slate-50 w-full sm:max-w-md h-[90vh] sm:h-[80vh] rounded-t-[40px] sm:rounded-[35px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
        
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-xl text-green-600"><Map size={24} /></div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Enrutar Clientes</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 rounded-full text-slate-400 active:scale-95"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[10px] font-black text-slate-400 text-center mb-4 uppercase tracking-widest">Orden de Visita Actual</p>
          
          {sortedLoans.map((loan, index) => {
            const client = loan.clients || {};
            const currentPrio = client.priority || index + 1;
            const localPrio = localPriorities[client.id] !== undefined ? localPriorities[client.id] : currentPrio;
            const isChanged = localPrio !== currentPrio;

            return (
              <div key={loan.id} className="bg-white p-4 rounded-[25px] shadow-sm border border-slate-100 flex items-center gap-4 transition-all">
                
                <div className={`text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black shadow-md shrink-0 transition-colors ${isChanged ? 'bg-orange-500' : 'bg-slate-900'}`}>
                  {localPrio}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-sm uppercase truncate">{client.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 truncate">{client.address || 'Sin dirección'}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                  <input 
                    type="number" 
                    className="w-12 p-2 text-center bg-white rounded-xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                    value={localPrio}
                    onChange={(e) => handlePriorityChange(client.id, e.target.value)}
                  />
                  {isChanged ? (
                    <button 
                      onClick={() => handleSave(client.id)}
                      disabled={isSaving === client.id}
                      className="bg-green-600 text-white p-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50"
                    >
                      {isSaving === client.id ? '...' : <Save size={16} />}
                    </button>
                  ) : (
                    <div className="p-2 text-green-500"><CheckCircle2 size={16} /></div>
                  )}
                </div>
              </div>
            );
          })}
          
          {routeLoans.length === 0 && <div className="text-center py-10 text-slate-400 font-bold">No hay clientes en ruta</div>}
        </div>
      </div>
    </div>
  );
}