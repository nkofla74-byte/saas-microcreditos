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

  // --- 1. CREAR CLIENTE ---
  async create(createClientDto: CreateClientDto, tenantId: string) {
    const client = this.supabase.getClient();

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
        throw new BadRequestException(
          'Ya existe un cliente con este documento en tu empresa',
        );
      }
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  // --- 2. LISTAR TODOS ---
  async findAll(tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // --- 3. BUSCAR POR ID ESPECÍFICO ---
  async findOne(id: string, tenantId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔒 Seguridad añadida: Solo de tu empresa
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // --- 4. VERIFICAR SI EXISTE POR DOCUMENTO ---
  async findByDocument(document: string, tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('clients')
      .select('id, name, document, status')
      .eq('document', document)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // --- 5. BUSCADOR FLEXIBLE ---
  async search(query: string, tenantId: string) {
    const client = this.supabase.getClient();

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

  // --- 6. ACTUALIZAR CLIENTE (Ej: Prioridad) ---
  async update(id: string, updateData: any, tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId) // 🔒 Seguridad
      .select()
      .single();

    if (error) {
      this.logger.error(`Error actualizando cliente ${id}: ${error.message}`);
      throw new InternalServerErrorException('Error al actualizar el cliente');
    }
    return data;
  }
}