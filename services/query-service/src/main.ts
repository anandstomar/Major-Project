import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('');
  app.enableShutdownHooks(); 
  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
  console.log(`Query service running at http://localhost:${port}`);
}
bootstrap();
