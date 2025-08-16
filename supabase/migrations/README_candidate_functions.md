# Candidate Creation Functions and Triggers

This document describes the database functions and triggers that automatically handle candidate creation in the UC ATS system.

## Overview

The system includes several functions and triggers that ensure candidate records are automatically created when needed, preventing orphaned applications and maintaining data integrity.

## Functions

### 1. `create_candidate_from_application()`

**Purpose**: Trigger function that automatically creates a candidate when a new application is inserted.

**How it works**:
- Fires BEFORE INSERT on the `applications` table
- Checks if a candidate with the same `studentId` already exists
- If not, creates a new candidate record using data from the application
- Links the application to the candidate (either existing or newly created)

**Usage**: This function is automatically called by the trigger - no manual intervention needed.

### 2. `ensure_candidate_exists(p_studentId, p_firstName, p_lastName, p_email)`

**Purpose**: Utility function to manually ensure a candidate exists with complete information.

**Parameters**:
- `p_studentId` (INTEGER): The student ID
- `p_firstName` (TEXT): First name
- `p_lastName` (TEXT): Last name  
- `p_email` (TEXT): Email address

**Returns**: UUID of the candidate (either existing or newly created)

**Usage Example**:
```sql
-- Call the function to ensure a candidate exists
SELECT ensure_candidate_exists(12345, 'John', 'Doe', 'john.doe@example.com');
```

### 3. `get_or_create_candidate_by_student_id(p_studentId)`

**Purpose**: Creates a candidate with default values when you only have the studentId.

**Parameters**:
- `p_studentId` (INTEGER): The student ID

**Returns**: UUID of the candidate (either existing or newly created with default values)

**Usage Example**:
```sql
-- Create a candidate with default values
SELECT get_or_create_candidate_by_student_id(12345);
```

## Triggers

### `trigger_create_candidate_from_application`

**Purpose**: Automatically triggers candidate creation when applications are inserted.

**When it fires**: BEFORE INSERT on the `applications` table

**What it does**: 
- Calls `create_candidate_from_application()` function
- Ensures every application is linked to a candidate record

## Migration Files

1. `20250101000000_create_candidate_trigger.sql` - Creates the main trigger and function
2. `20250101000001_create_candidate_utility_function.sql` - Creates utility functions
3. `20250101000002_backfill_existing_applications.sql` - Backfills existing applications with candidate records
4. `20250101000003_verify_backfill.sql` - Verification script to check backfill results

## How to Apply

To apply these functions and triggers to your database:

1. **For Supabase**: The migration files will be applied automatically when you run:
   ```bash
   supabase db push
   ```

2. **For manual application**: Run the SQL files in order:
   ```bash
   psql -d your_database -f supabase/migrations/20250101000000_create_candidate_trigger.sql
   psql -d your_database -f supabase/migrations/20250101000001_create_candidate_utility_function.sql
   psql -d your_database -f supabase/migrations/20250101000002_backfill_existing_applications.sql
   ```

## Testing

You can test the functions manually:

```sql
-- Test the utility function
SELECT ensure_candidate_exists(99999, 'Test', 'User', 'test@example.com');

-- Test the studentId-only function
SELECT get_or_create_candidate_by_student_id(88888);

-- Verify candidates were created
SELECT * FROM candidates WHERE studentId IN (99999, 88888);
```

## Backfill Existing Data

To process existing applications and create candidates for them:

1. **Apply the backfill migration**:
   ```bash
   supabase db push
   ```
   This will automatically run the backfill migration.

2. **Verify the results** by running the verification script:
   ```sql
   -- Run this in your database to check results
   \i supabase/migrations/20250101000003_verify_backfill.sql
   ```

The backfill migration will:
- Create candidate records for all applications that don't have them
- Link existing applications to their corresponding candidates
- Handle duplicate studentIds by creating one candidate per studentId
- Preserve all existing application data

## Benefits

1. **Data Integrity**: Ensures every application has an associated candidate
2. **Automatic Handling**: No need to manually create candidates
3. **Flexibility**: Multiple ways to create candidates depending on available data
4. **Consistency**: Maintains referential integrity between applications and candidates

## Notes

- The trigger automatically handles the most common case (application insertion)
- Utility functions provide flexibility for edge cases or manual operations
- All functions include proper error handling and logging
- Functions are idempotent - calling them multiple times with the same data is safe
