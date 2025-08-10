-- AI Phrase Database Schema
-- Supabase PostgreSQL implementation for spaced repetition learning app

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom enums
CREATE TYPE card_status AS ENUM ('new', 'learning', 'review', 'suspended');
CREATE TYPE study_mode AS ENUM ('bidirectional', 'front-to-back', 'back-to-front');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User profiles for extended user data
CREATE TABLE public.user_profiles (
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
CREATE TABLE public.folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    schedule JSONB DEFAULT '[]' NOT NULL, -- Array of day_of_week values
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure folder name is unique within the same parent for a user
    UNIQUE(user_id, parent_id, name)
);

-- Flashcard files table
CREATE TABLE public.flashcard_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    study_mode study_mode DEFAULT 'bidirectional' NOT NULL,
    schedule JSONB DEFAULT '[]' NOT NULL, -- Array of day_of_week values, overrides folder schedule
    total_cards INTEGER DEFAULT 0 NOT NULL,
    new_cards INTEGER DEFAULT 0 NOT NULL,
    learning_cards INTEGER DEFAULT 0 NOT NULL,
    review_cards INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure file name is unique within the same folder
    UNIQUE(folder_id, name)
);

-- Flashcards table implementing SM-2 algorithm
CREATE TABLE public.flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID REFERENCES public.flashcard_files(id) ON DELETE CASCADE NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    notes TEXT,
    status card_status DEFAULT 'new' NOT NULL,
    ease_factor REAL DEFAULT 2.5 NOT NULL, -- SM-2 algorithm parameter
    interval INTEGER DEFAULT 1 NOT NULL, -- Days until next review
    repetitions INTEGER DEFAULT 0 NOT NULL, -- Number of successful repetitions
    due_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_review TIMESTAMP WITH TIME ZONE,
    language TEXT, -- For TTS functionality
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints for SM-2 algorithm
    CONSTRAINT ease_factor_bounds CHECK (ease_factor >= 1.3),
    CONSTRAINT interval_positive CHECK (interval > 0),
    CONSTRAINT repetitions_non_negative CHECK (repetitions >= 0)
);

-- Study sessions for tracking learning sessions
CREATE TABLE public.study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    file_id UUID REFERENCES public.flashcard_files(id) ON DELETE CASCADE NOT NULL,
    cards_studied INTEGER DEFAULT 0 NOT NULL,
    correct_answers INTEGER DEFAULT 0 NOT NULL,
    study_duration INTEGER DEFAULT 0 NOT NULL, -- In seconds
    session_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily statistics for progress tracking
CREATE TABLE public.daily_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    cards_studied INTEGER DEFAULT 0 NOT NULL,
    new_cards_learned INTEGER DEFAULT 0 NOT NULL,
    review_cards_completed INTEGER DEFAULT 0 NOT NULL,
    study_time_minutes INTEGER DEFAULT 0 NOT NULL,
    completion_percentage REAL DEFAULT 0 NOT NULL CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one record per user per date
    UNIQUE(user_id, date)
);

-- Create indexes for performance optimization
CREATE INDEX idx_folders_user_id ON public.folders(user_id);
CREATE INDEX idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX idx_flashcard_files_user_id ON public.flashcard_files(user_id);
CREATE INDEX idx_flashcard_files_folder_id ON public.flashcard_files(folder_id);
CREATE INDEX idx_flashcards_file_id ON public.flashcards(file_id);
CREATE INDEX idx_flashcards_due_date ON public.flashcards(due_date);
CREATE INDEX idx_flashcards_status ON public.flashcards(status);
CREATE INDEX idx_study_sessions_user_id ON public.study_sessions(user_id);
CREATE INDEX idx_study_sessions_session_date ON public.study_sessions(session_date);
CREATE INDEX idx_daily_stats_user_id_date ON public.daily_stats(user_id, date);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_files_updated_at BEFORE UPDATE ON public.flashcard_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON public.flashcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();