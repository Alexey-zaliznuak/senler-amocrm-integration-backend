/*
  Warnings:

  - Changed the type of `amoCrmLeadId` on the `Lead` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `senlerLeadId` on the `Lead` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "amoCrmLeadId",
ADD COLUMN     "amoCrmLeadId" INTEGER NOT NULL,
DROP COLUMN "senlerLeadId",
ADD COLUMN     "senlerLeadId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerLeadId_senlerGroupId_key" ON "Lead"("senlerLeadId", "senlerGroupId");
