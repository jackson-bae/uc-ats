-- AddGroupScopedBehavioralQuestions

-- CreateTable
CREATE TABLE "behavioral_questions" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "behavioral_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "behavioral_questions_interviewId_groupId_idx" ON "behavioral_questions"("interviewId", "groupId");

-- CreateIndex
CREATE INDEX "behavioral_questions_interviewId_idx" ON "behavioral_questions"("interviewId");

-- CreateIndex
CREATE INDEX "behavioral_questions_groupId_idx" ON "behavioral_questions"("groupId");

-- CreateIndex
CREATE INDEX "behavioral_questions_createdBy_idx" ON "behavioral_questions"("createdBy");

-- AddForeignKey
ALTER TABLE "behavioral_questions" ADD CONSTRAINT "behavioral_questions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: groupId field can contain either real group IDs or application group IDs
-- No foreign key constraint on groupId to allow flexibility

-- AddForeignKey
ALTER TABLE "behavioral_questions" ADD CONSTRAINT "behavioral_questions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;