import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import {NotificationController} from './notification/notification.controller';

@Module({
  imports: [NotificationModule],
  controllers: [NotificationController],
})
export class AppModule {}
