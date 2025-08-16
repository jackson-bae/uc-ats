-- Migration to backfill existing applications with candidate records
-- This migration ensures all existing applications have associated candidates

-- First, let's create candidates for applications that don't have them
INSERT INTO candidates (
    id,
    studentId,
    firstName,
    lastName,
    email,
    createdAt,
    updatedAt
)
SELECT 
    gen_random_uuid() as id,
    CAST(a.studentId AS INTEGER) as studentId,
    a.firstName,
    a.lastName,
    a.email,
    NOW() as createdAt,
    NOW() as updatedAt
FROM applications a
WHERE a.candidateId IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM candidates c 
      WHERE c.studentId = CAST(a.studentId AS INTEGER)
  );

-- Now update all applications to link them to their candidates
UPDATE applications 
SET candidateId = (
    SELECT c.id 
    FROM candidates c 
    WHERE c.studentId = CAST(applications.studentId AS INTEGER)
)
WHERE candidateId IS NULL;

-- Add a comment to document what this migration did
COMMENT ON TABLE applications IS 
'Applications table - all applications should now have candidateId populated after migration 20250101000002_backfill_existing_applications';
