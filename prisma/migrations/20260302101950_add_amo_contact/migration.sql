-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "amoCrmContactId" INTEGER;

-- CreateIndex
CREATE INDEX "Lead_amoCrmLeadId_amoCrmContactId_idx" ON "Lead"("amoCrmLeadId", "amoCrmContactId");
