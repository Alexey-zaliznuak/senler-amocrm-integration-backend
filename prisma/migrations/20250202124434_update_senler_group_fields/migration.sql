/*
  Warnings:

  - You are about to alter the column `senlerSign` on the `SenlerGroup` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(32)`.
  - A unique constraint covering the columns `[senlerGroupVkId]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SenlerGroup" ADD COLUMN     "senlerGroupVkId" CHAR(32) NOT NULL DEFAULT substring(gen_random_uuid()::text from 1 for 32),
ALTER COLUMN "senlerSign" DROP DEFAULT,
ALTER COLUMN "senlerSign" SET DATA TYPE CHAR(32);

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerGroupVkId_key" ON "SenlerGroup"("senlerGroupVkId");
