-- Update the notes table to better match requirements
-- Rename file_path to file_url for clarity
ALTER TABLE public.notes RENAME COLUMN file_path TO file_url;

-- Add uploaded_at column for better tracking (if not exists)
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Ensure the profiles table has all needed fields
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student';

-- Update RLS policies to ensure proper access
-- Allow users to read their own profiles and others (for people directory)
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_authenticated" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Ensure updates table has proper RLS for authenticated users
DROP POLICY IF EXISTS "Everyone can read updates" ON public.updates;
CREATE POLICY "Authenticated users can read updates" 
ON public.updates 
FOR SELECT 
TO authenticated
USING (true);

-- Update notes policies to allow authenticated users to read public notes or their own
DROP POLICY IF EXISTS "notes_read_public_or_own" ON public.notes;
CREATE POLICY "notes_read_authenticated" 
ON public.notes 
FOR SELECT 
TO authenticated
USING (is_public = true OR auth.uid() = author_id);