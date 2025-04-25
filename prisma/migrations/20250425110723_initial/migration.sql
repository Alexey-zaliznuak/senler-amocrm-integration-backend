-- CreateTable
CREATE TABLE "SenlerGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amoCrmDomainName" TEXT NOT NULL,
    "amoCrmAccessToken" TEXT NOT NULL,
    "amoCrmRefreshToken" TEXT NOT NULL,
    "senlerGroupId" INTEGER NOT NULL,
    "vkGroupId" TEXT NOT NULL,
    "senlerApiAccessToken" TEXT NOT NULL,

    CONSTRAINT "SenlerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationStepTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "senlerGroupId" TEXT NOT NULL,

    CONSTRAINT "IntegrationStepTemplate_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "SenlerGroup_vkGroupId_key" ON "SenlerGroup"("vkGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerApiAccessToken_key" ON "SenlerGroup"("senlerApiAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerLeadId_key" ON "Lead"("senlerLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerLeadId_senlerGroupId_key" ON "Lead"("senlerLeadId", "senlerGroupId");

-- AddForeignKey
ALTER TABLE "IntegrationStepTemplate" ADD CONSTRAINT "IntegrationStepTemplate_senlerGroupId_fkey" FOREIGN KEY ("senlerGroupId") REFERENCES "SenlerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_senlerGroupId_fkey" FOREIGN KEY ("senlerGroupId") REFERENCES "SenlerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
