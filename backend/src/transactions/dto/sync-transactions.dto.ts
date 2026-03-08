import { IsArray, IsUUID, IsNumber, IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OfflineTransactionDto {
  @IsUUID()
  sync_id: string; // 🔑 El ID generado en el celular (uuidv4)

  @IsUUID()
  loan_id: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  offline_timestamp: string; // Cuándo se cobró realmente
}

export class SyncTransactionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineTransactionDto)
  transactions: OfflineTransactionDto[];
}