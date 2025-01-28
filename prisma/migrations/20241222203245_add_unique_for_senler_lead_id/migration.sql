/*
  Warnings:

  - A unique constraint covering the columns `[senlerLeadId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Lead_senlerLeadId_key" ON "Lead"("senlerLeadId");
