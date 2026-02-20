import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('health')
  checkHealth() {
    return { status: 'ok', service: 'notification-service', timestamp: new Date() };
  }

  @Get('feed')
  getFeed() {
    return this.notificationService.getFeed();
  }

  
  @Get('rules')
  getRules() {
    return this.notificationService.getRules();
  }

  @Post('rules')
  createRule(@Body() body: any) {
    return this.notificationService.createRule(body);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.notificationService.deleteRule(Number(id));
  }
}