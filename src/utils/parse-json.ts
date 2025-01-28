import { BadRequestException } from '@nestjs/common';

export function parseJson(value: any): any {
  try {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  } catch {
    throw new BadRequestException('Invalid JSON string');
  }
}
