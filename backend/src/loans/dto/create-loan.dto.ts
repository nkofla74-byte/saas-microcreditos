import { IsString, IsNumber, IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';

// Definimos las opciones válidas para la frecuencia de pago
export enum PaymentFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class CreateLoanDto {
  @IsString()
  @IsNotEmpty()
  client_id: string;

  @IsNumber()
  @IsNotEmpty()
  principal_amount: number; // El capital prestado (ej. 100000)

  @IsNumber()
  @IsNotEmpty()
  quota_amount: number; // El valor de cada cuota (ej. 6000)

  @IsNumber()
  @IsNotEmpty()
  total_quotas: number; // Cantidad de cuotas (ej. 20)

  @IsEnum(PaymentFrequency, { message: 'Frecuencia de pago inválida' })
  @IsNotEmpty()
  payment_frequency: PaymentFrequency;

  @IsDateString()
  @IsNotEmpty()
  start_date: string; // Fecha en la que arranca el crédito

  @IsNumber()
  @IsOptional()
  priority?: number; // El orden en la ruta de cobro
}