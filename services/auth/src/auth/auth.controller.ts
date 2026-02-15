// src/auth/auth.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
//import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';

@Controller('auth')               // combined with global prefix 'api/v1' => /api/v1/auth
export class AuthController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: ExpressRequest) {
    return { user: req.user };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manage-account')   // choose a role that exists in token
  @Get('admin')
  admin(@Req() req: ExpressRequest) {
    return { ok: true, user: req.user };
  }
}
