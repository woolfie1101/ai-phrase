#!/bin/bash

# AI Phrase Database Setup Script
# This script sets up the complete database schema for AI Phrase

set -e

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <DATABASE_URL>"
    echo "Example: $0 'postgresql://postgres:password@host:port/database'"
    exit 1
fi

DATABASE_URL="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(dirname "$SCRIPT_DIR")/database/migrations"

echo "🚀 Setting up AI Phrase database..."

# Function to run a migration
run_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    echo "📝 Running migration: $migration_name"
    
    if psql "$DATABASE_URL" -f "$migration_file"; then
        echo "✅ Migration $migration_name completed successfully"
    else
        echo "❌ Migration $migration_name failed"
        exit 1
    fi
}

# Run migrations in order
echo "🔧 Running database migrations..."

run_migration "$MIGRATIONS_DIR/001_initial_schema.sql"
run_migration "$MIGRATIONS_DIR/002_functions_and_triggers.sql"
run_migration "$MIGRATIONS_DIR/003_row_level_security.sql"

echo ""
echo "🎉 Database setup completed successfully!"
echo ""
echo "📊 Database structure summary:"
echo "  ✅ Tables: users, user_profiles, folders, flashcard_files, flashcards, study_sessions, daily_stats"
echo "  ✅ Functions: SM-2 algorithm, scheduling, due cards retrieval"
echo "  ✅ Triggers: Automatic timestamps, card count updates"
echo "  ✅ Security: Row-level security policies for all tables"
echo "  ✅ Indexes: Performance optimization indexes"
echo ""
echo "📝 Next steps:"
echo "  1. Configure your .env file with Supabase credentials"
echo "  2. Test the database connection in your application"
echo "  3. Create your first user account through Supabase Auth"
echo ""
echo "🔍 To verify the setup, you can run:"
echo "  psql \"$DATABASE_URL\" -c \"\\dt\""
echo "  psql \"$DATABASE_URL\" -c \"SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';\""