import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator'; // 🆕 Importado

@UseGuards(SupabaseAuthGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  create(
    @Body() createLoanDto: CreateLoanDto,
    @CurrentTenant() tenantId: string,
  ) {
    return this.loansService.create(createLoanDto, tenantId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.loansService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.loansService.findOne(id, tenantId);
  }
}
