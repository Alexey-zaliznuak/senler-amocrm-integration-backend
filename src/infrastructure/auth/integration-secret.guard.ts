import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class IntegrationSecretGuard implements CanActivate {
  constructor(@Inject(CONFIG) private readonly config: AppConfigType) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const integrationSecretInHeaders = request.headers ? request.headers['x-integration-secret'] : undefined;
    const integrationSecretInBody = request.body ? request.body['integrationSecret'] : undefined;

    return true
    // return integrationSecretInHeaders === this.config.INTEGRATION_SECRET || integrationSecretInBody === this.config.INTEGRATION_SECRET;
  }
}
