-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "candidateId" TEXT;

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "score" INTEGER NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coffeeChatId" TEXT,
    "roundOneId" TEXT,
    "roundTwoId" TEXT,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "memberOne" TEXT,
    "memberTwo" TEXT,
    "memberThree" TEXT,
    "avgScore" DECIMAL(5,2),
    "cycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_scores" (
    "id" TEXT NOT NULL,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "scoreOne" INTEGER,
    "scoreTwo" INTEGER,
    "scoreThree" INTEGER,
    "notesOne" TEXT,
    "notesTwo" TEXT,
    "notesThree" TEXT,
    "adminScore" DECIMAL(5,2),
    "adminNotes" TEXT,
    "status" TEXT,
    "candidateId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "assignedGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cover_letter_scores" (
    "id" TEXT NOT NULL,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "scoreOne" INTEGER,
    "scoreTwo" INTEGER,
    "scoreThree" INTEGER,
    "notesOne" TEXT,
    "notesTwo" TEXT,
    "notesThree" TEXT,
    "adminScore" DECIMAL(5,2),
    "adminNotes" TEXT,
    "status" TEXT,
    "candidateId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "assignedGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cover_letter_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_scores" (
    "id" TEXT NOT NULL,
    "overallScore" DECIMAL(5,2) NOT NULL,
    "scoreOne" INTEGER,
    "scoreTwo" INTEGER,
    "scoreThree" INTEGER,
    "notesOne" TEXT,
    "notesTwo" TEXT,
    "notesThree" TEXT,
    "adminScore" DECIMAL(5,2),
    "adminNotes" TEXT,
    "status" TEXT,
    "candidateId" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "assignedGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventStartDate" TIMESTAMP(3) NOT NULL,
    "eventEndDate" TIMESTAMP(3) NOT NULL,
    "eventLocation" TEXT,
    "rsvpForm" TEXT,
    "attendanceForm" TEXT,
    "cycleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvp" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendance" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coffee_chat" (
    "id" TEXT NOT NULL,
    "mentorName" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "overallScore" DECIMAL(5,2),
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coffee_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_one" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "feedback" TEXT,
    "overallScore" DECIMAL(5,2),
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_one_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_two" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "feedback" TEXT,
    "overallScore" DECIMAL(5,2),
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_two_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrerName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_studentId_key" ON "candidates"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvp_responseId_key" ON "event_rsvp"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendance_responseId_key" ON "event_attendance"("responseId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_coffeeChatId_fkey" FOREIGN KEY ("coffeeChatId") REFERENCES "coffee_chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_roundOneId_fkey" FOREIGN KEY ("roundOneId") REFERENCES "round_one"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_roundTwoId_fkey" FOREIGN KEY ("roundTwoId") REFERENCES "round_two"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "recruiting_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_scores" ADD CONSTRAINT "resume_scores_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_scores" ADD CONSTRAINT "resume_scores_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_scores" ADD CONSTRAINT "resume_scores_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letter_scores" ADD CONSTRAINT "cover_letter_scores_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letter_scores" ADD CONSTRAINT "cover_letter_scores_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cover_letter_scores" ADD CONSTRAINT "cover_letter_scores_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_scores" ADD CONSTRAINT "video_scores_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_scores" ADD CONSTRAINT "video_scores_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_scores" ADD CONSTRAINT "video_scores_assignedGroupId_fkey" FOREIGN KEY ("assignedGroupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "recruiting_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendance" ADD CONSTRAINT "event_attendance_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coffee_chat" ADD CONSTRAINT "coffee_chat_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_one" ADD CONSTRAINT "round_one_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_two" ADD CONSTRAINT "round_two_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
