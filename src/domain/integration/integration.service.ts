import { Injectable } from '@nestjs/common';
import { prisma } from 'src/infrastructure/database';

@Injectable()
export class IntegrationService {
    constructor() {}

    async test() {
        await prisma.lead.findUnique()
    }
}
