-- AlterTable
ALTER TABLE "cover_letter_scores" ADD COLUMN IF NOT EXISTS "cycleId" TEXT;

-- AlterTable
ALTER TABLE "video_scores" ADD COLUMN IF NOT EXISTS "cycleId" TEXT;

-- AddForeignKey
ALTER TABLE "cover_letter_scores" ADD CONSTRAINT "cover_letter_scores_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "recruiting_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_scores" ADD CONSTRAINT "video_scores_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "recruiting_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

