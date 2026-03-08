import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // --- 1. CREAR UNA TRANSACCIÓN INDIVIDUAL ---
  async create(createTransactionDto: CreateTransactionDto, tenantId: string) {
    const client = this.supabase.getClient();

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user)
      throw new InternalServerErrorException('Error de sesión');

    const { data, error } = await client
      .from('transactions')
      .insert([
        {
          ...createTransactionDto,
          tenant_id: tenantId,
          user_id: userData.user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(`Error al registrar transacción: ${error.message}`);
    }

    return data;
  }

  // --- 2. LISTAR TRANSACCIONES ---
  async findAll(tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('transactions')
      .select(`
        *,
        loans ( total_amount, clients ( name ) ),
        users ( role )
      `)
      .eq('tenant_id', tenantId)
      .order('offline_timestamp', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // --- 3. SINCRONIZACIÓN OFFLINE (PWA) ---
  async syncOffline(syncDto: any, tenantId: string, userId: string) {
    const client = this.supabase.getClient();
    // Arreglo del tipado del Array (para evitar TS2345)
    const results = { successful: 0, failed: 0, errors: [] as { sync_id: string; error: string }[] };

    if(!syncDto.transactions || syncDto.transactions.length === 0) {
        return results;
    }

    for (const tx of syncDto.transactions) {
      try {
        const { error: insertError } = await client
          .from('transactions')
          .insert({
            tenant_id: tenantId,
            loan_id: tx.loan_id,
            user_id: userId || '00000000-0000-0000-0000-000000000000', // Reemplaza por el ID real extraído del guard
            type: 'payment',
            amount: tx.amount,
            description: 'Pago sincronizado offline',
            offline_timestamp: tx.offline_timestamp,
            sync_id: tx.sync_id
          });

        if (insertError) {
            if(insertError.code === '23505') {
                 this.logger.log(`Transacción ignorada (ya sincronizada): ${tx.sync_id}`);
                 continue;
            }
            throw insertError;
        }

        const { data: loan, error: loanError } = await client
            .from('loans')
            .select('balance')
            .eq('id', tx.loan_id)
            .single();
            
        if(loanError) throw loanError;

        const newBalance = Math.max(0, loan.balance - tx.amount);
        const newStatus = newBalance === 0 ? 'paid' : 'active';

        const { error: updateError } = await client
            .from('loans')
            .update({ balance: newBalance, status: newStatus })
            .eq('id', tx.loan_id);

        if(updateError) throw updateError;

        results.successful++;

      } catch (error: any) {
        this.logger.error(`Error sincronizando tx ${tx.sync_id}:`, error.message);
        results.failed++;
        // Corregido el tipado del push
        results.errors.push({ sync_id: tx.sync_id, error: error.message });
      }
    }

    return results;
  }
}