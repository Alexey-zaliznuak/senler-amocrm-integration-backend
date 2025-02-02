/*
  Warnings:

  - A unique constraint covering the columns `[amoCrmDomainName]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[senlerAccessToken]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[senlerSign]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SenlerGroup" ADD COLUMN     "senlerSign" TEXT NOT NULL DEFAULT substring(gen_random_uuid()::text from 1 for 32);

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_amoCrmDomainName_key" ON "SenlerGroup"("amoCrmDomainName");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerAccessToken_key" ON "SenlerGroup"("senlerAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerSign_key" ON "SenlerGroup"("senlerSign");
