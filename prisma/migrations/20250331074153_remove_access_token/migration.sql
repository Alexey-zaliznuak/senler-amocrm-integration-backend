/*
  Warnings:

  - You are about to drop the column `senlerAccessToken` on the `SenlerGroup` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SenlerGroup_senlerAccessToken_key";

-- AlterTable
ALTER TABLE "SenlerGroup" DROP COLUMN "senlerAccessToken";
