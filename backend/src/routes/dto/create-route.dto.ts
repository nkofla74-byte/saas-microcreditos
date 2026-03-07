import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateRouteDto {
  @IsNotEmpty({ message: 'El nombre de la ruta es obligatorio' })
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
