import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    const client = this.supabase.getClient();

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user)
      throw new InternalServerErrorException('Error de sesión');

    const { data: userRecord } = await client
      .from('users')
      .select('tenant_id')
      .eq('id', userData.user.id)
      .single();

    if (!userRecord)
      throw new BadRequestException('Usuario no asociado a una empresa');

    // Insertamos la transacción en el Libro Mayor
    const { data, error } = await client
      .from('transactions')
      .insert([
        {
          ...createTransactionDto,
          tenant_id: userRecord.tenant_id,
          user_id: userData.user.id, // Auditamos qué cobrador recibió el dinero o hizo el gasto
        },
      ])
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(
        `Error al registrar transacción: ${error.message}`,
      );
    }

    return data;
  }

  async findAll() {
    const client = this.supabase.getClient();

    // RLS garantiza la privacidad. Traemos datos del crédito y del cobrador para el informe.
    const { data, error } = await client
      .from('transactions')
      .select(
        `
        *,
        loans ( total_amount, clients ( name ) ),
        users ( role )
      `,
      )
      .order('offline_timestamp', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
}
