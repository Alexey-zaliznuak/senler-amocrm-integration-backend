/*
  Warnings:

  - You are about to drop the column `AmoAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `AmoRefreshToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `SenlerAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `SenlerVkGroupId` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[senlerVkGroupId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amoAccessToken` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amoRefreshToken` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senlerAccessToken` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senlerVkGroupId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_SenlerVkGroupId_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "AmoAccessToken",
DROP COLUMN "AmoRefreshToken",
DROP COLUMN "SenlerAccessToken",
DROP COLUMN "SenlerVkGroupId",
ADD COLUMN     "amoAccessToken" TEXT NOT NULL,
ADD COLUMN     "amoRefreshToken" TEXT NOT NULL,
ADD COLUMN     "senlerAccessToken" TEXT NOT NULL,
ADD COLUMN     "senlerVkGroupId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_senlerVkGroupId_key" ON "User"("senlerVkGroupId");
