'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { useSyncManager } from '@/hooks/useSyncManager';
import { supabase } from '@/lib/supabase';
import { 
  Plus, X, User, Search, MapPin, Camera, 
  CreditCard, CheckCircle2, AlertTriangle,
  ChevronRight, ChevronLeft, Navigation, MessageCircle, UserPlus,
  DollarSign, LayoutList, History, Wallet, PlusCircle, Image as ImageIcon,
  ListOrdered, WifiOff
} from 'lucide-react';

import BottomNavigation from '@/components/layout/BottomNavigation';
import TopActions from '@/components/dashboard-cobrador/TopActions';
import FinancialSummary from '@/components/dashboard-cobrador/FinancialSummary';
import RouteProgress from '@/components/dashboard-cobrador/RouteProgress';
import ReportsModal from '@/components/dashboard-cobrador/ReportsModal';
import RoutingModal from '@/components/dashboard-cobrador/RoutingModal';
import ClientCard from '@/components/dashboard-cobrador/ClientCard';
import GastosModal from '@/components/dashboard-cobrador/GastosModal';

export default function DashboardPage() {
  const { fetchWithAuth } = useApi();
  const { isOnline, offlineQueue } = useSyncManager();

  // 1. ESTADOS DE MODALES Y NAVEGACIÓN
  const [currentTab, setCurrentTab] = useState<'inicio' | 'listado' | 'cliente' | 'consultas'>('inicio');
  const [showReports, setShowReports] = useState(false);
  const [showRouting, setShowRouting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showGastos, setShowGastos] = useState(false);

  // 2. ESTADOS DE DATOS PRINCIPALES
  const [routeLoans, setRouteLoans] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);

  // 3. ESTADOS DEL FORMULARIO DE NUEVO CRÉDITO
  const [view, setView] = useState<'search' | 'form'>('search'); 
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPriorityList, setShowPriorityList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    id: null as string | null,
    document: '', name: '', whatsapp: '', phone: '',
    recommender: '', address: '', business_description: '',
    latitude: null as number | null, longitude: null as number | null,
    photo_url: '', document_front_url: '', document_back_url: '',
    priority: '', 
    start_date: new Date().toISOString().split('T')[0], end_date: '',
    payment_frequency: 'daily', principal_amount: '', interest_rate: '20',
    quota_amount: '', total_quotas: '', status: 'good'
  });

  // --- MÉTODOS DE CARGA ---
  const loadRoute = async () => {
    setLoading(true);
    try {
      const data = await fetchWithAuth('/loans');
      setRouteLoans(data.filter((l: any) => l.status === 'active')); 
    } catch (error) { console.error("Error cargando ruta:", error); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadRoute(); }, []);

  // --- RECONEXIÓN DE BOTONES SUPERIORES ---
  const handleTopAction = (action: string) => {
    if (action === 'informes') setShowReports(true);
    else if (action === 'enrutar') setShowRouting(true);
    else alert(`Módulo de ${action} en construcción`);
  };

  const handleUpdatePriority = async (clientId: string, newPriority: number) => {
    try {
      await fetchWithAuth(`/clients/${clientId}`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: newPriority })
      });
      await loadRoute(); 
    } catch (error: any) { alert("Error actualizando prioridad: " + error.message); }
  };

  const openCreditModal = () => {
    setShowModal(true);
    setView('search');
    setSearchQuery('');
  };

  const handleRenewLoan = (clientData: any) => {
    if (clientData.status === 'bad') return alert("⚠️ CLIENTE CLAVO. No se puede renovar.");
    setFormData({ ...formData, ...clientData, id: clientData.id, principal_amount: '', quota_amount: '', total_quotas: '' });
    setView('form'); setStep(3); setShowModal(true);
  };

  // --- LÓGICA DEL FORMULARIO DE CRÉDITO ---
  useEffect(() => {
    const principal = Number(formData.principal_amount) || 0;
    const interest = Number(formData.interest_rate) || 0;
    const quotas = Number(formData.total_quotas) || 0;
    let calculatedQuota = formData.quota_amount;
    let calculatedEndDate = formData.end_date;

    if (principal > 0 && quotas > 0) {
      const totalInterestAmount = principal * (interest / 100);
      const totalToPay = principal + totalInterestAmount;
      calculatedQuota = Math.ceil(totalToPay / quotas).toString(); 
    } else {
      calculatedQuota = '';
    }

    if (formData.start_date && quotas > 0) {
      const date = new Date(formData.start_date);
      if (formData.payment_frequency === 'daily') date.setDate(date.getDate() + quotas);
      else if (formData.payment_frequency === 'weekly') date.setDate(date.getDate() + (quotas * 7));
      else if (formData.payment_frequency === 'monthly') date.setMonth(date.getMonth() + quotas);
      calculatedEndDate = date.toISOString().split('T')[0];
    } else {
      calculatedEndDate = '';
    }

    if (calculatedQuota !== formData.quota_amount || calculatedEndDate !== formData.end_date) {
      setFormData(prev => ({ ...prev, quota_amount: calculatedQuota, end_date: calculatedEndDate }));
    }
  }, [formData.principal_amount, formData.interest_rate, formData.total_quotas, formData.payment_frequency, formData.start_date]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const results = await fetchWithAuth(`/clients/search?query=${searchQuery}`);
          setSearchResults(results);
        } catch (e) { setSearchResults([]); }
        finally { setIsSearching(false); }
      } else { setSearchResults([]); }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const freq = e.target.value;
    let autoQuotas = formData.total_quotas;
    if (freq === 'daily') autoQuotas = '24';
    if (freq === 'weekly') autoQuotas = '4';
    if (freq === 'monthly') autoQuotas = '1';
    setFormData({ ...formData, payment_frequency: freq, total_quotas: autoQuotas });
  };

  const handleSelectExisting = (client: any) => {
    if (client.status === 'bad') return alert("⚠️ ATENCIÓN: CLAVO. No se puede realizar el crédito.");
    setFormData({ ...formData, ...client, principal_amount: '', quota_amount: '', total_quotas: '' });
    setView('form'); setStep(3); 
  };

  const handleStartNewRegistration = () => {
    const isNumeric = /^\d+$/.test(searchQuery);
    setFormData({ ...formData, id: null, document: isNumeric ? searchQuery : '', name: !isNumeric ? searchQuery : '', status: 'good' });
    setView('form'); setStep(1);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("GPS no soportado");
    navigator.geolocation.getCurrentPosition((pos) => {
      setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
      alert("📍 Ubicación capturada");
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      await supabase.storage.from('evidencias').upload(fileName, file);
      const { data } = supabase.storage.from('evidencias').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, [field]: data.publicUrl }));
    } catch (error) { alert("Error subiendo imagen"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let currentClientId = formData.id;
      const priorityToSave = Number(formData.priority) || routeLoans.length + 1;

      if (!currentClientId) {
        const client = await fetchWithAuth('/clients', { 
          method: 'POST', 
          body: JSON.stringify({
            document: formData.document, name: formData.name, whatsapp: formData.whatsapp, phone: formData.phone,
            recommender: formData.recommender, address: formData.address, business_description: formData.business_description,
            latitude: formData.latitude, longitude: formData.longitude, photo_url: formData.photo_url,
            document_front_url: formData.document_front_url, document_back_url: formData.document_back_url,
            priority: priorityToSave 
          }) 
        });
        currentClientId = client.id;
      } else {
        await fetchWithAuth(`/clients/${currentClientId}`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: priorityToSave })
        });
      }

      await fetchWithAuth('/loans', {
        method: 'POST',
        body: JSON.stringify({
          client_id: currentClientId, 
          principal_amount: Number(formData.principal_amount),
          total_quotas: Number(formData.total_quotas), 
          interest_rate: Number(formData.interest_rate),
          payment_frequency: formData.payment_frequency, 
          start_date: formData.start_date
        })
      });

      alert("🚀 ¡Crédito activado y en ruta!");
      setShowModal(false);
      loadRoute();
      setCurrentTab('listado');
    } catch (error: any) { alert("Error: " + error.message); }
    finally { setIsSubmitting(false); }
  };

  // --- CÁLCULOS DE UI ---
  const dashboardMetrics = routeLoans.reduce((acc, loan) => {
    acc.prestado += Number(loan.principal_amount) || 0;
    acc.cobrado += (Number(loan.total_amount) || 0) - (Number(loan.balance) || 0);
    acc.falta += Number(loan.balance) || 0;
    acc.meta += Number(loan.quota_amount) || 0;
    return acc;
  }, { prestado: 0, cobrado: 0, falta: 0, meta: 0 });

  const sortedRouteLoans = [...routeLoans].sort((a, b) => {
    return (a.clients?.priority || 0) - (b.clients?.priority || 0);
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-white p-6 shadow-sm flex justify-between items-center sticky top-0 z-20 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tighter italic">JRX COBROS</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Sede Mosquera 
            {!isOnline && <span className="text-orange-500 flex items-center gap-1"><WifiOff size={10} /> Offline</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {offlineQueue.length > 0 && (
            <div className="flex items-center justify-center bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">
              {offlineQueue.length} ptns
            </div>
          )}
          <button onClick={loadRoute} className="p-3 text-blue-600 bg-blue-50 rounded-2xl active:bg-blue-100">
            <LayoutList size={22} />
          </button>
        </div>
      </header>

      {/* PESTAÑA: INICIO */}
      {currentTab === 'inicio' && (
        <main className="p-4 space-y-6 animate-in fade-in duration-300">
          <TopActions onAction={handleTopAction} />
          <FinancialSummary 
            prestado={dashboardMetrics.prestado}
            cobrado={dashboardMetrics.cobrado}
            falta={dashboardMetrics.falta}
            meta={dashboardMetrics.meta}
          />
          <RouteProgress cobrados={0} total={routeLoans.length} />
        </main>
      )}

      {/* PESTAÑA: LISTADO */}
      {currentTab === 'listado' && (
        <main className="p-4 space-y-4 animate-in slide-in-from-right duration-300">
          {loading ? (
             <p className="text-center py-10 opacity-50 font-bold">Cargando ruta...</p>
          ) : routeLoans.length === 0 ? (
            <p className="text-center py-20 text-slate-400 font-bold">No hay créditos activos en la ruta.</p>
          ) : (
            sortedRouteLoans.map((loan: any, index: number) => (
              <ClientCard 
                key={loan.id} 
                loan={loan} 
                index={index} 
                onPaymentSuccess={loadRoute}
                onRenewLoan={handleRenewLoan} 
              />
            ))
          )}
        </main>
      )}

      {(currentTab === 'cliente' || currentTab === 'consultas') && (
        <div className="p-10 text-center text-slate-400 font-bold mt-20 animate-in fade-in">
          <MapPin size={48} className="mx-auto mb-4 opacity-50" />
          <p>Módulo de {currentTab} en construcción</p>
        </div>
      )}

      {/* MENÚ INFERIOR */}
      <BottomNavigation 
        activeTab={currentTab} 
        setActiveTab={(tab: string) => setCurrentTab(tab as any)}
        onOpenCredit={openCreditModal} 
      />

      {/* MODAL: NUEVO CRÉDITO / RENOVACIÓN */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg h-[92vh] sm:h-auto overflow-y-auto rounded-t-[50px] sm:rounded-[45px] shadow-2xl border-t border-white/20">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center sticky top-0 bg-white/90 z-10">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter">{view === 'search' ? "Identificar Cliente" : `Paso ${step} de 3`}</h2>
              <button onClick={() => setShowModal(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-400"><X size={20}/></button>
            </div>

            <div className="p-8 pb-14">
              {view === 'search' && (
                <div className="space-y-6">
                  <div className="relative group">
                    <Search className="absolute left-5 top-6 text-slate-400" size={20} />
                    <input autoFocus placeholder="Nombre o Cédula..." className="w-full pl-14 pr-6 py-6 bg-slate-50 rounded-[30px] outline-none font-bold text-lg" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                  <div className="space-y-3">
                    {searchResults.map(res => (
                        <div key={res.id} onClick={() => handleSelectExisting(res)} className={`p-6 rounded-[35px] border-2 flex items-center justify-between cursor-pointer ${res.status === 'bad' ? 'bg-red-50 border-red-100' : 'bg-white border-slate-50'}`}>
                          <div className="flex items-center gap-5">
                            <div className={`p-4 rounded-2xl ${res.status === 'bad' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}><User size={24}/></div>
                            <div><p className="font-black text-slate-800 text-lg">{res.name}</p></div>
                          </div>
                          <ChevronRight size={20} className="text-slate-300" />
                        </div>
                    ))}
                    {searchQuery.length > 2 && !isSearching && (
                      <button onClick={handleStartNewRegistration} className="w-full p-7 mt-4 bg-blue-600 text-white rounded-[35px] flex items-center justify-center gap-3 font-black text-xs uppercase"><UserPlus size={20} /> Nuevo Cliente</button>
                    )}
                  </div>
                </div>
              )}

              {view === 'form' && (
                <form onSubmit={handleSubmit} className="space-y-6">
                   {step === 1 && (
                     <div className="space-y-4">
                        <input required placeholder="Cédula" className="w-full p-5 bg-slate-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-blue-500" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} />
                        <input required placeholder="Nombre Completo" className="w-full p-5 bg-slate-50 rounded-[25px] font-bold outline-none border-2 border-transparent focus:border-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input placeholder="WhatsApp" className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-sm outline-none" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                            <input placeholder="Teléfono" className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-sm outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <input placeholder="Dirección de residencia/negocio" className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-sm outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        <input placeholder="Referido por..." className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-sm outline-none" value={formData.recommender} onChange={e => setFormData({...formData, recommender: e.target.value})} />
                        <textarea placeholder="Descripción del negocio..." className="w-full p-5 bg-slate-50 rounded-[25px] font-bold text-sm h-28 outline-none" value={formData.business_description} onChange={e => setFormData({...formData, business_description: e.target.value})} />
                     </div>
                   )}

                   {step === 2 && (
                     <div className="space-y-6">
                        <button type="button" onClick={handleGetLocation} className={`w-full py-10 rounded-[35px] flex flex-col items-center gap-3 transition-all ${formData.latitude ? 'bg-green-600 text-white' : 'bg-slate-900 text-white'}`}>
                           <MapPin size={32} />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">{formData.latitude ? "GPS Capturado ✅" : "Punto de Cobro GPS"}</span>
                        </button>
                        <div className="grid grid-cols-3 gap-3">
                           <label className="border-2 border-slate-100 rounded-[25px] p-6 flex flex-col items-center bg-slate-50 cursor-pointer text-center relative">
                              <Camera size={24} className={formData.photo_url ? "text-green-500" : "text-slate-300"} />
                              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileUpload(e, 'photo_url')} />
                              <span className="text-[8px] font-black uppercase mt-2 text-slate-400">Fachada</span>
                           </label>
                           <label className="border-2 border-slate-100 rounded-[25px] p-6 flex flex-col items-center bg-slate-50 cursor-pointer text-center relative">
                              <CreditCard size={24} className={formData.document_front_url ? "text-green-500" : "text-slate-300"} />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'document_front_url')} />
                              <span className="text-[8px] font-black uppercase mt-2 text-slate-400">CC Frontal</span>
                           </label>
                           <label className="border-2 border-slate-100 rounded-[25px] p-6 flex flex-col items-center bg-slate-50 cursor-pointer text-center relative">
                              <ImageIcon size={24} className={formData.document_back_url ? "text-green-500" : "text-slate-300"} />
                              <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'document_back_url')} />
                              <span className="text-[8px] font-black uppercase mt-2 text-slate-400">CC Atrás</span>
                           </label>
                        </div>
                     </div>
                   )}

                   {step === 3 && (
                     <div className="space-y-5 animate-in slide-in-from-right duration-500">
                        <div className="bg-blue-50 p-4 rounded-[25px] flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <div>
                                  <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest block mb-1">Ruta Asignada</label>
                                  <input type="text" readOnly className="bg-transparent font-black text-blue-600 outline-none uppercase text-sm" value="Configurado por Admin" />
                              </div>
                              <div className="text-right border-l border-blue-200 pl-4">
                                  <div className="flex items-center justify-end gap-2 mb-1">
                                    <label className="text-[10px] font-black text-blue-800 uppercase tracking-widest block">Prioridad</label>
                                    <button type="button" onClick={() => setShowPriorityList(!showPriorityList)} className="bg-blue-200 text-blue-800 p-1.5 rounded-lg active:scale-95 transition-transform">
                                      <ListOrdered size={14} />
                                    </button>
                                  </div>
                                  <input type="number" placeholder="N°" className="w-20 p-3 bg-white rounded-xl font-black text-center text-blue-900 outline-none" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} />
                              </div>
                            </div>
                            {showPriorityList && (
                              <div className="bg-white rounded-[15px] p-3 max-h-32 overflow-y-auto shadow-inner border border-blue-100 animate-in slide-in-from-top-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase text-center mb-2">Orden Actual en la Ruta</p>
                                {sortedRouteLoans.map(l => (
                                  <div key={l.id} className="flex justify-between items-center border-b border-slate-50 py-1.5 px-2">
                                    <span className="font-black text-blue-600 text-xs">#{l.clients?.priority || '?'}</span>
                                    <span className="font-bold text-slate-600 text-xs truncate ml-3">{l.clients?.name}</span>
                                  </div>
                                ))}
                                {routeLoans.length === 0 && <p className="text-center text-xs text-slate-400">No hay clientes en ruta.</p>}
                              </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Frecuencia</label>
                              <select className="w-full p-4 bg-slate-50 rounded-[20px] font-black text-xs uppercase outline-none" value={formData.payment_frequency} onChange={handleFrequencyChange}>
                                  <option value="daily">Diario</option><option value="weekly">Semanal</option><option value="monthly">Mensual</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">N° de Cuotas</label>
                              <input type="number" placeholder="Ej: 24" className="w-full p-4 bg-slate-50 rounded-[20px] font-black text-lg outline-none" value={formData.total_quotas} onChange={e => setFormData({...formData, total_quotas: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Capital ($)</label>
                              <input type="number" placeholder="0" className="w-full p-4 bg-slate-50 rounded-[20px] font-black text-blue-600 text-lg outline-none" value={formData.principal_amount} onChange={e => setFormData({...formData, principal_amount: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Interés (%)</label>
                              <div className="relative">
                                <input type="number" placeholder="20" className="w-full p-4 bg-slate-50 rounded-[20px] font-black text-lg outline-none" value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: e.target.value})} />
                                <span className="absolute right-4 top-4 font-black text-slate-400">%</span>
                              </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Inicio Cobro</label>
                              <input type="date" className="w-full p-4 bg-slate-50 rounded-[20px] font-bold text-xs outline-none text-slate-600" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 ml-2 uppercase">Fin Estimado</label>
                              <input type="date" readOnly className="w-full p-4 bg-slate-100 rounded-[20px] font-bold text-xs outline-none text-slate-400 cursor-not-allowed" value={formData.end_date} />
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 ml-2 uppercase flex items-center gap-1">Valor Cuota <span className="bg-blue-100 text-blue-600 text-[8px] px-2 py-0.5 rounded-full">Calculado</span></label>
                            <input type="number" placeholder="Calculando..." className="w-full p-5 bg-slate-900 rounded-[25px] font-black text-green-400 text-2xl outline-none" value={formData.quota_amount} onChange={e => setFormData({...formData, quota_amount: e.target.value})} />
                        </div>
                     </div>
                   )}
                   
                   <div className="flex gap-4 pt-4">
                      {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="flex-1 p-5 bg-slate-100 rounded-[25px] text-slate-400 active:scale-95"><ChevronLeft size={24}/></button>}
                      <button type={step === 3 ? "submit" : "button"} onClick={() => step < 3 && setStep(step + 1)} className="flex-[4] p-5 bg-blue-600 text-white rounded-[25px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                        {step === 3 ? (isSubmitting ? "Guardando..." : "Confirmar Crédito") : "Siguiente"}
                      </button>
                   </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALES EXTERNOS RECONECTADOS */}
      <ReportsModal isOpen={showReports} onClose={() => setShowReports(false)} routeLoans={routeLoans} />
      <RoutingModal isOpen={showRouting} onClose={() => setShowRouting(false)} routeLoans={routeLoans} onUpdatePriority={handleUpdatePriority} />

    </div>
  );
}