/*
  Warnings:

  - A unique constraint covering the columns `[vkId,senlerGroupId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vkId` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "vkId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_vkId_senlerGroupId_key" ON "Lead"("vkId", "senlerGroupId");
