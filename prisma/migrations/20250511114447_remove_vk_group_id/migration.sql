/*
  Warnings:

  - You are about to drop the column `vkGroupId` on the `SenlerGroup` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SenlerGroup_vkGroupId_key";

-- AlterTable
ALTER TABLE "SenlerGroup" DROP COLUMN "vkGroupId";
