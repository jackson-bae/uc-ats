-- AlterTable
ALTER TABLE "recruiting_cycles" ADD COLUMN IF NOT EXISTS "resumeDeadline" TEXT,
ADD COLUMN IF NOT EXISTS "coverLetterDeadline" TEXT,
ADD COLUMN IF NOT EXISTS "videoDeadline" TEXT;

