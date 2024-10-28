import { User } from '@prisma/client';
import { UUID } from 'crypto';
import { Request as ExpressRequest } from 'express';
import { Logger } from 'winston';


export interface CustomRequest extends ExpressRequest {
  id: UUID;
  logger: Logger;
  startTime: number;
}

export interface AuthorizedRequest extends CustomRequest {
  user: User
}
