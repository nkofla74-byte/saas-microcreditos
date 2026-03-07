import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

@UseGuards(SupabaseAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // 1. CREAR CLIENTE
  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  // 2. LISTAR TODOS
  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  // 3. BUSCADOR DINÁMICO (Para la barra de búsqueda de "Nuevo Crédito")
  // URL: GET /clients/search?query=...
  @Get('search')
  async search(@Query('query') query: string) {
    return this.clientsService.search(query);
  }

  // 4. VERIFICACIÓN DE RIESGO (Para validación inmediata por documento)
  // URL: GET /clients/check/102030...
  @Get('check/:document')
  async checkClient(@Param('document') document: string) {
    return this.clientsService.findByDocument(document);
  }

  // 5. OBTENER UNO POR ID (Siempre al final para evitar conflictos con /search o /check)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }
}