import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class MoraCronService {
  private readonly logger = new Logger(MoraCronService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // Se ejecuta todos los días a la 1:00 AM (Zona horaria del servidor)
  @Cron('0 1 * * *')
  async applyDefaultPenalties() {
    this.logger.log('Iniciando proceso de mora...');
    const adminClient = this.supabase.getAdminClient(); // Bypassea RLS para uso interno

    // 1. Buscar créditos vencidos
    const today = new Date().toISOString().split('T')[0];
    const { data: expiredLoans, error } = await adminClient
      .from('loans')
      .select('*')
      .eq('status', 'active')
      .lt('end_date', today)
      .gt('balance', 0);

    if (error) {
        this.logger.error('Error buscando préstamos vencidos', error);
        return;
    }

    if(!expiredLoans || expiredLoans.length === 0){
        this.logger.log('No hay créditos en mora hoy.');
        return;
    }

    // 2. Procesar cada crédito (Lo ideal sería un Stored Procedure para hacerlo en bloque)
    for (const loan of expiredLoans) {
        try {
            // Regla de negocio: 20% de interés al saldo restante
            const penaltyAmount = Math.ceil(loan.balance * 0.20);
            const newPrincipal = loan.balance + penaltyAmount;
            
            // a. Marcar viejo como 'defaulted'
            await adminClient
                .from('loans')
                .update({ status: 'defaulted' })
                .eq('id', loan.id);

            // b. Crear nuevo crédito (Refinanciación automática)
            // Lógica simplificada: Se le dan otras 24 cuotas (ajustable según negocio)
            const newQuotas = 24; 
            const newQuotaAmount = Math.ceil(newPrincipal / newQuotas);

            const { data: newLoan, error: insertError } = await adminClient
                .from('loans')
                .insert({
                    tenant_id: loan.tenant_id,
                    client_id: loan.client_id,
                    route_id: loan.route_id,
                    principal_amount: loan.balance, // El capital base del nuevo es el saldo viejo
                    total_amount: newPrincipal, // Saldo + Mora
                    balance: newPrincipal,
                    quota_amount: newQuotaAmount,
                    total_quotas: newQuotas,
                    start_date: today,
                    end_date: this.calculateEndDate(new Date(today), newQuotas),
                    status: 'active',
                    previous_loan_id: loan.id // Rastreabilidad
                })
                .select().single();
                
            if(insertError) throw insertError;
            
            this.logger.log(`Crédito ${loan.id} refinanciado por mora. Nuevo ID: ${newLoan.id}`);

        } catch (e) {
             this.logger.error(`Error procesando mora para préstamo ${loan.id}`, e);
        }
    }
    
    this.logger.log('Proceso de mora finalizado.');
  }

  // Utilidad para calcular fechas saltando domingos (igual que en LoansService)
  private calculateEndDate(startDate: Date, quotas: number): string {
      let endDate = new Date(startDate);
      let daysAdded = 0;
      while (daysAdded < quotas) {
          endDate.setDate(endDate.getDate() + 1);
          if (endDate.getDay() !== 0) daysAdded++;
      }
      return endDate.toISOString().split('T')[0];
  }
}