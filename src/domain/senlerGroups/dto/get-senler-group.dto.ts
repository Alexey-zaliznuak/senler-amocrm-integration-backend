import { Prisma } from '@prisma/client';
import { BaseSenlerGroup } from './basic-senler-group.dto';

export type SenlerGroupFieldForGetByUniqueField = keyof Pick<
  Prisma.SenlerGroupWhereUniqueInput,
  'id' | 'senlerGroupId'
>;
export const SenlerGroupNumericFieldsForGetByUniqueFields = ['senlerGroupId'];
export enum SenlerGroupFieldForGetByUniqueFieldEnum {
  id = 'id',
  senlerGroupId = 'senlerGroupId',
}

export type GetSenlerGroupResponse = BaseSenlerGroup;
