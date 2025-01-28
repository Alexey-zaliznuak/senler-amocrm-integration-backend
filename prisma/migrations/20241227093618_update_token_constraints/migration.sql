/*
  Warnings:

  - A unique constraint covering the columns `[amoCrmAccessToken]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[amoCrmRefreshToken]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "SenlerGroup_amoCrmAccessToken_amoCrmRefreshToken_key";

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_amoCrmAccessToken_key" ON "SenlerGroup"("amoCrmAccessToken");

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_amoCrmRefreshToken_key" ON "SenlerGroup"("amoCrmRefreshToken");
