import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator'; // 👈 Ahora sí existe

@UseGuards(SupabaseAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
      @Body() createTransactionDto: CreateTransactionDto,
      @CurrentTenant() tenantId: string
  ) {
    return this.transactionsService.create(createTransactionDto, tenantId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.transactionsService.findAll(tenantId);
  }

  @Post('sync')
  syncOffline(
      @Body() syncDto: any,
      @CurrentTenant() tenantId: string,
      @CurrentUser() userId: string // 🛡️ 👈 Extraemos el user_id de forma segura desde el Token JWT
  ) {
    return this.transactionsService.syncOffline(syncDto, tenantId, userId);
  }
}