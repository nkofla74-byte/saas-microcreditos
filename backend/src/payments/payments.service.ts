import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const client = this.supabase.getClient();
    const { loan_id, amount } = createPaymentDto;

    // 1. Validación de Usuario (Adiós errores de TS)
    const { data: { user }, error: authError } = await client.auth.getUser();
    
    if (authError || !user) {
      this.logger.error('Usuario no autenticado intentando cobrar');
      throw new BadRequestException('Sesión no válida o expirada');
    }

    // 2. Validación de Empresa (Tenant)
    const { data: userData, error: dbError } = await client
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (dbError || !userData) {
      this.logger.error(`Usuario ${user.id} no tiene empresa vinculada`);
      throw new BadRequestException('El usuario no pertenece a ninguna oficina');
    }

    const tenantId = userData.tenant_id;

    // 3. Registro del Pago (Atomicidad Manual)
    // Buscamos el préstamo para saber el saldo actual
    const { data: loan, error: loanErr } = await client
      .from('loans')
      .select('balance')
      .eq('id', loan_id)
      .single();

    if (loanErr || !loan) throw new BadRequestException('Préstamo no encontrado');

    // INSERT con todos los campos (Evita el NOT NULL error)
    const { error: paymentError } = await client
      .from('payments')
      .insert([{
        loan_id: loan_id,
        tenant_id: tenantId,
        amount: Number(amount)
      }]);

    if (paymentError) {
      this.logger.error('DETALLE ERROR POSTGRES:', JSON.stringify(paymentError, null, 2));
      throw new InternalServerErrorException(`Fallo en base de datos: ${paymentError.message}`);
    }

    // 4. Actualización del Saldo
    const newBalance = Number(loan.balance) - Number(amount);
    await client
      .from('loans')
      .update({ 
        balance: newBalance,
        status: newBalance <= 0 ? 'completed' : 'active'
      })
      .eq('id', loan_id);

    return { message: '🚀 ¡Cobro exitoso!', new_balance: newBalance };
  }
}