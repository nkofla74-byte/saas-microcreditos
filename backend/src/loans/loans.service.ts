import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { CreateLoanDto, PaymentFrequency } from './dto/create-loan.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // --- MOTOR DE FECHAS (Saltando domingos) ---
  private calculateEndDate(startDateStr: string, quotas: number): string {
    const startDate = new Date(startDateStr);
    let endDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < quotas) {
      endDate.setDate(endDate.getDate() + 1);
      // Si no es domingo (0), contamos el día
      if (endDate.getDay() !== 0) {
        daysAdded++;
      }
    }
    return endDate.toISOString().split('T')[0];
  }

  // --- 1. CREAR PRÉSTAMO (O RENOVACIÓN) ---
  async create(createLoanDto: any, tenantId: string) {
    const client = this.supabase.getClient();

    const principal = createLoanDto.principal_amount;
    const interest = createLoanDto.interest_rate; // ej. 20
    const totalQuotas = createLoanDto.total_quotas;
    
    // Cálculos Financieros
    const totalInterestAmount = Math.ceil(principal * (interest / 100));
    const totalAmount = principal + totalInterestAmount;
    const quotaAmount = Math.ceil(totalAmount / totalQuotas);

    const calculatedEndDate = this.calculateEndDate(
      createLoanDto.start_date,
      totalQuotas
    );

    // TODO: Si implementas renew_from_loan_id, aquí actualizarías el préstamo anterior a 'renewed'

    const { data, error } = await client
      .from('loans')
      .insert([
        {
          tenant_id: tenantId,
          client_id: createLoanDto.client_id,
          route_id: createLoanDto.route_id, 
          principal_amount: principal,
          total_amount: totalAmount,
          balance: totalAmount,
          quota_amount: quotaAmount,
          total_quotas: totalQuotas,
          start_date: createLoanDto.start_date,
          end_date: calculatedEndDate,
          status: 'active',
          payment_frequency: createLoanDto.payment_frequency,
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creando préstamo: ${error.message}`);
      throw new InternalServerErrorException('Error al registrar el crédito');
    }

    // Registrar el desembolso en transacciones
    await client.from('transactions').insert({
        tenant_id: tenantId,
        loan_id: data.id,
        type: 'disbursement',
        amount: principal,
        description: 'Desembolso inicial',
        offline_timestamp: new Date().toISOString()
    });

    return data;
  }

  // --- 2. LISTAR PRÉSTAMOS ACTIVOS ---
  async findAll(tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('loans')
      .select(`
        *,
        clients ( name, document, whatsapp, priority )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }

  // --- 3. BUSCAR UN PRÉSTAMO ESPECÍFICO ---
  async findOne(id: string, tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('loans')
      .select(`
        *,
        clients ( id, name, document, whatsapp, priority, address, latitude, longitude ) 
      `) 
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      this.logger.error(`Error buscando préstamo ${id}: ${error.message}`);
      throw new InternalServerErrorException('Error al buscar el crédito');
    }

    return data;
  }
}