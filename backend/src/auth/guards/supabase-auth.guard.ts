import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const client = this.supabaseService.getClient();

    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedException(
        'Acceso denegado: Token inválido o ausente.',
      );
    }

    // ⚡ OPTIMIZACIÓN: Buscamos el tenant_id UNA SOLA VEZ y lo inyectamos
    const { data: userRecord, error: dbError } = await client
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError || !userRecord || !userRecord.tenant_id) {
      throw new BadRequestException('Usuario no asociado a una empresa');
    }

    request.user = user;
    request.tenantId = userRecord.tenant_id; // 💉 Inyectamos el tenant en la request

    return true;
  }
}
