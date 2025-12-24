import { Controller, Get } from '@nestjs/common';
@Controller() 
export class HealthController {
  @Get('health')
  checkHealth() {
    return { status: 'ok', service: 'query-service', timestamp: new Date() };
  }
}