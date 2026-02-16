import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { RolesGuard } from './roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { AuthService } from './auth.service';

@Controller('auth') // combined with global prefix 'api/v1' => /api/v1/auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.registerUser(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: ExpressRequest) {
    return { user: req.user };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manage-account') 
  @Get('admin')
  admin(@Req() req: ExpressRequest) {
    return { ok: true, user: req.user };
  }
}