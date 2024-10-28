-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "SenlerClientId" TEXT NOT NULL,
    "SenlerGroupId" TEXT NOT NULL,
    "SenlerAuth" TEXT NOT NULL,
    "AmoCrmAuth" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settings" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_SenlerClientId_key" ON "User"("SenlerClientId");

-- CreateIndex
CREATE UNIQUE INDEX "User_SenlerGroupId_key" ON "User"("SenlerGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "User_SenlerAuth_key" ON "User"("SenlerAuth");

-- CreateIndex
CREATE UNIQUE INDEX "User_AmoCrmAuth_key" ON "User"("AmoCrmAuth");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
