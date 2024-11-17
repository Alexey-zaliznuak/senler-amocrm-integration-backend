import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigType } from './config.app-config';


@Injectable()
export class CustomConfig {
  constructor(private readonly configService: ConfigService<AppConfigType>) {}

  get proxy() {
    return new Proxy(
      this.configService,
      {
        get: (target, property: string) => {
          if (property in target) {
            return target[property];
          }
          throw new Error(`Configuration property "${property}" not found.`);
        },
      });
  }
}
