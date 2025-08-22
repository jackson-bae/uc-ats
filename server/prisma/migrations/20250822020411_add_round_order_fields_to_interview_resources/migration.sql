/*
  Warnings:

  - Added the required column `round` to the `interview_resources` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "interview_resources" ADD COLUMN     "hasExternalLink" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT 'book',
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "round" TEXT NOT NULL,
ALTER COLUMN "type" DROP NOT NULL;
