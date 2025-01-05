import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("ping")
  async ping() {
    const delay = Math.random() * 1000;

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("pong");
      }, delay);
  })
  }
}
