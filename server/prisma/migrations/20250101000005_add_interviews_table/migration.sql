-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "maxCandidates" INTEGER,
    "description" TEXT,
    "cycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interviews_cycleId_idx" ON "interviews"("cycleId");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "recruiting_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
