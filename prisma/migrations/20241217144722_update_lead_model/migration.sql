/*
  Warnings:

  - You are about to drop the column `senlerSubscriberId` on the `Lead` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[senlerLeadId,senlerGroupId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `senlerLeadId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Lead_senlerSubscriberId_senlerGroupId_key";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "senlerSubscriberId",
ADD COLUMN     "senlerLeadId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerLeadId_senlerGroupId_key" ON "Lead"("senlerLeadId", "senlerGroupId");
