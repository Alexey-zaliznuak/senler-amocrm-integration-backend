/*
  Warnings:

  - A unique constraint covering the columns `[amoCrmAccessToken,amoCrmRefreshToken]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_amoCrmAccessToken_amoCrmRefreshToken_key" ON "SenlerGroup"("amoCrmAccessToken", "amoCrmRefreshToken");
