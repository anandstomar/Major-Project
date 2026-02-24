import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService
  ) {}
  
  @EventPattern('scheduler.request.created') // Make sure Scheduler emits this!
  async handleNewBatch(@Payload() message: any) {
    // message = { request_id: "req-123", size: 450, cost: "0.04 SOL" }
    
    console.log('Received new batch notification:', message);
    
    await this.emailService.sendApprovalEmail(
      message.request_id, 
      message.size || 0,
      message.estimated_gas || 'Unknown'
    );
  }

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


