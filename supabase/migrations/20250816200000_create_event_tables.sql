-- Create event_rsvp table in Supabase to mirror Prisma EventRsvp model
CREATE TABLE IF NOT EXISTS public.event_rsvp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  candidate_id TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  student_id INTEGER,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event_attendance table in Supabase to mirror Prisma EventAttendance model  
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id TEXT UNIQUE NOT NULL,
  event_id TEXT NOT NULL,
  candidate_id TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  student_id INTEGER,
  raw_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_rsvp_event_id ON public.event_rsvp(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_candidate_id ON public.event_rsvp(candidate_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_student_id ON public.event_rsvp(student_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvp_email ON public.event_rsvp(email);

CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON public.event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_candidate_id ON public.event_attendance(candidate_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_student_id ON public.event_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_email ON public.event_attendance(email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.event_rsvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON public.event_rsvp
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.event_rsvp
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.event_rsvp
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for authenticated users" ON public.event_attendance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON public.event_attendance
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.event_attendance
  FOR UPDATE USING (auth.role() = 'authenticated');