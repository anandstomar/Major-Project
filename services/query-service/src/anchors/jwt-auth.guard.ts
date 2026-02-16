import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (info instanceof Error) {
      this.logger.error(`JWT Validation failed: ${info.message}`);
    } else if (info) {
      this.logger.error(`JWT Validation info: ${info}`);
    }

    if (err) {
      this.logger.error(`JWT Validation error: ${err}`);
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication failed');
    }
    
    return user;
  }
}