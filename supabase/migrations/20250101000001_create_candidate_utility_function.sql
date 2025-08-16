-- Create a utility function to ensure a candidate exists
-- This can be called manually or from other triggers/functions
CREATE OR REPLACE FUNCTION ensure_candidate_exists(
    p_studentId INTEGER,
    p_firstName TEXT,
    p_lastName TEXT,
    p_email TEXT
)
RETURNS UUID AS $$
DECLARE
    candidate_id UUID;
BEGIN
    -- Check if candidate already exists
    SELECT id INTO candidate_id
    FROM candidates 
    WHERE studentId = p_studentId;
    
    -- If candidate doesn't exist, create one
    IF candidate_id IS NULL THEN
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
            p_studentId,
            p_firstName,
            p_lastName,
            p_email,
            NOW(),
            NOW()
        )
        RETURNING id INTO candidate_id;
        
        RAISE NOTICE 'Created new candidate with ID: % for studentId: %', candidate_id, p_studentId;
    ELSE
        RAISE NOTICE 'Candidate already exists with ID: % for studentId: %', candidate_id, p_studentId;
    END IF;
    
    RETURN candidate_id;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to document the function
COMMENT ON FUNCTION ensure_candidate_exists(INTEGER, TEXT, TEXT, TEXT) IS 
'Utility function to ensure a candidate exists. Returns the candidate ID (either existing or newly created). Can be called manually or from other functions/triggers.';

-- Create a function to get or create candidate by studentId only
-- This is useful when you only have the studentId and want to ensure a candidate record exists
CREATE OR REPLACE FUNCTION get_or_create_candidate_by_student_id(p_studentId INTEGER)
RETURNS UUID AS $$
DECLARE
    candidate_id UUID;
BEGIN
    -- Check if candidate already exists
    SELECT id INTO candidate_id
    FROM candidates 
    WHERE studentId = p_studentId;
    
    -- If candidate doesn't exist, create one with minimal data
    IF candidate_id IS NULL THEN
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
            p_studentId,
            'Unknown',  -- Default firstName
            'Unknown',  -- Default lastName
            'unknown@example.com',  -- Default email
            NOW(),
            NOW()
        )
        RETURNING id INTO candidate_id;
        
        RAISE NOTICE 'Created new candidate with ID: % for studentId: % (with default values)', candidate_id, p_studentId;
    END IF;
    
    RETURN candidate_id;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to document the function
COMMENT ON FUNCTION get_or_create_candidate_by_student_id(INTEGER) IS 
'Gets or creates a candidate by studentId only. If candidate does not exist, creates one with default values. Returns the candidate ID.';
