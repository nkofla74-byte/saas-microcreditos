import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // --- 1. LISTAR TODOS LOS PAGOS ---
  async findAll(tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('payments')
      .select('*, loans(id, balance, clients(name))') // Relación para ver quién pagó
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error consultando pagos: ${error.message}`);
      throw new InternalServerErrorException('Error consultando pagos');
    }

    return data;
  }

  // --- 2. REGISTRAR UN PAGO ---
  async create(createPaymentDto: CreatePaymentDto, tenantId: string) {
    const client = this.supabase.getClient();
    const { loan_id, amount } = createPaymentDto;

    // 🔒 SEGURIDAD: Validar que el préstamo existe Y pertenece a tu empresa
    const { data: loan, error: loanErr } = await client
      .from('loans')
      .select('balance')
      .eq('id', loan_id)
      .eq('tenant_id', tenantId)
      .single();

    if (loanErr || !loan) {
      throw new BadRequestException(
        'El préstamo no existe o no pertenece a tu empresa',
      );
    }

    if (Number(amount) <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a 0');
    }

    // Insertar el pago
    const { error: paymentError } = await client.from('payments').insert([
      {
        loan_id: loan_id,
        tenant_id: tenantId,
        amount: Number(amount),
      },
    ]);

    if (paymentError) {
      this.logger.error(`Fallo en base de datos al pagar: ${paymentError.message}`);
      throw new InternalServerErrorException(
        `Fallo en base de datos: ${paymentError.message}`,
      );
    }

    // Calcular nuevo balance
    const newBalance = Number(loan.balance) - Number(amount);

    // Actualizar el estado del crédito
    await client
      .from('loans')
      .update({
        balance: newBalance,
        status: newBalance <= 0 ? 'completed' : 'active',
      })
      .eq('id', loan_id)
      .eq('tenant_id', tenantId);

    return {
      message: '🚀 ¡Cobro exitoso!',
      new_balance: newBalance,
    };
  }
}