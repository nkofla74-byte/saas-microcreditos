import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { SupabaseModule } from '../supabase/supabase.module'; // 👈 Importamos el módulo de Supabase

@Module({
  imports: [SupabaseModule], // 👈 Lo agregamos aquí para que el Service esté disponible
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}