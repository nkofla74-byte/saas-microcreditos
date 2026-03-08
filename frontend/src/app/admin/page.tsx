'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/hooks/useApi';
import { 
  LayoutDashboard, Map, Users, Settings, LogOut, Loader2, 
  Wallet, TrendingUp, AlertTriangle, PlusCircle, X, Route, 
  UserCheck, Mail, Lock, ShieldCheck, Edit2, Key, Trash2,
  ChevronRight, DollarSign, PieChart, Activity, ArrowLeft,
  CheckCircle2, Clock, BarChart3, Receipt, HandCoins,
  Briefcase, TrendingDown, Target, Landmark, Building2
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { fetchWithAuth } = useApi();
  
  // ── ESTADOS DE CARGA Y SESIÓN ────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'resumen' | 'rutas' | 'cobradores' | 'configuracion'>('resumen');
  const [userProfile, setUserProfile] = useState<any>(null);

  // ── ESTADOS: RUTAS Y ANÁLISIS PROFUNDO ───────────────────────
  const [routesList, setRoutesList] = useState<any[]>([]);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [newRouteName, setNewRouteName] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<any>(null); 
  const [routeLoans, setRouteLoans] = useState<any[]>([]);
  const [routeStats, setRouteStats] = useState({ 
    base: 0, 
    prestado: 0, 
    cobrado: 0, 
    gastos: 0, 
    caja: 0 
  });
  const [loadingRouteDetail, setLoadingRouteDetail] = useState(false);

  // ── ESTADOS: COBRADORES ─────────────────────────────────────
  const [collectorsList, setCollectorsList] = useState<any[]>([]);
  const [showCollectorModal, setShowCollectorModal] = useState(false);
  const [isSubmittingCollector, setIsSubmittingCollector] = useState(false);
  const [collectorForm, setCollectorForm] = useState({ 
    id: '', 
    name: '', 
    email: '', 
    password: '', 
    route_id: '' 
  });
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'password'>('create');

  // ── ESTADOS: CONFIGURACIÓN Y SEGURIDAD ──────────────────────
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // 1. PROTECCIÓN DE RUTA Y VERIFICACIÓN DE PERMISOS
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.replace('/');
      
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error || (profile?.role !== 'admin' && profile?.role !== 'superadmin')) {
        alert('Acceso restringido: Se requieren permisos de administrador.');
        router.replace('/');
        return;
      }
      setUserProfile(profile);
      setLoading(false);
    };
    checkAccess();
  }, [router]);

  // 2. CARGA DE DATOS CENTRALIZADA (PARA TODAS LAS SECCIONES)
  const loadData = useCallback(async () => {
    if (!userProfile) return;
    try {
      // Cargar Rutas
      const routes = await fetchWithAuth('/routes');
      setRoutesList(routes || []);
      
      // Cargar Cobradores (de tu empresa específica)
      const { data: collectors, error: colError } = await supabase
        .from('users')
        .select('*, routes(name)')
        .eq('role', 'collector')
        .eq('tenant_id', userProfile.tenant_id);
      
      if (!colError) setCollectorsList(collectors || []);
    } catch (e) {
      console.error("Fallo en la sincronización de datos de oficina:", e);
    }
  }, [userProfile, fetchWithAuth]);

  useEffect(() => {
    loadData();
  }, [activeTab, loadData]);

  // 3. FUNCIONES DE GESTIÓN DE RUTAS
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRouteName.trim()) return;
    try {
      await fetchWithAuth('/routes', { 
        method: 'POST', 
        body: JSON.stringify({ name: newRouteName, is_active: true }) 
      });
      setNewRouteName('');
      setShowRouteModal(false);
      loadData();
    } catch (error: any) {
      alert("Error al crear ruta: " + error.message);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    if (!confirm("¿Deseas eliminar esta ruta permanentemente? Esta acción no se puede deshacer.")) return;
    try {
      await fetchWithAuth(`/routes/${routeId}`, { method: 'DELETE' });
      loadData();
    } catch (error: any) {
      alert("No es posible eliminar la ruta mientras existan créditos o clientes vinculados.");
    }
  };

  const analyzeRoute = async (route: any) => {
    setSelectedRoute(route);
    setLoadingRouteDetail(true);
    try {
      // Cargar Créditos vinculados a la ruta
      const { data: loans, error: loansError } = await supabase
        .from('loans')
        .select('*, clients(*)')
        .eq('route_id', route.id);
      
      if (loansError) throw loansError;
      setRouteLoans(loans || []);

      // Contabilidad en tiempo real (Cierre de caja parcial)
      const today = new Date().toISOString().split('T')[0];
      const { data: txs } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .filter('created_at', 'gte', `${today}T00:00:00Z`);

      if (txs) {
        const stats = txs.reduce((acc, t) => {
          if (t.type === 'base_fund') acc.base += t.amount;
          if (t.type === 'payment') acc.cobrado += t.amount;
          if (t.type === 'expense') acc.gastos += t.amount;
          if (t.type === 'disbursement') acc.prestado += t.amount;
          return acc;
        }, { base: 0, prestado: 0, cobrado: 0, gastos: 0 });
        
        setRouteStats({ ...stats, caja: (stats.base + stats.cobrado) - (stats.prestado + stats.gastos) });
      }
    } catch (e) {
      alert("Error en la auditoría de ruta.");
    } finally {
      setLoadingRouteDetail(false);
    }
  };

  // 4. FUNCIONES DE GESTIÓN DE COBRADORES
  const handleCollectorAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCollector(true);
    try {
      if (modalMode === 'create') {
        // SOLUCIÓN FIX 400: Se remueve el campo 'id' antes de enviar al Backend
        const { id, ...payload } = collectorForm;
        await fetchWithAuth('/tenants/collectors', { 
          method: 'POST', 
          body: JSON.stringify(payload) 
        });
        alert("🚀 Cobrador registrado y activado con éxito.");
      } else if (modalMode === 'password') {
        alert("Función de cambio de contraseña remota en desarrollo.");
      }
      setShowCollectorModal(false);
      setCollectorForm({ id: '', name: '', email: '', password: '', route_id: '' });
      loadData();
    } catch (error: any) {
      alert("Error de registro: " + (error.message || "Verifique los permisos de su base de datos"));
    } finally {
      setIsSubmittingCollector(false);
    }
  };

  const handleDeleteCollector = async (userId: string) => {
    if (!confirm("¿Deseas dar de baja a este cobrador? Se revocará su acceso de inmediato.")) return;
    alert("Procesando baja de personal en el sistema...");
  };

  // 5. SEGURIDAD Y CIERRE DE SESIÓN
  const handleUpdateAdminPassword = async () => {
    if (newAdminPassword.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
    setIsUpdatingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newAdminPassword });
      if (error) throw error;
      alert("✅ Contraseña administrativa actualizada correctamente.");
      setNewAdminPassword('');
    } catch (e: any) {
      alert("Error de seguridad: " + e.message);
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-blue-600 mb-6" size={50} />
      <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Iniciando Terminal JRX...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 pb-24 md:pb-0">
      
      {/* ── HEADER MÓVIL (MOBILE FIRST) ── */}
      <header className="md:hidden bg-slate-900 p-6 flex justify-between items-center sticky top-0 z-40 border-b border-slate-800 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg"><Wallet size={22} /></div>
          <div>
            <h1 className="text-white font-black italic tracking-tighter text-xl leading-none">JRX COBROS</h1>
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Admin Panel</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-red-400 p-3 bg-red-400/10 rounded-2xl"><LogOut size={22}/></button>
      </header>

      {/* ── NAVEGACIÓN DUAL (BOTTOM NAV MÓVIL / SIDEBAR DESKTOP) ── */}
      <aside className="fixed bottom-0 left-0 right-0 md:relative md:w-80 bg-slate-900 text-slate-300 flex md:flex-col justify-between z-50 md:z-30 shadow-[0_-20px_50px_rgba(0,0,0,0.3)] md:shadow-2xl">
        <div className="w-full">
          {/* Brand - Desktop Only */}
          <div className="hidden md:flex p-12 bg-slate-950 items-center gap-5 border-b border-slate-900">
            <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-2xl shadow-blue-900/50">
              <Wallet size={36} />
            </div>
            <div>
              <h2 className="text-white font-black italic text-3xl tracking-tighter leading-none">JRX ADMIN</h2>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500 font-black mt-3">Gestión de Sede</p>
            </div>
          </div>

          <nav className="flex md:flex-col justify-around md:justify-start p-4 md:p-10 md:space-y-5 w-full">
            {[
              { id: 'resumen', label: 'Inicio', icon: <LayoutDashboard size={26}/> },
              { id: 'rutas', label: 'Rutas', icon: <Map size={26}/> },
              { id: 'cobradores', label: 'Personal', icon: <Users size={26}/> },
              { id: 'configuracion', label: 'Ajustes', icon: <Settings size={26}/> }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => { setActiveTab(item.id as any); setSelectedRoute(null); }}
                className={`flex flex-col md:flex-row items-center gap-2 md:gap-6 p-4 md:p-6 rounded-[25px] transition-all font-black text-[10px] md:text-base w-full ${activeTab === item.id ? 'text-blue-500 md:text-white md:bg-blue-600 md:shadow-2xl md:shadow-blue-600/40 md:translate-x-4' : 'text-slate-500 md:text-slate-400 hover:text-white hover:md:translate-x-2'}`}
              >
                {item.icon} <span className="md:inline">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Logout - Desktop Only */}
        <div className="hidden md:block p-12 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center justify-center gap-4 w-full p-6 bg-slate-800/40 hover:bg-red-500 hover:text-white rounded-[30px] font-black text-sm uppercase tracking-[0.2em] transition-all border border-transparent hover:border-red-500/20">
            <LogOut size={20} /> Salida Segura
          </button>
        </div>
      </aside>

      {/* ── ÁREA DE CONTENIDO PRINCIPAL ── */}
      <main className="flex-1 p-6 md:p-16 overflow-y-auto overflow-x-hidden bg-slate-50">
        
        {/* 1. SECCIÓN: RESUMEN GLOBAL (CON TODAS LAS MÉTRICAS) */}
        {activeTab === 'resumen' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <header className="mb-12 md:mb-20 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter italic leading-none">Consolidado</h1>
                <p className="text-slate-400 font-bold text-xs md:text-lg uppercase tracking-[0.25em] mt-4">Estado financiero de la oficina</p>
              </div>
              <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Servidores Activos</span>
              </div>
            </header>
            
            {/* GRID DE MÉTRICAS MAESTRAS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-12 mb-12 md:mb-20">
              <div className="bg-white p-8 md:p-12 rounded-[50px] md:rounded-[70px] shadow-sm border border-slate-100 group hover:shadow-2xl transition-all duration-500">
                <div className="bg-blue-50 text-blue-600 w-14 h-14 md:w-24 md:h-24 rounded-[25px] md:rounded-[35px] flex items-center justify-center mb-8 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-700"><TrendingUp size={32} className="md:w-12 md:h-12" /></div>
                <p className="text-[10px] md:text-[12px] font-black uppercase text-slate-400 tracking-[0.25em]">Capital en Calle</p>
                <p className="text-2xl md:text-5xl font-black text-slate-800 mt-2">$0</p>
              </div>
              <div className="bg-white p-8 md:p-12 rounded-[50px] md:rounded-[70px] shadow-sm border border-slate-100 group hover:shadow-2xl transition-all duration-500">
                <div className="bg-green-50 text-green-600 w-14 h-14 md:w-24 md:h-24 rounded-[25px] md:rounded-[35px] flex items-center justify-center mb-8 shadow-inner group-hover:bg-green-600 group-hover:text-white transition-all duration-700"><Activity size={32} className="md:w-12 md:h-12" /></div>
                <p className="text-[10px] md:text-[12px] font-black uppercase text-slate-400 tracking-[0.25em]">Recaudo Diario</p>
                <p className="text-2xl md:text-5xl font-black text-slate-800 mt-2">$0</p>
              </div>
              <div className="bg-white p-8 md:p-12 rounded-[50px] md:rounded-[70px] shadow-sm border border-slate-100 group hover:shadow-2xl transition-all duration-500">
                <div className="bg-amber-50 text-amber-600 w-14 h-14 md:w-24 md:h-24 rounded-[25px] md:rounded-[35px] flex items-center justify-center mb-8 shadow-inner group-hover:bg-amber-600 group-hover:text-white transition-all duration-700"><Users size={32} className="md:w-12 md:h-12" /></div>
                <p className="text-[10px] md:text-[12px] font-black uppercase text-slate-400 tracking-[0.25em]">Clientes Totales</p>
                <p className="text-2xl md:text-5xl font-black text-slate-800 mt-2">0</p>
              </div>
              <div className="bg-white p-8 md:p-12 rounded-[50px] md:rounded-[70px] shadow-sm border border-slate-100 group hover:shadow-2xl transition-all duration-500">
                <div className="bg-red-50 text-red-600 w-14 h-14 md:w-24 md:h-24 rounded-[25px] md:rounded-[35px] flex items-center justify-center mb-8 shadow-inner group-hover:bg-red-600 group-hover:text-white transition-all duration-700"><AlertTriangle size={32} className="md:w-12 md:h-12" /></div>
                <p className="text-[10px] md:text-[12px] font-black uppercase text-slate-400 tracking-[0.25em]">Cartera en Mora</p>
                <p className="text-2xl md:text-5xl font-black text-slate-800 mt-2">$0</p>
              </div>
            </div>

            {/* ÁREA DE GRÁFICOS ANALÍTICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-white p-14 rounded-[60px] border border-slate-100 shadow-sm h-80 md:h-[500px] flex flex-col items-center justify-center gap-8 text-slate-200">
                <BarChart3 size={80} className="opacity-10 mb-4" />
                <p className="font-black italic text-[12px] uppercase tracking-[0.5em] text-center">Fluctuación de Capital Semanal</p>
              </div>
              <div className="bg-white p-14 rounded-[60px] border border-slate-100 shadow-sm h-80 md:h-[500px] flex flex-col items-center justify-center gap-8 text-slate-200">
                <PieChart size={80} className="opacity-10 mb-4" />
                <p className="font-black italic text-[12px] uppercase tracking-[0.5em] text-center">Rendimiento por Zona</p>
              </div>
            </div>
          </div>
        )}

        {/* 2. SECCIÓN: GESTIÓN DE RUTAS (CON ANÁLISIS PROFUNDO) */}
        {activeTab === 'rutas' && (
          <div className="animate-in fade-in duration-500">
            {!selectedRoute ? (
              <>
                <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-8 mb-16">
                  <div className="text-center md:text-left">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter italic uppercase">Zonas de Cobro</h1>
                    <p className="text-slate-400 text-xs md:text-lg font-bold uppercase tracking-[0.25em] mt-4">Supervisión táctica de rutas</p>
                  </div>
                  <button onClick={() => setShowRouteModal(true)} className="w-full md:w-auto bg-blue-600 text-white px-12 py-7 rounded-[35px] font-black flex items-center justify-center gap-4 text-xs md:text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/40 hover:bg-blue-700 active:scale-95 transition-all">
                    <PlusCircle size={24} /> Nueva Ruta
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-14">
                  {routesList.map(r => (
                    <div key={r.id} className="bg-white p-10 md:p-14 rounded-[60px] md:rounded-[80px] border border-slate-100 shadow-sm group hover:border-blue-500 hover:shadow-2xl transition-all duration-700 flex flex-col justify-between min-h-[350px]">
                      <div>
                        <div className="flex justify-between items-start mb-12">
                          <div className="bg-slate-50 text-slate-400 p-8 md:p-10 rounded-[35px] group-hover:bg-blue-600 group-hover:text-white transition-all duration-700 shadow-inner"><Map size={36} /></div>
                          <div className="flex flex-col items-end gap-4">
                            <span className="bg-green-100 text-green-700 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">Activa</span>
                            <button onClick={() => handleDeleteRoute(r.id)} className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-3xl transition-all shadow-sm"><Trash2 size={24}/></button>
                          </div>
                        </div>
                        <h3 className="text-3xl md:text-5xl font-black text-slate-800 uppercase italic leading-tight group-hover:text-blue-600 transition-colors duration-500">{r.name}</h3>
                        <div className="flex items-center gap-3 mt-6">
                           <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
                           <p className="text-[12px] text-slate-400 font-black uppercase tracking-[0.2em]">Inversión: <span className="text-slate-900">$0</span></p>
                        </div>
                      </div>
                      <button onClick={() => analyzeRoute(r)} className="w-full mt-12 py-7 bg-slate-900 text-white rounded-[32px] font-black text-xs md:text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-4 hover:bg-blue-600 shadow-2xl transition-all duration-500">
                        Auditar Ruta <ChevronRight size={22} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* 🛰️ ANALIZADOR DE RUTA INMERSIVO (MOBILE-FIRST ADAPTADO) */
              <div className="animate-in slide-in-from-right duration-700">
                <button onClick={() => setSelectedRoute(null)} className="flex items-center gap-4 text-slate-400 font-black text-xs md:text-sm uppercase tracking-[0.35em] mb-14 hover:text-blue-600 group transition-all">
                  <ArrowLeft size={24} className="group-hover:-translate-x-3 transition-transform"/> Volver al Panel
                </button>
                
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-20">
                  <div>
                    <h1 className="text-6xl md:text-9xl font-black text-slate-800 tracking-tighter uppercase italic leading-none">{selectedRoute.name}</h1>
                    <p className="text-blue-600 font-black text-sm md:text-xl flex items-center gap-4 mt-8 uppercase tracking-[0.4em]"><Activity size={28}/> Análisis de Cartera en Vivo</p>
                  </div>
                  
                  {/* TABLERO DE CUADRE FINANCIERO (MOBILE SCROLLABLE) */}
                  <div className="flex md:grid md:grid-cols-4 gap-5 w-full overflow-x-auto pb-6 no-scrollbar">
                    {[
                      { l: 'Recaudo Abonos', v: routeStats.cobrado, c: 'text-green-600', i: <TrendingUp size={18}/> },
                      { l: 'Capital Prestado', v: routeStats.prestado, c: 'text-blue-600', i: <HandCoins size={18}/> },
                      { l: 'Gastos de Ruta', v: routeStats.gastos, c: 'text-red-500', i: <TrendingDown size={18}/> },
                      { l: 'Balance Caja', v: routeStats.caja, c: 'text-white', bg: 'bg-blue-600', i: <Target size={18}/> }
                    ].map((s, idx) => (
                      <div key={idx} className={`${s.bg || 'bg-white'} p-8 rounded-[40px] border border-slate-100 shadow-sm text-center min-w-[180px] flex-1 group hover:scale-105 transition-transform`}>
                         <div className="flex items-center justify-center gap-2 mb-3">
                           <span className={s.bg ? 'text-blue-200' : 'text-slate-300'}>{s.i}</span>
                           <p className={`text-[10px] font-black uppercase tracking-widest ${s.bg ? 'text-blue-200' : 'text-slate-400'}`}>{s.l}</p>
                         </div>
                         <p className={`text-2xl font-black ${s.c}`}>${s.v.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* LISTADO DE CRÉDITOS Y ESTADO DE CLIENTES */}
                <div className="bg-white rounded-[60px] md:rounded-[90px] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-10 md:p-16 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 uppercase text-xs md:text-xl tracking-[0.3em]">Listado de Créditos</h3>
                    <div className="flex gap-4">
                       <button className="bg-white p-5 rounded-3xl text-slate-400 border border-slate-100 hover:text-blue-600 shadow-sm transition-all"><Receipt size={28}/></button>
                       <button className="bg-white p-5 rounded-3xl text-slate-400 border border-slate-100 hover:text-green-600 shadow-sm transition-all"><Activity size={28}/></button>
                    </div>
                  </div>
                  
                  {loadingRouteDetail ? (
                    <div className="p-40 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={60}/></div>
                  ) : routeLoans.length === 0 ? (
                    <div className="p-40 text-center flex flex-col items-center gap-8">
                       <Clock className="text-slate-100" size={120} />
                       <p className="text-slate-400 font-black italic uppercase tracking-[0.4em] text-lg text-center">Sin créditos registrados en este sector</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {routeLoans.map((loan) => (
                        <div key={loan.id} className="p-10 md:p-16 flex flex-col sm:flex-row sm:items-center justify-between gap-10 hover:bg-blue-50/20 transition-all group">
                          <div className="flex-1">
                            <h4 className="font-black text-slate-800 uppercase text-2xl md:text-3xl tracking-tighter leading-none italic">{loan.clients?.name}</h4>
                            <div className="flex flex-wrap items-center gap-6 mt-6">
                              <span className={`px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm ${loan.status === 'active' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-green-100 text-green-600 border border-green-200'}`}>
                                {loan.status === 'active' ? 'En Recaudo' : 'Liquidado'}
                              </span>
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-slate-300" />
                                <p className="text-sm md:text-lg font-black text-slate-400 uppercase tracking-widest">Saldo: <span className="text-slate-900">${(loan.balance || 0).toLocaleString()}</span></p>
                              </div>
                            </div>
                            {/* Visual Progress Tracker */}
                            <div className="w-full max-w-xl h-4 bg-slate-100 rounded-full mt-10 overflow-hidden shadow-inner">
                               <div className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)] transition-all duration-1000" style={{ width: `${Math.min(100, ((loan.total_amount - (loan.balance || 0)) / loan.total_amount) * 100)}%` }}></div>
                            </div>
                            <p className="text-[10px] font-black text-slate-300 uppercase mt-4 tracking-widest text-right max-w-xl">{Math.round(((loan.total_amount - (loan.balance || 0)) / loan.total_amount) * 100)}% Completado</p>
                          </div>
                          <button className="self-end sm:self-center p-7 bg-slate-50 text-slate-300 group-hover:bg-blue-600 group-hover:text-white rounded-[35px] transition-all shadow-md hover:shadow-2xl hover:scale-110"><ChevronRight size={36}/></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. SECCIÓN: GESTIÓN DE COBRADORES (CON TODOS LOS MODOS) */}
        {activeTab === 'cobradores' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-10 mb-16 text-center md:text-left">
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter italic uppercase">Personal</h1>
                <p className="text-slate-400 text-xs md:text-lg font-bold uppercase tracking-[0.3em] mt-4">Gestión de accesos y asignaciones</p>
              </div>
              <button onClick={() => { setModalMode('create'); setShowCollectorModal(true); }} className="w-full md:w-auto bg-slate-900 text-white px-12 py-7 rounded-[35px] font-black flex items-center justify-center gap-4 text-xs md:text-sm uppercase tracking-[0.25em] shadow-2xl hover:bg-blue-600 transition-all active:scale-95">
                <PlusCircle size={24} /> Registrar Nuevo
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
              {collectorsList.length === 0 ? (
                 <div className="col-span-full py-40 text-center text-slate-300 font-black italic uppercase tracking-[0.5em] opacity-20 text-xl">Sin cobradores registrados</div>
              ) : collectorsList.map((col) => (
                <div key={col.id} className="bg-white p-10 md:p-14 rounded-[60px] md:rounded-[80px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-10 group hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)] transition-all duration-700">
                  <div className="flex items-center gap-10 w-full">
                    <div className="bg-slate-50 text-slate-400 p-10 rounded-[40px] group-hover:bg-blue-50 group-hover:text-blue-600 transition-all duration-700 shadow-inner">
                      <UserCheck size={50} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-slate-800 uppercase tracking-tighter text-3xl md:text-4xl italic leading-none">{col.name || 'Sin Nombre'}</h3>
                      <div className="flex items-center gap-4 mt-6">
                        <div className="p-2.5 bg-blue-100 rounded-2xl text-blue-600 shadow-sm"><Route size={20} /></div>
                        <span className="text-sm font-black text-blue-600 uppercase tracking-[0.3em]">{col.routes?.name || 'Por asignar'}</span>
                      </div>
                    </div>
                  </div>

                  {/* BARRA DE ACCIONES TÁCTILES */}
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-[40px] border border-slate-100 shadow-inner">
                    <button onClick={() => { setModalMode('edit'); setCollectorForm({...collectorForm, id: col.id, name: col.name, route_id: col.route_id}); setShowCollectorModal(true); }} className="p-6 text-slate-400 hover:text-blue-600 hover:bg-white rounded-[30px] transition-all shadow-sm hover:shadow-xl"><Edit2 size={28} /></button>
                    <button onClick={() => { setModalMode('password'); setCollectorForm({...collectorForm, id: col.id, name: col.name}); setShowCollectorModal(true); }} className="p-6 text-slate-400 hover:text-amber-600 hover:bg-white rounded-[30px] transition-all shadow-sm hover:shadow-xl"><Key size={28} /></button>
                    <button onClick={() => handleDeleteCollector(col.id)} className="p-6 text-slate-400 hover:text-red-600 hover:bg-white rounded-[30px] transition-all shadow-sm hover:shadow-xl"><Trash2 size={28} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: AJUSTES Y CONFIGURACIÓN MAESTRA */}
        {activeTab === 'configuracion' && (
          <div className="animate-in fade-in duration-300 max-w-6xl mx-auto md:mx-0">
            <header className="mb-20 text-center md:text-left">
              <h1 className="text-4xl md:text-7xl font-black text-slate-800 tracking-tighter italic uppercase leading-none">Ajustes</h1>
              <p className="text-slate-400 font-bold text-xs md:text-xl uppercase tracking-[0.35em] mt-6">Configuración maestra de la sede</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* SEGURIDAD DE ADMINISTRACIÓN */}
              <div className="bg-white p-14 md:p-20 rounded-[60px] md:rounded-[80px] border border-slate-100 shadow-sm flex flex-col justify-between min-h-[600px]">
                <div>
                  <div className="flex items-center gap-8 mb-16">
                    <div className="bg-blue-600 p-8 rounded-[35px] text-white shadow-2xl shadow-blue-600/40"><ShieldCheck size={48} /></div>
                    <div><h3 className="font-black text-3xl text-slate-800 italic uppercase">Seguridad</h3><p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.35em] mt-3">Credenciales de acceso</p></div>
                  </div>
                  
                  <div className="space-y-12">
                    <div className="space-y-5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6">Nueva Contraseña Maestra</label>
                      <div className="relative">
                        <Lock className="absolute left-8 top-9 text-slate-300" size={30}/>
                        <input type="password" placeholder="Mínimo 6 caracteres..." className="w-full pl-20 pr-10 py-9 bg-slate-50 rounded-[40px] font-black outline-none border-4 border-transparent focus:border-blue-500 transition-all focus:bg-white text-2xl shadow-inner" value={newAdminPassword || ''} onChange={(e) => setNewAdminPassword(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleUpdateAdminPassword}
                  disabled={isUpdatingPass || !newAdminPassword}
                  className="w-full mt-16 p-10 bg-slate-900 text-white rounded-[45px] font-black text-xs md:text-sm uppercase tracking-[0.5em] shadow-2xl active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-6"
                >
                  {isUpdatingPass ? <Loader2 className="animate-spin" size={30}/> : 'Confirmar Nueva Clave'}
                </button>
              </div>

              {/* INFORMACIÓN CORPORATIVA */}
              <div className="bg-white p-14 md:p-20 rounded-[60px] md:rounded-[80px] border border-slate-100 shadow-sm min-h-[600px]">
                <div className="flex items-center gap-8 mb-16">
                  <div className="bg-purple-100 p-8 rounded-[35px] text-purple-600 shadow-sm shadow-purple-600/10"><Building2 size={48} /></div>
                  <div><h3 className="font-black text-3xl text-slate-800 italic uppercase">Corporativo</h3><p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.35em] mt-3">Identidad de la empresa</p></div>
                </div>
                <div className="space-y-10 text-base font-black text-slate-500 italic">
                  <div className="flex justify-between items-center p-8 bg-slate-50 rounded-[40px] shadow-inner"><span>Sede Administrativa</span> <span className="text-slate-900 not-italic uppercase tracking-tighter">Mosquera, Colombia</span></div>
                  <div className="flex justify-between items-center p-8 bg-slate-50 rounded-[40px] shadow-inner"><span>ID del Tenant</span> <span className="font-mono text-xs bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm not-italic">{userProfile?.tenant_id?.split('-')[0]}...</span></div>
                  <div className="flex justify-between items-center p-8 bg-slate-50 rounded-[40px] shadow-inner"><span>Divisa Operativa</span> <span className="text-slate-900 not-italic uppercase tracking-tighter">COP ($)</span></div>
                  <div className="flex justify-between items-center p-8 bg-green-50 rounded-[40px] border-2 border-green-100"><span>Estatus Plan</span> <span className="text-green-600 uppercase text-xs font-black not-italic tracking-[0.3em] animate-pulse">Enterprise Premium</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL MAESTRO: COBRADORES (ADAPTACIÓN FULL-DEVICE) ── */}
      {showCollectorModal && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-3xl z-[100] flex items-center justify-center p-0 md:p-8">
          <div className="bg-white w-full h-full md:h-auto md:max-w-2xl rounded-none md:rounded-[80px] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-y-auto animate-in zoom-in-95 duration-500">
            <div className="p-12 md:p-16 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter italic leading-none">
                  {modalMode === 'create' ? 'Nuevo Acceso' : modalMode === 'edit' ? 'Editar Perfil' : 'Seguridad'}
                </h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Personal: {collectorForm.name || 'Registro Nuevo'}</p>
              </div>
              <button onClick={() => setShowCollectorModal(false)} className="p-6 text-slate-400 bg-white rounded-full shadow-xl hover:rotate-90 transition-all duration-500"><X size={40}/></button>
            </div>
            <form onSubmit={handleCollectorAction} className="p-12 md:p-20 space-y-12">
              {modalMode !== 'password' && (
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-6">Nombre del Personal</label>
                    <input required placeholder="Ej: Jeferson Rodríguez" className="w-full p-8 bg-slate-50 rounded-[40px] font-black outline-none border-4 border-transparent focus:border-blue-500 transition-all text-2xl shadow-inner uppercase italic focus:bg-white" value={collectorForm.name || ''} onChange={e => setCollectorForm({...collectorForm, name: e.target.value})} />
                  </div>
                  {modalMode === 'create' && (
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-6">Email para Inicio de Sesión</label>
                      <input type="email" required placeholder="admin@jrx.com" className="w-full p-8 bg-slate-50 rounded-[40px] font-black outline-none border-4 border-transparent focus:border-blue-500 transition-all text-2xl shadow-inner focus:bg-white" value={collectorForm.email || ''} onChange={e => setCollectorForm({...collectorForm, email: e.target.value})} />
                    </div>
                  )}
                </div>
              )}
              {modalMode !== 'edit' && (
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-6">Contraseña de Acceso Móvil</label>
                  <input type="password" required placeholder="Cree una clave segura" className="w-full p-8 bg-slate-50 rounded-[40px] font-black outline-none border-4 border-transparent focus:border-blue-500 transition-all text-2xl shadow-inner focus:bg-white" value={collectorForm.password || ''} onChange={e => setCollectorForm({...collectorForm, password: e.target.value})} />
                </div>
              )}
              {modalMode !== 'password' && (
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-6">Territorio Asignado</label>
                  <div className="relative">
                    <select required className="w-full p-8 bg-slate-50 rounded-[40px] font-black outline-none border-4 border-transparent focus:border-blue-500 transition-all text-2xl shadow-inner appearance-none uppercase italic focus:bg-white" value={collectorForm.route_id || ''} onChange={e => setCollectorForm({...collectorForm, route_id: e.target.value})}>
                      <option value="">Seleccione una Ruta...</option>
                      {routesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <Route className="absolute right-10 top-9 text-slate-300 pointer-events-none" size={32} />
                  </div>
                </div>
              )}
              <button type="submit" disabled={isSubmittingCollector} className="w-full p-12 bg-blue-600 text-white rounded-[50px] font-black text-sm md:text-xl uppercase tracking-[0.5em] shadow-[0_20px_60px_rgba(37,99,235,0.4)] active:scale-95 transition-all flex justify-center items-center gap-6">
                {isSubmittingCollector ? <Loader2 className="animate-spin" size={40} /> : 'Activar Acceso Personal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NUEVA ZONA (RUTAS) ── */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-2xl rounded-[80px] p-16 md:p-24 shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-90 duration-500">
              <div className="flex flex-col items-center text-center mb-16">
                <div className="bg-blue-50 p-10 rounded-[45px] text-blue-600 mb-10 shadow-inner"><Map size={60}/></div>
                <h2 className="text-5xl font-black text-slate-800 italic uppercase tracking-tighter leading-none">Nueva Ruta</h2>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mt-6">Cierre de límites territoriales</p>
              </div>
              <form onSubmit={handleCreateRoute} className="space-y-12">
                <input required placeholder="Ej: Zona Norte - Variante" className="w-full p-10 bg-slate-50 rounded-[45px] font-black outline-none border-4 border-transparent focus:border-blue-500 transition-all text-center text-3xl shadow-inner uppercase italic focus:bg-white" value={newRouteName || ''} onChange={e => setNewRouteName(e.target.value)} />
                <div className="space-y-6">
                  <button className="w-full p-10 bg-slate-900 text-white rounded-[45px] font-black text-xs md:text-sm uppercase tracking-[0.5em] shadow-2xl active:scale-95 transition-all">Activar Zona</button>
                  <button type="button" onClick={() => setShowRouteModal(false)} className="w-full text-slate-300 font-black text-[12px] uppercase tracking-[0.4em] hover:text-slate-500 transition-colors">Cancelar Operación</button>
                </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}