import { IsEmail, IsNotEmpty, IsString, MinLength, IsUUID } from 'class-validator';

export class CreateCollectorDto {
  @IsEmail({}, { message: 'Debe ser un correo válido' })
  email: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUUID()
  @IsNotEmpty({ message: 'Debe asignar una ruta válida al cobrador' })
  route_id: string;
}