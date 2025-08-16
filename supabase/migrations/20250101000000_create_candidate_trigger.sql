-- Create a function to handle candidate creation from applications
CREATE OR REPLACE FUNCTION create_candidate_from_application()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if a candidate with this studentId already exists
    IF NOT EXISTS (
        SELECT 1 FROM candidates 
        WHERE studentId = CAST(NEW.studentId AS INTEGER)
    ) THEN
        -- Create a new candidate record
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
        );
        
        -- Update the application with the newly created candidate's ID
        NEW.candidateId = (
            SELECT id FROM candidates 
            WHERE studentId = CAST(NEW.studentId AS INTEGER)
        );
    ELSE
        -- Candidate already exists, link the application to the existing candidate
        NEW.candidateId = (
            SELECT id FROM candidates 
            WHERE studentId = CAST(NEW.studentId AS INTEGER)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires before inserting into applications
CREATE TRIGGER trigger_create_candidate_from_application
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION create_candidate_from_application();

-- Add a comment to document the trigger
COMMENT ON FUNCTION create_candidate_from_application() IS 
'Automatically creates a candidate record when a new application is inserted with a studentId that does not exist in the candidates table. Links the application to the candidate (either newly created or existing).';
