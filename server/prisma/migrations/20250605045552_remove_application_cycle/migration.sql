/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the column `cycleId` on the `tasks` table. All the data in the column will be lost.
  - You are about to drop the `application_cycles` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "approved" BOOLEAN,
ADD COLUMN     "currentRound" TEXT,
ALTER COLUMN "resumeUrl" DROP NOT NULL,
ALTER COLUMN "headshotUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "assignedTo",
DROP COLUMN "cycleId";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- DropTable
DROP TABLE "application_cycles";

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "resume" TEXT,
    "video" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cover_letter" TEXT,
    "applicant" TEXT,
    "user" TEXT,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
