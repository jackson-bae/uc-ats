-- AlterTable
ALTER TABLE "events" ADD COLUMN "showToCandidates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "memberRsvpUrl" TEXT;
