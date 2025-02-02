-- CreateTable
CREATE TABLE "SenlerGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amoCrmDomainName" TEXT NOT NULL,
    "amoCrmAccessToken" TEXT NOT NULL,
    "amoCrmRefreshToken" TEXT NOT NULL,
    "senlerGroupId" TEXT NOT NULL,
    "senlerGroupVkId" CHAR(32) NOT NULL,
    "senlerAccessToken" TEXT NOT NULL,
    "senlerSign" CHAR(32) NOT NULL,

    CONSTRAINT "SenlerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenlerIntegrationStepTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settings" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SenlerIntegrationStepTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amoCrmLeadId" INTEGER NOT NULL,
    "senlerLeadId" TEXT NOT NULL,
    "senlerGroupId" TEXT NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_amoCrmDomainName_key" ON "SenlerGroup"("amoCrmDomainName");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_amoCrmAccessToken_key" ON "SenlerGroup"("amoCrmAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_amoCrmRefreshToken_key" ON "SenlerGroup"("amoCrmRefreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerGroupId_key" ON "SenlerGroup"("senlerGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerGroupVkId_key" ON "SenlerGroup"("senlerGroupVkId");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerAccessToken_key" ON "SenlerGroup"("senlerAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerSign_key" ON "SenlerGroup"("senlerSign");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerLeadId_key" ON "Lead"("senlerLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerLeadId_senlerGroupId_key" ON "Lead"("senlerLeadId", "senlerGroupId");

-- AddForeignKey
ALTER TABLE "SenlerIntegrationStepTemplate" ADD CONSTRAINT "SenlerIntegrationStepTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SenlerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_senlerGroupId_fkey" FOREIGN KEY ("senlerGroupId") REFERENCES "SenlerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
