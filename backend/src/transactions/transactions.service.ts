import { Injectable, Logger } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(createTransactionDto: CreateTransactionDto, tenantId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('transactions')
      .insert({ ...createTransactionDto, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll(tenantId: string) {
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return data;
  }

  // ─────────────────────────────────────────────────────────────
  // ✅ FIX: SINCRONIZACIÓN OFFLINE (PWA) 
  // ─────────────────────────────────────────────────────────────
  async syncOffline(syncDto: any, tenantId: string, userId: string) {
    const client = this.supabase.getClient();
    const results = { successful: 0, failed: 0, errors: [] as { sync_id: string; error: string }[] };

    if (!syncDto.transactions || syncDto.transactions.length === 0) {
      return results;
    }

    for (const tx of syncDto.transactions) {
      try {
        // 1. Insertamos la transacción respetando los datos que envía el frontend
        const { error: insertError } = await client
          .from('transactions')
          .insert({
            tenant_id: tenantId,
            loan_id: tx.loan_id || null, // Permitir nulo para gastos/base
            user_id: userId || '00000000-0000-0000-0000-000000000000',
            type: tx.type || 'payment', // Dinámico: 'payment', 'expense', o 'base_fund'
            amount: tx.amount,
            description: tx.description || 'Pago sincronizado offline',
            offline_timestamp: tx.offline_timestamp,
            sync_id: tx.sync_id
          });

        if (insertError) {
          if (insertError.code === '23505') {
            this.logger.log(`Transacción ignorada (ya sincronizada): ${tx.sync_id}`);
            continue;
          }
          throw insertError;
        }

        // 2. SOLO si es un pago a un crédito ('payment') intentamos actualizar el balance
        if ((tx.type === 'payment' || !tx.type) && tx.loan_id) {
          const { data: loan, error: loanError } = await client
            .from('loans')
            .select('balance')
            .eq('id', tx.loan_id)
            .single();

          if (loanError) throw loanError;

          const newBalance = Math.max(0, (Number(loan.balance) || 0) - tx.amount);
          const newStatus = newBalance === 0 ? 'paid' : 'active';

          const { error: updateError } = await client
            .from('loans')
            .update({ balance: newBalance, status: newStatus })
            .eq('id', tx.loan_id);

          if (updateError) throw updateError;
        }

        results.successful++;

      } catch (error: any) {
        this.logger.error(`Error sincronizando tx ${tx.sync_id}:`, error.message);
        results.failed++;
        results.errors.push({ sync_id: tx.sync_id, error: error.message });
      }
    }

    return results;
  }

  // Métodos adicionales de soporte
  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }

  update(id: number, updateTransactionDto: UpdateTransactionDto) {
    return `This action updates a #${id} transaction`;
  }

  remove(id: number) {
    return `This action removes a #${id} transaction`;
  }
}