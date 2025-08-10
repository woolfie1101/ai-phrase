-- Migration: 001_initial_schema.sql
-- Description: Create initial database schema for AI Phrase
-- Created: 2025-01-09

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom enums
DO $$ BEGIN
    CREATE TYPE card_status AS ENUM ('new', 'learning', 'review', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE study_mode AS ENUM ('bidirectional', 'front-to-back', 'back-to-front');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User profiles for extended user data
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    streak_count INTEGER DEFAULT 0 NOT NULL,
    last_study_date DATE,
    settings JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Folders table for hierarchical organization
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    schedule JSONB DEFAULT '[]' NOT NULL,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(user_id, parent_id, name)
);

-- Flashcard files table
CREATE TABLE IF NOT EXISTS public.flashcard_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    study_mode study_mode DEFAULT 'bidirectional' NOT NULL,
    schedule JSONB DEFAULT '[]' NOT NULL,
    total_cards INTEGER DEFAULT 0 NOT NULL,
    new_cards INTEGER DEFAULT 0 NOT NULL,
    learning_cards INTEGER DEFAULT 0 NOT NULL,
    review_cards INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(folder_id, name)
);

-- Flashcards table implementing SM-2 algorithm
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES public.flashcard_files(id) ON DELETE CASCADE NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    notes TEXT,
    status card_status DEFAULT 'new' NOT NULL,
    ease_factor REAL DEFAULT 2.5 NOT NULL,
    interval INTEGER DEFAULT 1 NOT NULL,
    repetitions INTEGER DEFAULT 0 NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_review TIMESTAMP WITH TIME ZONE,
    language TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT ease_factor_bounds CHECK (ease_factor >= 1.3),
    CONSTRAINT interval_positive CHECK (interval > 0),
    CONSTRAINT repetitions_non_negative CHECK (repetitions >= 0)
);

-- Study sessions for tracking learning sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES public.flashcard_files(id) ON DELETE CASCADE NOT NULL,
    cards_studied INTEGER DEFAULT 0 NOT NULL,
    correct_answers INTEGER DEFAULT 0 NOT NULL,
    study_duration INTEGER DEFAULT 0 NOT NULL,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily statistics for progress tracking
CREATE TABLE IF NOT EXISTS public.daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    cards_studied INTEGER DEFAULT 0 NOT NULL,
    new_cards_learned INTEGER DEFAULT 0 NOT NULL,
    review_cards_completed INTEGER DEFAULT 0 NOT NULL,
    study_time_minutes INTEGER DEFAULT 0 NOT NULL,
    completion_percentage REAL DEFAULT 0 NOT NULL CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(user_id, date)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_files_user_id ON public.flashcard_files(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_files_folder_id ON public.flashcard_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_file_id ON public.flashcards(file_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_due_date ON public.flashcards(due_date);
CREATE INDEX IF NOT EXISTS idx_flashcards_status ON public.flashcards(status);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_session_date ON public.study_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_id_date ON public.daily_stats(user_id, date);