import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. Validación estricta de datos entrantes
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true // Rechaza datos que no estén en el DTO
  }));

  // 2. Configuración de CORS robusta
  app.enableCors({
    origin: true, // En desarrollo permite todo, en producción puedes poner tu URL de Vercel
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 3. Prefijo global (Opcional pero recomendado)
  // Esto hará que tus rutas sean: dominio.com/api/clients
  // app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`🚀 Servidor JRX listo en el puerto: ${port}`);
}
bootstrap();