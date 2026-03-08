-- ============================================================
-- Clio: Assignments Feature Migration
-- Creates the `assignments` table and adds `assignment_id`
-- foreign key to the existing `submissions` table.
-- ============================================================

-- 1. Create the assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    due_date TIMESTAMPTZ,
    max_word_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Add assignment_id FK to submissions (nullable for backward compatibility)
ALTER TABLE submissions
    ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES assignments(id) ON DELETE SET NULL;

-- 3. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);

-- 4. Enable RLS on assignments
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Teachers can manage their own assignments
CREATE POLICY "Teachers can manage own assignments"
    ON assignments FOR ALL
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- Anyone authenticated can view assignments (students need to see available assignments)
CREATE POLICY "Authenticated users can view assignments"
    ON assignments FOR SELECT
    USING (auth.role() = 'authenticated');
