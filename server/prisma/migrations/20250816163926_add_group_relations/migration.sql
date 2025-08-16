-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "assignedGroupId" TEXT;

-- AddForeignKey
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_memberOne_fkey" FOREIGN KEY ("memberOne") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_memberTwo_fkey" FOREIGN KEY ("memberTwo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_memberThree_fkey" FOREIGN KEY ("memberThree") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
