/*
  Warnings:

  - You are about to drop the column `SenlerRefreshToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Template` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Template" DROP CONSTRAINT "Template_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "SenlerRefreshToken";

-- DropTable
DROP TABLE "Template";

-- CreateTable
CREATE TABLE "SenlerIntegrationStepTemplate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settings" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "SenlerIntegrationStepTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SenlerIntegrationStepTemplate" ADD CONSTRAINT "SenlerIntegrationStepTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
