import { Prisma } from '@prisma/client';
import { BaseSenlerGroup } from './basic-senler-group.dto';

export type SenlerGroupFieldForGetByUniqueField = keyof Pick<
  Prisma.SenlerGroupWhereUniqueInput,
  'id' | 'senlerSign' | 'senlerGroupId'
>;
export const SenlerGroupNumericFieldsForGetByUniqueFields = ['senlerGroupId'];
export enum SenlerGroupFieldForGetByUniqueFieldEnum {
  id = 'id',
  senlerSign = 'senlerSign',
  senlerGroupId = 'senlerGroupId',
}

export type GetSenlerGroupResponse = BaseSenlerGroup;
