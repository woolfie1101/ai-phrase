-- Sample data for testing AI Phrase database structure
-- This creates test users, folders, files, and flashcards

-- Insert sample users (these would normally be handled by Supabase Auth)
-- For testing, we'll create users directly
INSERT INTO public.users (id, email, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'test@example.com', 'Test User'),
    ('550e8400-e29b-41d4-a716-446655440002', 'demo@example.com', 'Demo User')
ON CONFLICT (id) DO NOTHING;

-- Insert user profiles
INSERT INTO public.user_profiles (user_id, display_name, streak_count, last_study_date) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Test User', 5, CURRENT_DATE - INTERVAL '1 day'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Demo User', 0, NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Insert sample folders
INSERT INTO public.folders (id, name, parent_id, user_id, schedule, color) VALUES 
    ('650e8400-e29b-41d4-a716-446655440001', 'English', NULL, '550e8400-e29b-41d4-a716-446655440001', '["monday", "wednesday", "friday"]', '#3B82F6'),
    ('650e8400-e29b-41d4-a716-446655440002', 'Vocabulary', '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '[]', '#10B981'),
    ('650e8400-e29b-41d4-a716-446655440003', 'Grammar', '650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '[]', '#F59E0B'),
    ('650e8400-e29b-41d4-a716-446655440004', 'Japanese', NULL, '550e8400-e29b-41d4-a716-446655440001', '["tuesday", "thursday"]', '#EF4444'),
    ('650e8400-e29b-41d4-a716-446655440005', 'Spanish', NULL, '550e8400-e29b-41d4-a716-446655440002', '["monday", "wednesday", "friday"]', '#8B5CF6')
ON CONFLICT (id) DO NOTHING;

-- Insert sample flashcard files
INSERT INTO public.flashcard_files (id, name, folder_id, user_id, study_mode, schedule) VALUES 
    ('750e8400-e29b-41d4-a716-446655440001', 'Basic Words', '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'bidirectional', '[]'),
    ('750e8400-e29b-41d4-a716-446655440002', 'Advanced Vocabulary', '650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'front-to-back', '["sunday"]'),
    ('750e8400-e29b-41d4-a716-446655440003', 'Past Tense', '650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'bidirectional', '[]'),
    ('750e8400-e29b-41d4-a716-446655440004', 'Hiragana', '650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'front-to-back', '[]'),
    ('750e8400-e29b-41d4-a716-446655440005', 'Basic Phrases', '650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 'bidirectional', '[]')
ON CONFLICT (id) DO NOTHING;

-- Insert sample flashcards
INSERT INTO public.flashcards (id, file_id, front, back, notes, status, due_date, language) VALUES 
    -- Basic Words (English)
    ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'apple', 'an edible fruit produced by an apple tree', 'Common fruit, easy to remember', 'new', CURRENT_TIMESTAMP, 'en'),
    ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'book', 'a set of printed pages bound together', 'Example: I read a good book yesterday', 'learning', CURRENT_TIMESTAMP + INTERVAL '1 day', 'en'),
    ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001', 'computer', 'an electronic device for processing data', 'Technology vocabulary', 'review', CURRENT_TIMESTAMP + INTERVAL '3 days', 'en'),
    
    -- Advanced Vocabulary (English)
    ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440002', 'serendipity', 'the occurrence of events by chance in a happy way', 'Beautiful concept, hard to translate', 'new', CURRENT_TIMESTAMP, 'en'),
    ('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440002', 'ephemeral', 'lasting for a short time', 'Like cherry blossoms', 'new', CURRENT_TIMESTAMP, 'en'),
    
    -- Past Tense (English Grammar)
    ('850e8400-e29b-41d4-a716-446655440006', '750e8400-e29b-41d4-a716-446655440003', 'go → went', 'past tense of go', 'Irregular verb', 'learning', CURRENT_TIMESTAMP, 'en'),
    ('850e8400-e29b-41d4-a716-446655440007', '750e8400-e29b-41d4-a716-446655440003', 'eat → ate', 'past tense of eat', 'Another irregular verb', 'new', CURRENT_TIMESTAMP, 'en'),
    
    -- Hiragana (Japanese)
    ('850e8400-e29b-41d4-a716-446655440008', '750e8400-e29b-41d4-a716-446655440004', 'あ', 'a', 'First hiragana character', 'review', CURRENT_TIMESTAMP + INTERVAL '7 days', 'ja'),
    ('850e8400-e29b-41d4-a716-446655440009', '750e8400-e29b-41d4-a716-446655440004', 'か', 'ka', 'K-row character', 'learning', CURRENT_TIMESTAMP + INTERVAL '2 days', 'ja'),
    
    -- Basic Phrases (Spanish)
    ('850e8400-e29b-41d4-a716-446655440010', '750e8400-e29b-41d4-a716-446655440005', '¡Hola!', 'Hello!', 'Basic greeting', 'new', CURRENT_TIMESTAMP, 'es')
ON CONFLICT (id) DO NOTHING;

-- Update file card counts
SELECT update_file_card_counts(id) FROM public.flashcard_files;

-- Insert sample study session
INSERT INTO public.study_sessions (user_id, file_id, cards_studied, correct_answers, study_duration, session_date) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 5, 4, 300, CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440003', 3, 2, 180, CURRENT_TIMESTAMP - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- Insert daily stats
INSERT INTO public.daily_stats (user_id, date, cards_studied, new_cards_learned, review_cards_completed, study_time_minutes, completion_percentage) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '1 day', 8, 3, 2, 8, 75.0),
    ('550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - INTERVAL '2 days', 5, 2, 1, 5, 60.0)
ON CONFLICT (user_id, date) DO NOTHING;