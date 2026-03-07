import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // --- FUNCIÓN PRIVADA PARA OBTENER EL TENANT (REUTILIZABLE) ---
  private async getTenantId() {
    const client = this.supabase.getClient();
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      throw new InternalServerErrorException('Sesión inválida o expirada');
    }

    const { data: userRecord, error: dbError } = await client
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError || !userRecord) {
      this.logger.error(`Error obteniendo tenant para usuario ${user.id}`);
      throw new BadRequestException('Usuario no asociado a una empresa');
    }

    return userRecord.tenant_id;
  }

  // --- 1. CREAR CLIENTE ---
  async create(createClientDto: CreateClientDto) {
    const client = this.supabase.getClient();
    const tenantId = await this.getTenantId();

    const { data, error } = await client
      .from('clients')
      .insert([
        {
          ...createClientDto,
          tenant_id: tenantId,
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un cliente con este documento en tu empresa');
      }
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  // --- 2. LISTAR TODOS (ORDENADOS POR PRIORIDAD/CREACIÓN) ---
  async findAll() {
    const client = this.supabase.getClient();
    const tenantId = await this.getTenantId();

    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // --- 3. BUSCAR POR ID ESPECÍFICO ---
  async findOne(id: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // --- 4. VERIFICAR SI EXISTE POR DOCUMENTO (LÓGICA DE RIESGO) ---
  async findByDocument(document: string) {
    const client = this.supabase.getClient();
    const tenantId = await this.getTenantId();

    const { data, error } = await client
      .from('clients')
      .select('id, name, document, status')
      .eq('document', document)
      .eq('tenant_id', tenantId) // Seguridad: Solo en su empresa
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    return data; 
  }

  // --- 5. BUSCADOR FLEXIBLE (NOMBRE O CÉDULA) ---
  async search(query: string) {
    const client = this.supabase.getClient();
    const tenantId = await this.getTenantId();

    // Buscamos coincidencias en documento o nombre
    // Usamos .ilike para que no importe mayúsculas/minúsculas
    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`document.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(10);

    if (error) {
      this.logger.error(`Error en búsqueda: ${error.message}`);
      throw new InternalServerErrorException('Error al realizar la búsqueda');
    }

    return data;
  }
}