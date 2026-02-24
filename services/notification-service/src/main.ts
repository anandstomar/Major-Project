import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn', 'debug'] });
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['kafka-external:9092'], // Ensure this matches your K8s DNS
      },
      consumer: {
        // Use a UNIQUE group ID so it doesn't conflict with your existing service
        groupId: 'notification-approver-group', 
      },
    },
  });
  app.enableShutdownHooks();
  await app.startAllMicroservices()

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port);

  console.log(`Notification service listening on http://0.0.0.0:${port}`);
}

bootstrap();
