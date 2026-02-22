import { Controller, Post, Body, Get } from '@nestjs/common';
import { EscrowService } from './escrow.service';

@Controller('api/v1/escrow')
export class EscrowController {
  constructor(private readonly svc: EscrowService) {}

  @Get()
  async findAll() {
    return this.svc.findAll();
  }

  @Post('create')
  async create(@Body() body: { beneficiary: string; arbiter: string; amount: number }) {
    return this.svc.createEscrow(body.beneficiary, body.arbiter, body.amount);
  }
}
