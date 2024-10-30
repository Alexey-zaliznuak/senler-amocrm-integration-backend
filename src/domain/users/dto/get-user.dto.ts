import { SenlerIntegrationStepTemplate } from "@prisma/client";
import { BaseUser } from "./basic-user.dto";

export type GetUserResponse = BaseUser & {
  senlerIntegrationStepsTemplates: SenlerIntegrationStepTemplate[];
}
