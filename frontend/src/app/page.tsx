"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página parpadee o se recargue
    setLoading(true);

    try {
      // 1. Tocamos la puerta de Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      // 2. Si la llave está mal, lanzamos el error
      if (error) throw error;

      // 3. Si todo está bien, pasamos al Dashboard
      router.push("/dashboard");
    } catch (error: any) {
      alert("Error de acceso: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 font-sans">
      <div className="bg-white p-8 rounded-[40px] shadow-2xl text-center w-full max-w-sm border border-slate-100">
        {/* LOGO Y TÍTULO */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter italic">
            JRX COBROS
          </h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            Panel Administrativo
          </p>
        </div>

        {/* FORMULARIO DE ACCESO */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              className="w-full p-5 bg-slate-50 rounded-[25px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-black text-slate-400 ml-3 uppercase tracking-widest">
              Contraseña
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full p-5 bg-slate-50 rounded-[25px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-5 rounded-[25px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200 active:scale-95 transition-all mt-4 disabled:opacity-50"
          >
            {loading ? "Autenticando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
