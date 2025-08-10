import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { 
  updateFlashcardFile, 
  deleteFlashcardFile, 
  DayOfWeek 
} from '@/lib/database'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, folderId, studyMode, schedule } = body

    // Validate that the file belongs to the user
    const { data: existingFile } = await supabase
      .from('flashcard_files')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!existingFile || existingFile.user_id !== user.id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Validate folder if provided
    if (folderId) {
      const { data: folder } = await supabase
        .from('folders')
        .select('user_id')
        .eq('id', folderId)
        .single()

      if (!folder || folder.user_id !== user.id) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
      }
    }

    // Validate study mode if provided
    if (studyMode && !['bidirectional', 'front-to-back', 'back-to-front'].includes(studyMode)) {
      return NextResponse.json({ error: 'Invalid study mode' }, { status: 400 })
    }

    // Validate schedule if provided
    if (schedule && (!Array.isArray(schedule) || !schedule.every(day => 
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day)
    ))) {
      return NextResponse.json({ error: 'Invalid schedule format' }, { status: 400 })
    }

    const updates: Parameters<typeof updateFlashcardFile>[1] = {}
    if (name !== undefined) updates.name = name.trim()
    if (folderId !== undefined) updates.folderId = folderId
    if (studyMode !== undefined) updates.studyMode = studyMode
    if (schedule !== undefined) updates.schedule = schedule as DayOfWeek[]

    const file = await updateFlashcardFile(params.id, updates)

    return NextResponse.json({ file })
  } catch (error: any) {
    console.error('Error updating file:', error)
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A file with this name already exists in this folder' }, 
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate that the file belongs to the user
    const { data: existingFile } = await supabase
      .from('flashcard_files')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!existingFile || existingFile.user_id !== user.id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await deleteFlashcardFile(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}