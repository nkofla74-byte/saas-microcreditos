import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OfflinePayment {
  sync_id: string;
  loan_id: string;
  amount: number;
  offline_timestamp: string;
}

interface CobrosState {
  offlineQueue: OfflinePayment[];
  isOnline: boolean;
  addOfflinePayment: (payment: OfflinePayment) => void;
  clearQueue: () => void;
  setIsOnline: (status: boolean) => void;
}

export const useCobrosStore = create<CobrosState>()(
  persist(
    (set) => ({
      offlineQueue: [],
      isOnline: true,
      
      // Añade un pago a la cola local
      addOfflinePayment: (payment) => set((state) => ({ 
        offlineQueue: [...state.offlineQueue, payment] 
      })),
      
      // Limpia la cola cuando ya se sincronizó con éxito
      clearQueue: () => set({ offlineQueue: [] }),
      
      // Actualiza si hay internet o no
      setIsOnline: (status) => set({ isOnline: status }),
    }),
    {
      name: 'jrx-cobros-offline-queue', // Nombre de la llave en el localStorage del navegador
      partialize: (state) => ({ offlineQueue: state.offlineQueue }), // Solo persistimos la cola, no el estado online/offline
    }
  )
);