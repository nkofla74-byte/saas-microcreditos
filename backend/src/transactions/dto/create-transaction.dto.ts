import {
  IsUUID,
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsString,
  Min,
} from 'class-validator';

export enum TransactionType {
  PAYMENT = 'payment',
  EXPENSE = 'expense',
  DISBURSEMENT = 'disbursement',
}

export class CreateTransactionDto {
  @IsOptional()
  @IsUUID('4', { message: 'ID de crédito inválido' })
  loan_id?: string;

  @IsNotEmpty({ message: 'El tipo de transacción es obligatorio' })
  @IsEnum(TransactionType, { message: 'Tipo de transacción inválido' })
  type: TransactionType;

  @IsNotEmpty()
  @IsInt({ message: 'El monto debe ser un número entero' })
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty({ message: 'La marca de tiempo offline es obligatoria' })
  @IsDateString({}, { message: 'Formato de fecha offline inválido' })
  offline_timestamp: string;
}
