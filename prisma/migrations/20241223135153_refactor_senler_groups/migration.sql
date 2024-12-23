/*
  Warnings:

  - You are about to drop the column `senlerGroupId` on the `SenlerGroup` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[senlerVkGroupId]` on the table `SenlerGroup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amoCrmAccessToken` to the `SenlerGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amoCrmDomainName` to the `SenlerGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amoCrmRefreshToken` to the `SenlerGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senlerAccessToken` to the `SenlerGroup` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senlerVkGroupId` to the `SenlerGroup` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SenlerIntegrationStepTemplate" DROP CONSTRAINT "SenlerIntegrationStepTemplate_userId_fkey";

-- DropIndex
DROP INDEX "SenlerGroup_senlerGroupId_key";

-- AlterTable
ALTER TABLE "SenlerGroup" DROP COLUMN "senlerGroupId",
ADD COLUMN     "amoCrmAccessToken" TEXT NOT NULL,
ADD COLUMN     "amoCrmDomainName" TEXT NOT NULL,
ADD COLUMN     "amoCrmRefreshToken" TEXT NOT NULL,
ADD COLUMN     "senlerAccessToken" TEXT NOT NULL,
ADD COLUMN     "senlerVkGroupId" TEXT NOT NULL;

-- DropTable
DROP TABLE "User";

-- CreateIndex
CREATE UNIQUE INDEX "SenlerGroup_senlerVkGroupId_key" ON "SenlerGroup"("senlerVkGroupId");

-- AddForeignKey
ALTER TABLE "SenlerIntegrationStepTemplate" ADD CONSTRAINT "SenlerIntegrationStepTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SenlerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
