-- Verification script to check the results of the backfill migration
-- Run this after applying the backfill migration to verify everything worked correctly

-- Check how many applications now have candidates
SELECT 
    'Applications with candidates' as check_type,
    COUNT(*) as count
FROM applications 
WHERE candidateId IS NOT NULL

UNION ALL

SELECT 
    'Applications without candidates' as check_type,
    COUNT(*) as count
FROM applications 
WHERE candidateId IS NULL

UNION ALL

SELECT 
    'Total candidates created' as check_type,
    COUNT(*) as count
FROM candidates

UNION ALL

SELECT 
    'Applications per candidate (avg)' as check_type,
    ROUND(AVG(app_count), 2) as count
FROM (
    SELECT c.id, COUNT(a.id) as app_count
    FROM candidates c
    LEFT JOIN applications a ON c.id = a.candidateId
    GROUP BY c.id
) candidate_app_counts;

-- Show a sample of the linked data
SELECT 
    'Sample of linked applications and candidates' as info,
    a.id as application_id,
    a.firstName as app_first_name,
    a.lastName as app_last_name,
    a.studentId as app_student_id,
    c.id as candidate_id,
    c.firstName as candidate_first_name,
    c.lastName as candidate_last_name,
    c.studentId as candidate_student_id
FROM applications a
JOIN candidates c ON a.candidateId = c.id
LIMIT 10;

-- Check for any orphaned applications (should be 0)
SELECT 
    'Orphaned applications (should be 0)' as check_type,
    COUNT(*) as count
FROM applications a
LEFT JOIN candidates c ON a.candidateId = c.id
WHERE c.id IS NULL;
