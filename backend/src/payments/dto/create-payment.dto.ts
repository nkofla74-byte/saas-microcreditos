import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  loan_id: string;

  @IsNumber()
  @Min(1, { message: 'El abono debe ser mayor a 0' })
  @IsNotEmpty()
  amount: number;
}