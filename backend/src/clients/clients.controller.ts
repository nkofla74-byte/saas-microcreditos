import { Controller, Get, Post, Body, Param, Query, UseGuards, Patch } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CurrentTenant } from '../auth/decorators/current-tenant.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto, @CurrentTenant() tenantId: string) {
    return this.clientsService.create(createClientDto, tenantId);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.clientsService.findAll(tenantId);
  }

  @Get('search')
  async search(@Query('query') query: string, @CurrentTenant() tenantId: string) {
    return this.clientsService.search(query, tenantId);
  }

  @Get('check/:document')
  async checkClient(@Param('document') document: string, @CurrentTenant() tenantId: string) {
    return this.clientsService.findByDocument(document, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.clientsService.findOne(id, tenantId);
  }

  // 🚀 ESTE ES EL ENDPOINT QUE FALTABA PARA EVITAR EL ERROR "Cannot PATCH"
  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Body() updateData: any, 
    @CurrentTenant() tenantId: string
  ) {
    return this.clientsService.update(id, updateData, tenantId);
  }
}