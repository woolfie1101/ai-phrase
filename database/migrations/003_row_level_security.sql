-- Migration: 003_row_level_security.sql
-- Description: Enable RLS and create security policies for AI Phrase
-- Created: 2025-01-09

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Users table policies
DO $$ BEGIN
    CREATE POLICY "Users can view own profile" ON public.users
        FOR SELECT USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile" ON public.users
        FOR UPDATE USING (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile" ON public.users
        FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User profiles table policies  
DO $$ BEGIN
    CREATE POLICY "Users can view own user profile" ON public.user_profiles
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own user profile" ON public.user_profiles
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own user profile" ON public.user_profiles
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Folders table policies
DO $$ BEGIN
    CREATE POLICY "Users can view own folders" ON public.folders
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own folders" ON public.folders
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own folders" ON public.folders
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own folders" ON public.folders
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Flashcard files table policies
DO $$ BEGIN
    CREATE POLICY "Users can view own flashcard files" ON public.flashcard_files
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own flashcard files" ON public.flashcard_files
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own flashcard files" ON public.flashcard_files
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own flashcard files" ON public.flashcard_files
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Flashcards table policies (indirect access through file ownership)
DO $$ BEGIN
    CREATE POLICY "Users can view own flashcards" ON public.flashcards
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.flashcard_files 
                WHERE id = flashcards.file_id 
                AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert flashcards in own files" ON public.flashcards
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.flashcard_files 
                WHERE id = flashcards.file_id 
                AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own flashcards" ON public.flashcards
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.flashcard_files 
                WHERE id = flashcards.file_id 
                AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own flashcards" ON public.flashcards
        FOR DELETE USING (
            EXISTS (
                SELECT 1 FROM public.flashcard_files 
                WHERE id = flashcards.file_id 
                AND user_id = auth.uid()
            )
        );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Study sessions table policies
DO $$ BEGIN
    CREATE POLICY "Users can view own study sessions" ON public.study_sessions
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own study sessions" ON public.study_sessions
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own study sessions" ON public.study_sessions
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own study sessions" ON public.study_sessions
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Daily stats table policies
DO $$ BEGIN
    CREATE POLICY "Users can view own daily stats" ON public.daily_stats
        FOR SELECT USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own daily stats" ON public.daily_stats
        FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own daily stats" ON public.daily_stats
        FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can delete own daily stats" ON public.daily_stats
        FOR DELETE USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;