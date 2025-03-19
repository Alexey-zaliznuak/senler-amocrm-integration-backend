import { Injectable } from '@nestjs/common';
import { AXIOS } from './instance';

@Injectable()
export class AxiosService {
  public static buildInjectableNameByContext = (context: string) => AXIOS + '__' + context;
}
