import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Obtenemos la instancia de Supabase configurada para esta petición
    const client = this.supabaseService.getClient();

    // Le pedimos a Supabase que valide el token actual
    const { data: { user }, error } = await client.auth.getUser();

    // Si no hay usuario o el token es falso/expirado, bloqueamos el acceso
    if (error || !user) {
      throw new UnauthorizedException('Acceso denegado: Token inválido o ausente.');
    }

    // Opcional pero recomendado: Inyectamos los datos del usuario en la request
    // por si algún controlador necesita saber el email o el ID exacto
    request.user = user;

    return true; // Permite que la petición continúe
  }
}