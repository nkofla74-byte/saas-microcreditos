import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private clientInstance: SupabaseClient;
  private adminClientInstance: SupabaseClient;

  constructor(@Inject(REQUEST) private readonly request: any) {}

  /**
   * 🛡️ Cliente Autenticado (Respeta RLS)
   * Úsalo para todas las peticiones que provienen de un usuario.
   */
  getClient(): SupabaseClient {
    if (this.clientInstance) return this.clientInstance;

    const authHeader = this.request.headers?.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : '';

    this.clientInstance = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_ANON_KEY as string, // 🔑 Usamos la llave pública
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`, // Identidad del usuario
          },
        },
        auth: {
          persistSession: false, // 🛑 CRÍTICO: Evita mezclar sesiones de diferentes usuarios en el servidor
        },
      },
    );

    return this.clientInstance;
  }

  /**
   * ⚠️ Cliente Administrador (Bypassea RLS)
   * Úsalo ÚNICAMENTE para procesos internos del backend (Cronjobs, Webhooks).
   * NUNCA lo uses en endpoints consumidos por usuarios.
   */
  getAdminClient(): SupabaseClient {
    if (this.adminClientInstance) return this.adminClientInstance;

    this.adminClientInstance = createClient(
      process.env.SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string, // 🔑 Llave Maestra
      {
        auth: {
          persistSession: false,
        },
      },
    );

    return this.adminClientInstance;
  }
}
