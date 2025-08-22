-- Create interview_resources table
CREATE TABLE IF NOT EXISTS interview_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  url TEXT,
  has_external_link BOOLEAN DEFAULT true,
  icon VARCHAR(50) DEFAULT 'book',
  round VARCHAR(50) NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default resources
INSERT INTO interview_resources (title, description, url, has_external_link, icon, round, "order") VALUES
('Behavioral Questions Guide', 'Prepare answers for common behavioral interview questions.', '#', true, 'book', 'firstRound', 1),
('Market Sizing Case Book', 'Learn how to market size and practice with sample questions.', '#', true, 'book', 'firstRound', 2),
('Case Book', 'Comprehensive PDF guide on case interviews.', '#', true, 'book', 'finalRound', 1),
('UConsulting Case Buddy', 'We''ll contact you to pair up with a UC member to mock case 1-on-1.', '#', false, 'people', 'finalRound', 2),
('Virtual Case Buddy', 'Connect online with peers/ai to practice casing.', '#', true, 'globe', 'finalRound', 3)
ON CONFLICT DO NOTHING;
