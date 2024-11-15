/*
  Warnings:

  - You are about to drop the column `amoAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `amoRefreshToken` on the `User` table. All the data in the column will be lost.
  - Added the required column `amoCrmAccessToken` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amoCrmRefreshToken` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "amoAccessToken",
DROP COLUMN "amoRefreshToken",
ADD COLUMN     "amoCrmAccessToken" TEXT NOT NULL,
ADD COLUMN     "amoCrmRefreshToken" TEXT NOT NULL;
