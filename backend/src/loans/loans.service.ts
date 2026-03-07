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

  // --- OBTENER TENANT (IGUAL QUE EN CLIENTES) ---
  private async getTenantId() {
    const client = this.supabase.getClient();
    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) throw new InternalServerErrorException('Sesión inválida');

    const { data: userRecord, error: dbError } = await client
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError || !userRecord) throw new BadRequestException('Usuario sin empresa');
    
    return userRecord.tenant_id;
  }

  // --- MOTOR DE FECHAS ---
  private calculateEndDate(startDateStr: string, quotas: number, frequency: PaymentFrequency): string {
    const date = new Date(startDateStr);
    
    // Sumamos los días/semanas/meses según la frecuencia
    if (frequency === PaymentFrequency.DAILY) {
      date.setDate(date.getDate() + quotas);
    } else if (frequency === PaymentFrequency.WEEKLY) {
      date.setDate(date.getDate() + (quotas * 7));
    } else if (frequency === PaymentFrequency.MONTHLY) {
      date.setMonth(date.getMonth() + quotas);
    }

    return date.toISOString().split('T')[0]; // Devolvemos formato YYYY-MM-DD
  }

  // --- 1. CREAR PRÉSTAMO ---
  async create(createLoanDto: CreateLoanDto) {
    const client = this.supabase.getClient();
    const tenantId = await this.getTenantId();

    // 1. Cálculos Financieros Matemáticos (Seguridad en el Backend)
    const totalAmount = createLoanDto.quota_amount * createLoanDto.total_quotas;

    if (totalAmount < createLoanDto.principal_amount) {
      throw new BadRequestException('ERROR: El total a pagar es menor al capital prestado.');
    }

    // 2. Calcular fecha final automáticamente
    const calculatedEndDate = this.calculateEndDate(
      createLoanDto.start_date,
      createLoanDto.total_quotas,
      createLoanDto.payment_frequency
    );

    // 3. Guardar en Base de Datos
    const { data, error } = await client
      .from('loans')
      .insert([
        {
          ...createLoanDto,
          tenant_id: tenantId,
          total_amount: totalAmount,        // Guardamos el cálculo matemático
          end_date: calculatedEndDate,      // Guardamos la fecha calculada
          balance: totalAmount,             // Al inicio, la deuda (balance) es el total
          status: 'active'                  // Nace activo
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
  async findAll() {
    const client = this.supabase.getClient();
    const tenantId = await this.getTenantId();

    const { data, error } = await client
      .from('loans')
      .select(`
        *,
        clients ( name, document, whatsapp )
      `) // Traemos también los datos del cliente asociado
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data;
  }
  // --- 3. BUSCAR UN PRÉSTAMO ESPECÍFICO ---
  async findOne(id: string) {
    const client = this.supabase.getClient();
    const tenantId = await this.getTenantId();

    const { data, error } = await client
      .from('loans')
      .select(`
        *,
        clients ( name, document, whatsapp )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId) // Seguridad: Que sea de TU empresa
      .single();

    if (error) {
      this.logger.error(`Error buscando préstamo ${id}: ${error.message}`);
      throw new InternalServerErrorException('Error al buscar el crédito');
    }

    return data;
  }
}
