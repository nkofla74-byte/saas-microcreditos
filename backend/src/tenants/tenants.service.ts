import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateCollectorDto } from './dto/create-collector.dto';
import { SupabaseService } from '../supabase/supabase.service'; // Asegúrate de que esta ruta sea correcta

@Injectable()
export class TenantsService {
  // Inyectamos el servicio de Supabase para tener acceso a la base de datos
  constructor(private readonly supabaseService: SupabaseService) {}

  // 🚀 Lógica para crear cobradores de forma silenciosa
  async createCollector(tenantId: string, dto: CreateCollectorDto) {
    const adminClient = this.supabaseService.getAdminClient();

    // 1. Crear el usuario en Supabase Auth (Bóveda de seguridad)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true, 
      user_metadata: { name: dto.name },
    });

    if (authError) {
      throw new BadRequestException(`Error en Auth: ${authError.message}`);
    }

    const userId = authData.user.id;

    // 2. Vincular el usuario con la Empresa (Tenant), el Rol y su Ruta específica
    const { error: dbError } = await adminClient
      .from('users')
      .insert({
        id: userId,
        tenant_id: tenantId,
        role: 'collector',
        route_id: dto.route_id,
      });

    if (dbError) {
      // Limpieza: si falla la DB, borramos de Auth para no dejar basura
      await adminClient.auth.admin.deleteUser(userId);
      throw new BadRequestException(`Error asignando perfil: ${dbError.message}`);
    }

    return { 
      success: true, 
      user_id: userId, 
      message: `Cobrador ${dto.name} creado y asignado con éxito.` 
    };
  }

  // --- Métodos por defecto (puedes dejarlos así o borrarlos si no los usas) ---
  create(createTenantDto: CreateTenantDto) {
    return 'This action adds a new tenant';
  }

  findAll() {
    return `This action returns all tenants`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tenant`;
  }

  update(id: number, updateTenantDto: UpdateTenantDto) {
    return `This action updates a #${id} tenant`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenant`;
  }
}