import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { EscrowService } from './escrow.service';

@Controller('api/v1/escrow')
export class EscrowController {
  constructor(private readonly svc: EscrowService) {}

  @Get()
  async findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post('create')
  async create(@Body() body: { beneficiary: string; arbiter: string; amount: number }) {
    return this.svc.createEscrow(body.beneficiary, body.arbiter, body.amount);
  }

  @Post(':id/resolve')
  async resolve(@Param('id') id: string) {
    const walletPath = process.env.WALLET_KEYPATH || '/keys/escrow-fee-payer.json';
    return this.svc.releaseEscrow(id, walletPath);
  }

  @Post(':id/dispute')
  async dispute(@Param('id') id: string) {
    return this.svc.raiseDispute(id);
  }

  @Post(':id/notify')
  async notify(@Param('id') id: string) {
    return this.svc.notifyParties(id);
  }

  @Post(':id/sync')
  async syncStatus(
    @Param('id') id: string, 
    @Body() body: { status: string; txSig: string }
  ) {
    return this.svc.syncEscrowStatus(id, body.status, body.txSig);
  }
}