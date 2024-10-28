import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Logger } from 'winston';
import { LOGGER } from 'src/infrastructure/logging/logging.module';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(LOGGER) private readonly logger: Logger
  ) {}

  @Post("*")
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: any) {
    this.logger.info(body)
    return "ok"
  }

  @Get("*")
  @HttpCode(HttpStatus.CREATED)
  async get() {
    this.logger.info("hehehhehe")
    return "hehehehehe"
  }
}
