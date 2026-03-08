'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Autenticar credenciales en Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.session) {
        const userId = authData.session.user.id;

        // 2. Buscar el perfil y rol del usuario en tu tabla pública
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role, tenant_id, route_id')
          .eq('id', userId)
          .single();

        if (profileError || !userProfile) {
          // Si existe en Auth pero no en tu tabla public.users, bloqueamos el paso
          await supabase.auth.signOut();
          throw new Error('Usuario sin permisos. Contacte al administrador.');
        }

        // 3. 🚦 SEMÁFORO INTELIGENTE: Redirección según el Rol
        const { role } = userProfile;

        if (role === 'superadmin') {
          router.push('/superadmin');
        } else if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'collector') {
          router.push('/dashboard');
        } else {
          await supabase.auth.signOut();
          throw new Error('Rol de usuario no válido.');
        }
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-[35px] shadow-sm border border-slate-100 w-full max-w-md animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-4 rounded-2xl text-white mb-4 shadow-lg">
            <Wallet size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter italic">JRX COBROS</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Acceso al Sistema SaaS</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Correo electrónico"
              className="w-full p-5 bg-slate-50 rounded-[20px] font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full p-5 bg-slate-50 rounded-[20px] font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-5 bg-blue-600 text-white rounded-[20px] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all mt-4 disabled:opacity-50 flex justify-center"
          >
            {loading ? (
               <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-b-transparent" />
            ) : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}