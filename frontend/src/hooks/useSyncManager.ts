import { useEffect } from 'react';
import { useCobrosStore } from '../store/useCobrosStore';
import { useApi } from './useApi';

export const useSyncManager = () => {
  const { isOnline, setIsOnline, offlineQueue, clearQueue } = useCobrosStore();
  const { fetchWithAuth } = useApi();

  useEffect(() => {
    // Detectar si el navegador tiene conexión
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Configurar estado inicial
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  // Si recuperamos conexión y hay pagos en cola, sincronizamos automáticamente
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncData();
    }
  }, [isOnline, offlineQueue.length]);

  const syncData = async () => {
    try {
      console.log('Sincronizando pagos atrasados...', offlineQueue);
      // Aquí llamamos al endpoint "bulk" del backend (que diseñamos en la Fase 3)
      await fetchWithAuth('/transactions/sync', {
        method: 'POST',
        body: JSON.stringify({ transactions: offlineQueue })
      });
      
      clearQueue(); // Si el backend responde OK, borramos el localStorage
      alert('✅ Sincronización exitosa: Pagos guardados en la nube.');
    } catch (error) {
      console.error('Falló la sincronización:', error);
    }
  };

  return { isOnline, offlineQueue, syncData };
};