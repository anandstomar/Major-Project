import { Controller, Get, Param, UseGuards, NotFoundException, Post, Body } from '@nestjs/common';
import { AnchorsService } from './anchors.service';
import { JwtAuthGuard } from './jwt-auth.guard'; 

@Controller('api/query/anchors') 
@UseGuards(JwtAuthGuard) 
export class AnchorsController {
  constructor(private readonly svc: AnchorsService) {}

  @Get()
  async all() {
    const data = await this.svc.findAll();
    return { items: data, total: data.length };
  }

  @Get(':requestId')
  async byRequestId(@Param('requestId') requestId: string) {
    const item = await this.svc.findByRequestId(requestId);
    if (!item) {
      throw new NotFoundException(`Anchor ${requestId} not found`);
    }
    return { item };
  }

  @Post('seed')
  async seedTestAnchor(@Body() body: any) {
    if (!body.submittedAt) body.submittedAt = new Date().toISOString();
    return this.svc.createAnchor(body);
  }
}








// // src/anchors/anchors.controller.ts
// import { Controller, Get, Param } from '@nestjs/common';
// import { AnchorsService } from './anchors.service';

// @Controller('api/anchors')
// export class AnchorsController {
//   constructor(private readonly svc: AnchorsService) {}

//   @Get()
//   async all() {
//     return this.svc.findAll();
//   }

//   @Get(':requestId')
//   async byRequestId(@Param('requestId') requestId: string) {
//     return this.svc.findByRequestId(requestId);
//   }
// }
