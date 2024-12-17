-- CreateTable
CREATE TABLE "SenlerGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senlerGroupId" TEXT NOT NULL,

    CONSTRAINT "SenlerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senlerGroupId" TEXT NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerGroupId_key" ON "SenlerGroup"("senlerGroupId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_senlerGroupId_fkey" FOREIGN KEY ("senlerGroupId") REFERENCES "SenlerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
