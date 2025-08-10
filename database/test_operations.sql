-- Test Operations for AI Phrase Database
-- This file contains test queries to verify database functionality

-- Test 1: Verify all tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Test 2: Verify all functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Test 3: Test SM-2 Algorithm Function
-- Test different quality ratings
SELECT 
    'Again (0)' as scenario,
    new_ease_factor,
    new_interval,
    new_repetitions
FROM calculate_next_review(2.5, 1, 0)

UNION ALL

SELECT 
    'Hard (1)' as scenario,
    new_ease_factor,
    new_interval,
    new_repetitions
FROM calculate_next_review(2.5, 6, 1)

UNION ALL

SELECT 
    'Good (2)' as scenario,
    new_ease_factor,
    new_interval,
    new_repetitions
FROM calculate_next_review(2.5, 6, 2)

UNION ALL

SELECT 
    'Easy (3)' as scenario,
    new_ease_factor,
    new_interval,
    new_repetitions
FROM calculate_next_review(2.5, 6, 3);

-- Test 4: Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Test 5: List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test 6: Check all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Test 7: Verify constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- Test 8: Verify foreign key relationships
SELECT 
    tc.table_name as child_table,
    kcu.column_name as child_column,
    ccu.table_name AS parent_table,
    ccu.column_name AS parent_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Test 9: Check enum types
SELECT 
    t.typname as enum_name,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('card_status', 'study_mode', 'day_of_week')
GROUP BY t.typname
ORDER BY t.typname;

-- Test 10: Verify triggers exist
SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
ORDER BY event_object_table, trigger_name;