-- DropIndex
DROP INDEX "SenlerGroup_senlerGroupVkId_key";

-- AlterTable
ALTER TABLE "SenlerGroup" ALTER COLUMN "senlerGroupVkId" DROP NOT NULL,
ALTER COLUMN "senlerGroupVkId" SET DATA TYPE TEXT;
