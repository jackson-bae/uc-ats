/*
  Warnings:

  - You are about to drop the `tasks` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `majorGpa` on table `applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `resumeUrl` on table `applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `headshotUrl` on table `applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rawResponses` on table `applications` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_applicationId_fkey";

-- AlterTable
ALTER TABLE "applications" ALTER COLUMN "majorGpa" SET NOT NULL,
ALTER COLUMN "resumeUrl" SET NOT NULL,
ALTER COLUMN "headshotUrl" SET NOT NULL,
ALTER COLUMN "rawResponses" SET NOT NULL;

-- DropTable
DROP TABLE "tasks";
