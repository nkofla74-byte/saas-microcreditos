import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.paymentsService.create(createPaymentDto, tenantId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    // ✅ Corregido: Ahora pasamos el tenantId que el servicio requiere
    return this.paymentsService.findAll(tenantId);
  }
}