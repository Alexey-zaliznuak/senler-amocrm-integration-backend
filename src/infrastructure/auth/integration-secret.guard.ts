import { CanActivate, ExecutionContext, Inject, Injectable, Request } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';

@Injectable()
export class IntegrationSecretGuard implements CanActivate {
  constructor(@Inject(CONFIG) private readonly config: AppConfigType) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const integrationSecretInHeaders = context.switchToHttp().getRequest<Request>().headers['x-integration-secret'];
    const integrationSecretInBody = context.switchToHttp().getRequest<Request>().body['integrationSecret'];

    return (
      integrationSecretInHeaders === this.config.INTEGRATION_SECRET || integrationSecretInBody === this.config.INTEGRATION_SECRET
    );
  }
}
