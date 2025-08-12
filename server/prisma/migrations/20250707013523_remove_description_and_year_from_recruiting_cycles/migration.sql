/*
  Warnings:

  - You are about to drop the column `description` on the `recruiting_cycles` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `recruiting_cycles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "recruiting_cycles" DROP COLUMN "description",
DROP COLUMN "year";
