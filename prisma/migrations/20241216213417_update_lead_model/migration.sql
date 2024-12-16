/*
  Warnings:

  - You are about to drop the column `vkId` on the `Lead` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[senlerSubscriberId,senlerGroupId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amoCrmLeadId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senlerSubscriberId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Lead_vkId_senlerGroupId_key";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "vkId",
ADD COLUMN     "amoCrmLeadId" TEXT NOT NULL,
ADD COLUMN     "senlerSubscriberId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerSubscriberId_senlerGroupId_key" ON "Lead"("senlerSubscriberId", "senlerGroupId");
