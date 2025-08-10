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

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { front, back, notes, language, userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No userId provided' }, { status: 401 })
    }

    // Validate flashcard ownership
    const { data: flashcard } = await supabaseAdmin
      .from('flashcards')
      .select(`
        file_id,
        flashcard_files!inner(user_id)
      `)
      .eq('id', params.id)
      .single()

    if (!flashcard || (flashcard.flashcard_files as any).user_id !== userId) {
      return NextResponse.json({ error: 'Flashcard not found or access denied' }, { status: 404 })
    }

    // Update flashcard
    const updateData: any = {}
    if (front !== undefined) updateData.front = front.trim()
    if (back !== undefined) updateData.back = back.trim()
    if (notes !== undefined) updateData.notes = notes?.trim() || null
    if (language !== undefined) updateData.language = language || null

    const { data: updatedFlashcard, error } = await supabaseAdmin
      .from('flashcards')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating flashcard:', error)
      throw error
    }

    return NextResponse.json({ flashcard: updatedFlashcard })
  } catch (error) {
    console.error('Error in PUT /api/flashcards/[id]:', error)
    return NextResponse.json({ error: 'Failed to update flashcard' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - No userId provided' }, { status: 401 })
    }

    // Validate flashcard ownership and get file_id for stats update
    const { data: flashcard } = await supabaseAdmin
      .from('flashcards')
      .select(`
        file_id,
        flashcard_files!inner(user_id)
      `)
      .eq('id', params.id)
      .single()

    if (!flashcard || (flashcard.flashcard_files as any).user_id !== userId) {
      return NextResponse.json({ error: 'Flashcard not found or access denied' }, { status: 404 })
    }

    // Delete flashcard
    const { error } = await supabaseAdmin
      .from('flashcards')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting flashcard:', error)
      throw error
    }

    // Update file stats
    await supabaseAdmin.rpc('update_file_card_counts', { 
      p_file_id: flashcard.file_id 
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/flashcards/[id]:', error)
    return NextResponse.json({ error: 'Failed to delete flashcard' }, { status: 500 })
  }
}