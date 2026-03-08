import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards, // 👈 Importación añadida
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

// 👈 Importaciones de seguridad y DTO de cobrador añadidas
import { CreateCollectorDto } from './dto/create-collector.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ─────────────────────────────────────────────────────────
  // 🚀 NUEVO ENDPOINT: CREAR COBRADORES DE FORMA SEGURA
  // ─────────────────────────────────────────────────────────
  @Post('collectors')
  @UseGuards(SupabaseAuthGuard) // Solo usuarios logueados pueden hacer esto
  async createCollector(
    @CurrentTenant() tenantId: string, // Obtenemos la empresa automáticamente
    @Body() createCollectorDto: CreateCollectorDto,
  ) {
    return this.tenantsService.createCollector(tenantId, createCollectorDto);
  }
  // ─────────────────────────────────────────────────────────

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(+id, updateTenantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(+id);
  }
}