import { supabase } from "@/lib/supabase";

export const useApi = () => {
  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    // 1. Obtener la sesión activa de Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    // 2. Configurar los headers con el Token
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    // 3. Hacer la petición
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("DETALLE DEL ERROR:", errorData);
      throw new Error(errorData.message || "Error en la petición");
    }

    return response.json();
  };

  return { fetchWithAuth };
};
