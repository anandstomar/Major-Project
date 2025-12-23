// src/anchors/anchors.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { AnchorsService } from './anchors.service';

@Controller('api/anchors')
export class AnchorsController {
  constructor(private readonly svc: AnchorsService) {}

  @Get()
  async all() {
    return this.svc.findAll();
  }

  @Get(':requestId')
  async byRequestId(@Param('requestId') requestId: string) {
    return this.svc.findByRequestId(requestId);
  }
}
