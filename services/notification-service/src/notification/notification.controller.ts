import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';

@Controller('api/v1/notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService
  ) {}

  // ------------------------------------------
  // 🟢 Kafka Listeners (Triggered by Microservice)
  // ------------------------------------------

  // 1. New "Human-in-the-Loop" Approval (From Scheduler)
  @EventPattern('scheduler.request.created')
  async handleApprovalRequest(@Payload() message: any) {
    console.log('📧 Approval Required:', message);
    await this.emailService.sendApprovalEmail(
      message.request_id, 
      message.size, 
      message.estimated_gas
    );
  }

  // 2. Anchor Confirmation (From Anchor Service / Spark)
  @EventPattern('anchors.completed')
  async handleAnchorComplete(@Payload() message: any) {
    console.log('✅ Anchor Complete:', message.request_id);
    await this.notificationService.processAnchorEvent(message);
  }


  @Get('feed')
  getFeed() {
    return this.notificationService.getFeed();
  }

  @Get('health')
  checkHealth() {
    return { status: 'OK', timestamp: new Date() };
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


