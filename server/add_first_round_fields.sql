-- Add first round interview evaluation fields to interview_evaluations table
ALTER TABLE interview_evaluations 
ADD COLUMN IF NOT EXISTS behavioral_leadership INTEGER,
ADD COLUMN IF NOT EXISTS behavioral_problem_solving INTEGER,
ADD COLUMN IF NOT EXISTS behavioral_interest INTEGER,
ADD COLUMN IF NOT EXISTS behavioral_total INTEGER,
ADD COLUMN IF NOT EXISTS market_sizing_teamwork INTEGER,
ADD COLUMN IF NOT EXISTS market_sizing_logic INTEGER,
ADD COLUMN IF NOT EXISTS market_sizing_creativity INTEGER,
ADD COLUMN IF NOT EXISTS market_sizing_total INTEGER,
ADD COLUMN IF NOT EXISTS behavioral_notes TEXT,
ADD COLUMN IF NOT EXISTS market_sizing_notes TEXT,
ADD COLUMN IF NOT EXISTS additional_notes TEXT;


