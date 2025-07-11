/*
  Warnings:

  - You are about to drop the column `amoCrmAccessToken` on the `SenlerGroup` table. All the data in the column will be lost.
  - You are about to drop the column `amoCrmDomainName` on the `SenlerGroup` table. All the data in the column will be lost.
  - You are about to drop the column `amoCrmRateLimit` on the `SenlerGroup` table. All the data in the column will be lost.
  - You are about to drop the column `amoCrmRefreshToken` on the `SenlerGroup` table. All the data in the column will be lost.
  - Added the required column `amoCrmProfileId` to the `SenlerGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SenlerGroup_amoCrmAccessToken_key";

-- DropIndex
DROP INDEX "SenlerGroup_amoCrmDomainName_key";

-- DropIndex
DROP INDEX "SenlerGroup_amoCrmRefreshToken_key";

-- AlterTable
ALTER TABLE "SenlerGroup" DROP COLUMN "amoCrmAccessToken",
DROP COLUMN "amoCrmDomainName",
DROP COLUMN "amoCrmRateLimit",
DROP COLUMN "amoCrmRefreshToken",
ADD COLUMN     "amoCrmProfileId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AmoCrmProfile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "domainName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "rateLimit" INTEGER NOT NULL DEFAULT 7,

    CONSTRAINT "AmoCrmProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmoCrmProfile_domainName_key" ON "AmoCrmProfile"("domainName");

-- CreateIndex
CREATE UNIQUE INDEX "AmoCrmProfile_accessToken_key" ON "AmoCrmProfile"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "AmoCrmProfile_refreshToken_key" ON "AmoCrmProfile"("refreshToken");

-- AddForeignKey
ALTER TABLE "SenlerGroup" ADD CONSTRAINT "SenlerGroup_amoCrmProfileId_fkey" FOREIGN KEY ("amoCrmProfileId") REFERENCES "AmoCrmProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
