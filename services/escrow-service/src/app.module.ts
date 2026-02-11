import { Module } from '@nestjs/common';
import { EscrowModule } from './escrow/escrow.module';
import { EventsListener } from './events/listener';

@Module({
  imports: [EscrowModule],
  providers: [EventsListener],
})
export class AppModule {}
