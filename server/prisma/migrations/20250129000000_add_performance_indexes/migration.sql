-- Add performance indexes for staging page queries

-- Index for candidateId lookups in scores tables
CREATE INDEX IF NOT EXISTS "idx_resume_scores_candidate_id" ON "ResumeScore"("candidateId");
CREATE INDEX IF NOT EXISTS "idx_cover_letter_scores_candidate_id" ON "CoverLetterScore"("candidateId");
CREATE INDEX IF NOT EXISTS "idx_video_scores_candidate_id" ON "VideoScore"("candidateId");

-- Index for studentId lookups in meeting signups
CREATE INDEX IF NOT EXISTS "idx_meeting_signup_student_id_attended" ON "MeetingSignup"("studentId", "attended");

-- Index for candidateId lookups in event attendance
CREATE INDEX IF NOT EXISTS "idx_event_attendance_candidate_id" ON "EventAttendance"("candidateId");

-- Index for assignedGroupId lookups in candidates
CREATE INDEX IF NOT EXISTS "idx_candidate_assigned_group_id" ON "Candidate"("assignedGroupId");

-- Index for cycleId lookups in applications
CREATE INDEX IF NOT EXISTS "idx_application_cycle_id" ON "Application"("cycleId");

-- Composite index for application queries with cycleId and status
CREATE INDEX IF NOT EXISTS "idx_application_cycle_status" ON "Application"("cycleId", "status");

-- Index for submittedAt ordering
CREATE INDEX IF NOT EXISTS "idx_application_submitted_at" ON "Application"("submittedAt" DESC);
