import { PrismaClient } from '@prisma/client';
import { existsExtension } from './extensions';

export const prisma = new PrismaClient().$extends(existsExtension);
