-- Utility functions for AI Phrase database operations

-- Function to calculate next review date using SM-2 algorithm
CREATE OR REPLACE FUNCTION calculate_next_review(
    p_ease_factor REAL,
    p_interval INTEGER,
    p_quality INTEGER -- 0=Again, 1=Hard, 2=Good, 3=Easy
)
RETURNS TABLE (
    new_ease_factor REAL,
    new_interval INTEGER,
    new_repetitions INTEGER
) AS $$
BEGIN
    -- SM-2 Algorithm implementation
    CASE p_quality
        WHEN 0 THEN -- Again: Reset to learning phase
            RETURN QUERY SELECT 
                GREATEST(1.3, p_ease_factor - 0.2)::REAL,
                1::INTEGER,
                0::INTEGER;
        WHEN 1 THEN -- Hard: Reduce ease factor and interval
            RETURN QUERY SELECT 
                GREATEST(1.3, p_ease_factor - 0.15)::REAL,
                GREATEST(1, (p_interval * 1.2)::INTEGER),
                CASE WHEN p_interval = 1 THEN 1 ELSE 2 END::INTEGER;
        WHEN 2 THEN -- Good: Standard progression
            RETURN QUERY SELECT 
                p_ease_factor::REAL,
                CASE 
                    WHEN p_interval = 1 THEN 6
                    ELSE (p_interval * p_ease_factor)::INTEGER
                END,
                CASE WHEN p_interval = 1 THEN 1 ELSE 2 END::INTEGER;
        WHEN 3 THEN -- Easy: Increase ease factor and interval
            RETURN QUERY SELECT 
                (p_ease_factor + 0.15)::REAL,
                CASE 
                    WHEN p_interval = 1 THEN 4
                    ELSE (p_interval * p_ease_factor * 1.3)::INTEGER
                END,
                CASE WHEN p_interval = 1 THEN 1 ELSE 2 END::INTEGER;
        ELSE -- Default to Good
            RETURN QUERY SELECT 
                p_ease_factor::REAL,
                CASE 
                    WHEN p_interval = 1 THEN 6
                    ELSE (p_interval * p_ease_factor)::INTEGER
                END,
                CASE WHEN p_interval = 1 THEN 1 ELSE 2 END::INTEGER;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get cards due for study today
CREATE OR REPLACE FUNCTION get_due_cards(p_user_id UUID)
RETURNS TABLE (
    file_id UUID,
    file_name TEXT,
    folder_name TEXT,
    card_id UUID,
    front TEXT,
    back TEXT,
    notes TEXT,
    status card_status,
    due_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as file_id,
        f.name as file_name,
        fold.name as folder_name,
        c.id as card_id,
        c.front,
        c.back,
        c.notes,
        c.status,
        c.due_date
    FROM public.flashcards c
    JOIN public.flashcard_files f ON c.file_id = f.id
    JOIN public.folders fold ON f.folder_id = fold.id
    WHERE f.user_id = p_user_id
    AND c.due_date <= timezone('utc'::text, now())
    AND c.status IN ('new', 'learning', 'review')
    ORDER BY 
        CASE c.status 
            WHEN 'learning' THEN 1 
            WHEN 'new' THEN 2 
            WHEN 'review' THEN 3 
        END,
        c.due_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to update flashcard after review
CREATE OR REPLACE FUNCTION update_flashcard_review(
    p_card_id UUID,
    p_quality INTEGER
)
RETURNS VOID AS $$
DECLARE
    current_card RECORD;
    next_review_data RECORD;
    new_status card_status;
BEGIN
    -- Get current card data
    SELECT ease_factor, interval, repetitions, status
    INTO current_card
    FROM public.flashcards
    WHERE id = p_card_id;
    
    -- Calculate next review parameters
    SELECT * INTO next_review_data
    FROM calculate_next_review(
        current_card.ease_factor,
        current_card.interval,
        p_quality
    );
    
    -- Determine new status
    IF p_quality = 0 THEN
        new_status := 'learning';
    ELSIF current_card.status = 'new' OR current_card.status = 'learning' THEN
        new_status := 'learning';
    ELSE
        new_status := 'review';
    END IF;
    
    -- Update the flashcard
    UPDATE public.flashcards
    SET 
        ease_factor = next_review_data.new_ease_factor,
        interval = next_review_data.new_interval,
        repetitions = next_review_data.new_repetitions,
        status = new_status,
        due_date = timezone('utc'::text, now()) + (next_review_data.new_interval || ' days')::INTERVAL,
        last_review = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_card_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get today's study schedule for a user
CREATE OR REPLACE FUNCTION get_todays_schedule(p_user_id UUID)
RETURNS TABLE (
    type TEXT,
    id UUID,
    name TEXT,
    path TEXT,
    due_count INTEGER
) AS $$
DECLARE
    current_day TEXT;
BEGIN
    -- Get current day of week
    current_day := lower(to_char(current_date, 'Day'));
    current_day := trim(current_day);
    
    RETURN QUERY
    WITH scheduled_files AS (
        -- Files with specific schedules
        SELECT DISTINCT
            'file' as type,
            f.id,
            f.name,
            fold.name as folder_path,
            COUNT(c.id)::INTEGER as due_count
        FROM public.flashcard_files f
        JOIN public.folders fold ON f.folder_id = fold.id
        LEFT JOIN public.flashcards c ON f.id = c.file_id 
            AND c.due_date <= timezone('utc'::text, now())
            AND c.status IN ('new', 'learning', 'review')
        WHERE f.user_id = p_user_id
        AND (
            f.schedule::jsonb ? current_day OR
            (jsonb_array_length(f.schedule::jsonb) = 0 AND fold.schedule::jsonb ? current_day)
        )
        GROUP BY f.id, f.name, fold.name
        
        UNION ALL
        
        -- Folders with schedules (where files don't have specific schedules)
        SELECT DISTINCT
            'folder' as type,
            fold.id,
            fold.name,
            '' as folder_path,
            COALESCE(SUM(
                (SELECT COUNT(*)::INTEGER FROM public.flashcards c 
                 WHERE c.file_id = f.id 
                 AND c.due_date <= timezone('utc'::text, now())
                 AND c.status IN ('new', 'learning', 'review'))
            ), 0) as due_count
        FROM public.folders fold
        LEFT JOIN public.flashcard_files f ON fold.id = f.folder_id
        WHERE fold.user_id = p_user_id
        AND fold.schedule::jsonb ? current_day
        AND (f.id IS NULL OR jsonb_array_length(f.schedule::jsonb) = 0)
        GROUP BY fold.id, fold.name
    )
    SELECT * FROM scheduled_files
    WHERE due_count > 0
    ORDER BY type, name;
END;
$$ LANGUAGE plpgsql;

-- Function to update file card counts (called after card operations)
CREATE OR REPLACE FUNCTION update_file_card_counts(p_file_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.flashcard_files
    SET 
        total_cards = (SELECT COUNT(*) FROM public.flashcards WHERE file_id = p_file_id),
        new_cards = (SELECT COUNT(*) FROM public.flashcards WHERE file_id = p_file_id AND status = 'new'),
        learning_cards = (SELECT COUNT(*) FROM public.flashcards WHERE file_id = p_file_id AND status = 'learning'),
        review_cards = (SELECT COUNT(*) FROM public.flashcards WHERE file_id = p_file_id AND status = 'review'),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update file card counts
CREATE OR REPLACE FUNCTION trigger_update_file_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_file_card_counts(OLD.file_id);
        RETURN OLD;
    ELSE
        PERFORM update_file_card_counts(NEW.file_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER flashcards_update_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.flashcards
    FOR EACH ROW EXECUTE FUNCTION trigger_update_file_counts();