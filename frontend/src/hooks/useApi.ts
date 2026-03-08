import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { useCallback } from "react"; // 👈 AÑADIMOS ESTA IMPORTACIÓN

// ─────────────────────────────────────────────────────────────
// ✅ CAUSA RAÍZ DEL BUG:
//
// Supabase inicializa su estado de auth en 2 pasos:
//
//   1. Cliente JS se crea  → session = null (aún no leyó storage)
//   2. Lee localStorage    → dispara INITIAL_SESSION con la sesión real
//
// El error ocurría porque fetchWithAuth corría en el paso 1,
// antes de que Supabase terminara el paso 2.
//
// ✅ SOLUCIÓN: Promise a nivel de módulo que espera exactamente
// el evento INITIAL_SESSION — se resuelve UNA SOLA VEZ para
// toda la vida de la app. Las llamadas posteriores a fetchWithAuth
// usan getSession() normalmente (ya está en memoria).
// ─────────────────────────────────────────────────────────────
let authReadyPromise: Promise<Session | null> | null = null;

const waitForAuthReady = (): Promise<Session | null> => {
  if (authReadyPromise) return authReadyPromise; // Ya resuelta, retornar inmediato

  authReadyPromise = new Promise((resolve) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // INITIAL_SESSION se dispara exactamente una vez cuando Supabase
        // termina de leer el token desde localStorage/cookies
        if (event === "INITIAL_SESSION") {
          subscription.unsubscribe(); // Limpiar listener — ya no lo necesitamos
          resolve(session);
        }
      }
    );
  });

  return authReadyPromise;
};

// ─────────────────────────────────────────────────────────────
// FIX: Validar variable de entorno en producción
// ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  console.error("⚠️ NEXT_PUBLIC_API_URL no definida en producción.");
}

const BASE_URL         = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const REQUEST_TIMEOUT  = 15_000;

// FIX: Evento global para redirección — evita window.location.href en Next.js
const dispatchSessionExpired = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("session-expired"));
  }
};

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────
export const useApi = () => {

  // 👈 AQUÍ ESTÁ LA MAGIA: ENVOLVEMOS TODO EN useCallback
  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {

    // PASO 1: Esperar a que Supabase esté listo (solo en la primera llamada)
    await waitForAuthReady();

    // PASO 2: Leer sesión actual (ya está en memoria tras INITIAL_SESSION)
    const { data: { session } } = await supabase.auth.getSession();

    // PASO 3: Sin sesión → fallar rápido, no enviar "Bearer undefined"
    if (!session?.access_token) {
      dispatchSessionExpired();
      throw new Error("No hay sesión activa. Inicia sesión nuevamente.");
    }

    // PASO 4: Configurar headers (no logueamos el token por seguridad)
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
      Authorization: `Bearer ${session.access_token}`,
    };

    // PASO 5: Petición con timeout para evitar UI bloqueada infinitamente
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error.name === "AbortError")
        throw new Error("La petición tardó demasiado. Verifique su conexión.");
      throw new Error(`Error de red: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // PASO 6: Token rechazado por el servidor
    if (response.status === 401) {
      console.warn("[useApi] 401 recibido. Cerrando sesión...");
      await supabase.auth.signOut();
      dispatchSessionExpired();
      throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
    }

    // PASO 7: Otros errores HTTP — leer como texto para evitar SyntaxError
    // cuando el backend responde con HTML en errores 500
    if (!response.ok) {
      const text = await response.text();
      let errorData: any = {};
      try   { errorData = JSON.parse(text); }
      catch { errorData = { message: text || response.statusText }; }
      console.error(`[API Error] ${endpoint} → ${response.status}:`, errorData?.message);
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    // PASO 8: Respuesta exitosa — verificar antes de parsear como JSON
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) return null;

    return response.json();
  }, []); // 👈 ESTOS CORCHETES VACÍOS LE DICEN A REACT QUE NO RECREE LA FUNCIÓN NUNCA MÁS

  return { fetchWithAuth };
};