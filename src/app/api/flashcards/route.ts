import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Admin 클라이언트 (RLS 우회)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No userId provided' }, { status: 401 })
    }

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Validate file ownership
    const { data: file } = await supabaseAdmin
      .from('flashcard_files')
      .select('user_id')
      .eq('id', fileId)
      .single()

    if (!file || file.user_id !== userId) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Fetch flashcards
    const { data: flashcards, error } = await supabaseAdmin
      .from('flashcards')
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching flashcards:', error)
      throw error
    }

    return NextResponse.json({ flashcards })
  } catch (error) {
    console.error('Error in GET /api/flashcards:', error)
    return NextResponse.json({ error: 'Failed to fetch flashcards' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fileId, front, back, notes, language, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No userId provided' }, { status: 401 })
    }

    if (!fileId || !front || !back) {
      return NextResponse.json({ 
        error: 'fileId, front (공부할 단어), and back (뜻) are required' 
      }, { status: 400 })
    }

    // Validate file ownership
    const { data: file } = await supabaseAdmin
      .from('flashcard_files')
      .select('user_id')
      .eq('id', fileId)
      .single()

    if (!file || file.user_id !== userId) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Create flashcard
    const { data: flashcard, error } = await supabaseAdmin
      .from('flashcards')
      .insert({
        file_id: fileId,
        front: front.trim(),
        back: back.trim(),
        notes: notes?.trim() || null,
        language: language || null,
        status: 'new',
        ease_factor: 2.5,
        interval: 1,
        repetitions: 0,
        due_date: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating flashcard:', error)
      throw error
    }

    // Update file stats
    await supabaseAdmin.rpc('update_file_card_counts', { 
      p_file_id: fileId 
    })

    return NextResponse.json({ flashcard })
  } catch (error) {
    console.error('Error in POST /api/flashcards:', error)
    return NextResponse.json({ error: 'Failed to create flashcard' }, { status: 500 })
  }
}