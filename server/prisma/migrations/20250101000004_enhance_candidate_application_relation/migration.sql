-- Migration to enhance candidate-application relationship
-- This migration ensures all applications are properly linked to candidates

-- First, let's create a function to ensure all applications have candidates
CREATE OR REPLACE FUNCTION ensure_application_candidate_link()
RETURNS TRIGGER AS $$
BEGIN
    -- If the application doesn't have a candidateId, try to find or create one
    IF NEW.candidateId IS NULL THEN
        -- Try to find existing candidate by studentId
        SELECT id INTO NEW.candidateId
        FROM candidates 
        WHERE studentId = CAST(NEW.studentId AS INTEGER);
        
        -- If no candidate found, create one
        IF NEW.candidateId IS NULL THEN
            INSERT INTO candidates (
                id,
                studentId,
                firstName,
                lastName,
                email,
                createdAt,
                updatedAt
            ) VALUES (
                gen_random_uuid(),
                CAST(NEW.studentId AS INTEGER),
                NEW.firstName,
                NEW.lastName,
                NEW.email,
                NOW(),
                NOW()
            )
            RETURNING id INTO NEW.candidateId;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically link applications to candidates
CREATE TRIGGER trigger_ensure_application_candidate_link
    BEFORE INSERT OR UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION ensure_application_candidate_link();

-- Add a comment to document the trigger
COMMENT ON FUNCTION ensure_application_candidate_link() IS 
'Ensures every application is linked to a candidate. Creates candidate if one does not exist for the studentId.';

-- Create an index to improve query performance for candidate lookups
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidateId);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(studentId);

-- Add a constraint to ensure candidateId is not null after linking
-- Note: We'll add this after ensuring all existing applications have candidates
ALTER TABLE applications 
ADD CONSTRAINT applications_candidate_id_not_null 
CHECK (candidateId IS NOT NULL);

-- Add a foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'applications_candidate_id_fkey'
    ) THEN
        ALTER TABLE applications 
        ADD CONSTRAINT applications_candidate_id_fkey 
        FOREIGN KEY (candidateId) REFERENCES candidates(id) ON DELETE CASCADE;
    END IF;
END $$;
