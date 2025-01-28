/*
  Warnings:

  - You are about to drop the column `senlerVkGroupId` on the `SenlerGroup` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[senlerGroupId]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `senlerGroupId` to the `SenlerGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SenlerGroup_senlerVkGroupId_key";

-- AlterTable
ALTER TABLE "SenlerGroup" DROP COLUMN "senlerVkGroupId",
ADD COLUMN     "senlerGroupId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerGroupId_key" ON "SenlerGroup"("senlerGroupId");
