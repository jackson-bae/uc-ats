-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MEMBER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "profileImage" TEXT;
