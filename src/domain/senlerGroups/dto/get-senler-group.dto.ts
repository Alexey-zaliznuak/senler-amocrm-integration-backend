import { SenlerIntegrationStepTemplate } from '@prisma/client';
import { BaseSenlerGroup } from './basic-senler-group.dto';

export type GetSenlerGroupResponse = BaseSenlerGroup & {
  senlerIntegrationStepsTemplates: SenlerIntegrationStepTemplate[];
};
