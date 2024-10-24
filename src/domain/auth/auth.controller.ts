import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
  }

  @Post("*")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    console.log(body)
    return "ok"
  }
}

