import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Activa la validación de los DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  
  // Habilita CORS para que tu frontend en Next.js pueda hacer peticiones
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();