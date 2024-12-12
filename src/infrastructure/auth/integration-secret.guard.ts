import { CanActivate, ExecutionContext, Inject, Injectable, Request } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppConfigType } from '../config/config.app-config';
import { CONFIG } from '../config/config.module';

@Injectable()
export class IntegrationSecretGuard implements CanActivate {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfigType,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const integrationSecret = context.switchToHttp().getRequest<Request>().headers["x-integration-secret"]

    return integrationSecret === this.config.INTEGRATION_SECRET;
  }
}
