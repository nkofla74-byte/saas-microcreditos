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

  // --- MOTOR DE FECHAS (Se mantiene igual, lógica pura de dominio) ---
  private calculateEndDate(
    startDateStr: string,
    quotas: number,
    frequency: PaymentFrequency,
  ): string {
    const date = new Date(startDateStr);

    if (frequency === PaymentFrequency.DAILY) {
      date.setDate(date.getDate() + quotas);
    } else if (frequency === PaymentFrequency.WEEKLY) {
      date.setDate(date.getDate() + quotas * 7);
    } else if (frequency === PaymentFrequency.MONTHLY) {
      date.setMonth(date.getMonth() + quotas);
    }

    return date.toISOString().split('T')[0];
  }

  // --- 1. CREAR PRÉSTAMO ---
  async create(createLoanDto: CreateLoanDto, tenantId: string) {
    const client = this.supabase.getClient();

    // Cálculos Financieros Matemáticos
    const totalAmount = createLoanDto.quota_amount * createLoanDto.total_quotas;

    if (totalAmount < createLoanDto.principal_amount) {
      throw new BadRequestException(
        'ERROR: El total a pagar es menor al capital prestado.',
      );
    }

    const calculatedEndDate = this.calculateEndDate(
      createLoanDto.start_date,
      createLoanDto.total_quotas,
      createLoanDto.payment_frequency,
    );

    const { data, error } = await client
      .from('loans')
      .insert([
        {
          ...createLoanDto,
          tenant_id: tenantId,
          total_amount: totalAmount,
          end_date: calculatedEndDate,
          balance: totalAmount,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creando préstamo: ${error.message}`);
      throw new InternalServerErrorException('Error al registrar el crédito');
    }

    return data;
  }

  // --- 2. LISTAR PRÉSTAMOS ACTIVOS ---
  async findAll(tenantId: string) {
    const client = this.supabase.getClient();

    const { data, error } = await client
      .from('loans')
      .select(
        `
        *,
        clients ( name, document, whatsapp )
      `,
      )
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
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error buscando préstamo ${id}: ${error.message}`);
      throw new InternalServerErrorException('Error al buscar el crédito');
    }

    return data;
  }
}
