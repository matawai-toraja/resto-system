import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Ini adalah baris vital agar file di folder "public" bisa diakses
 app.useStaticAssets(join(__dirname, '..', 'public')); // Ini akses untuk index.html
app.useStaticAssets(join(__dirname, '..', 'public', 'uploads')); // TAMBAHKAN BARIS INI  
  app.enableCors();
  await app.listen(3000, '0.0.0.0');
}
bootstrap();