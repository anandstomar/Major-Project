import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { startTelemetry } from './telemetry';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptors';
dotenv.config();

async function bootstrap() {
  await startTelemetry();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/api/v1');
  app.enableShutdownHooks();
  // In main.ts
  app.useGlobalInterceptors(new MetricsInterceptor());
  const { register } = await import('prom-client');
  app.getHttpAdapter().get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  const port = Number(process.env.PORT ?? 8081);
  await app.listen(port, '0.0.0.0');
  console.log(`Query service running at http://localhost:${port}`);
}
bootstrap();
