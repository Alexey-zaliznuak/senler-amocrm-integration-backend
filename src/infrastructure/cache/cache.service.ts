import { Injectable } from '@nestjs/common';
import { CACHE } from './cache.config';

@Injectable()
export class CacheService {
  public static buildInjectableNameByContext = (context: string) => CACHE + '__' + context;
}
