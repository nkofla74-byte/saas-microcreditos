import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class RoutesService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(createRouteDto: CreateRouteDto) {
    const client = this.supabase.getClient();

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) throw new InternalServerErrorException('Error de sesión');

    const { data: userRecord } = await client
      .from('users')
      .select('tenant_id')
      .eq('id', userData.user.id)
      .single();

    if (!userRecord) throw new BadRequestException('Usuario no asociado a una empresa');

    const { data, error } = await client
      .from('routes')
      .insert([
        { 
          ...createRouteDto, 
          tenant_id: userRecord.tenant_id 
        }
      ])
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    return data;
  }

  async findAll() {
    const client = this.supabase.getClient();
    
    // El RLS garantiza que solo devuelva las rutas del tenant actual
    const { data, error } = await client
      .from('routes')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  async findOne(id: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('routes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
}