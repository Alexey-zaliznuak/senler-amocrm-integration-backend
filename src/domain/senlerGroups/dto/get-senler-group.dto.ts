import { Prisma, SenlerIntegrationStepTemplate } from '@prisma/client';
import { BaseSenlerGroup } from './basic-senler-group.dto';

export type SenlerGroupFieldForGetByUniqueField = keyof Pick<Prisma.SenlerGroupWhereUniqueInput, 'id' | 'senlerSign'>;
export enum SenlerGroupFieldForGetByUniqueFieldEnum {
  id = 'id',
  senlerSign = 'senlerSign',
}

export type GetSenlerGroupResponse = BaseSenlerGroup

