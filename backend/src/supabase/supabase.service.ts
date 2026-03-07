import { Inject, Injectable, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private clientInstance: SupabaseClient;

  constructor(@Inject(REQUEST) private readonly request: any) {}

  getClient(): SupabaseClient {
    if (this.clientInstance) return this.clientInstance;

    const authHeader = this.request.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : '';

    this.clientInstance = createClient(
      process.env.SUPABASE_URL as string,
      // 🔑 CAMBIO AQUÍ: Usamos la SERVICE_ROLE_KEY (La llave maestra)
      process.env.SUPABASE_SERVICE_ROLE_KEY as string, 
      {
        global: {
          headers: {
            // 👤 Mantenemos el token del usuario para que auth.getUser() funcione
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    return this.clientInstance;
  }
}