import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { 
  updateFlashcardFile, 
  deleteFlashcardFile, 
  DayOfWeek 
} from '@/lib/database'

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('GET file request started, id:', params.id)
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    console.log('Query userId:', userId)

    if (!userId) {
      console.log('No userId provided in query parameters')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    console.log('Using admin client for file retrieval operations')

    // Get file information with user validation
    const { data: file, error: fileError } = await supabaseAdmin
      .from('flashcard_files')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    console.log('File query result:', !!file, fileError)

    if (fileError || !file) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    console.log('File retrieved successfully:', file.name)

    return NextResponse.json(file)
  } catch (error) {
    console.error('Error retrieving file:', error)
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('PUT file request started, id:', params.id)
    
    const body = await request.json()
    const { name, folderId, studyMode, schedule, userId } = body
    
    console.log('Request body userId:', userId)

    if (!userId) {
      console.log('No userId provided in request body')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    console.log('Using admin client for file update operations')

    // Validate that the file belongs to the user (Admin 클라이언트 사용)
    const { data: existingFile } = await supabaseAdmin
      .from('flashcard_files')
      .select('user_id')
      .eq('id', params.id)
      .single()

    console.log('Existing file check:', !!existingFile, existingFile?.user_id === userId)

    if (!existingFile || existingFile.user_id !== userId) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Validate folder if provided
    if (folderId) {
      const { data: folder } = await supabaseAdmin
        .from('folders')
        .select('user_id')
        .eq('id', folderId)
        .single()

      if (!folder || folder.user_id !== userId) {
        return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
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

    // Admin 클라이언트로 직접 업데이트 (RLS 우회)
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (folderId !== undefined) updateData.folder_id = folderId
    if (studyMode !== undefined) updateData.study_mode = studyMode
    if (schedule !== undefined) updateData.schedule = JSON.stringify(schedule)

    const { data: file, error: updateError } = await supabaseAdmin
      .from('flashcard_files')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    console.log('File updated successfully')

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
    console.log('DELETE file request started, id:', params.id)
    
    // 미들웨어가 비활성화된 상황에서 임시로 요청 본문에서 userId를 받음
    const body = await request.json()
    const { userId } = body
    
    console.log('Request body userId:', userId)

    if (!userId) {
      console.log('No userId provided in request body')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    console.log('Using admin client for file deletion operations')

    // Validate that the file belongs to the user (Admin 클라이언트 사용)
    const { data: existingFile, error: fileError } = await supabaseAdmin
      .from('flashcard_files')
      .select('user_id')
      .eq('id', params.id)
      .single()

    console.log('Existing file check:', !!existingFile, existingFile?.user_id === userId)
    console.log('File query error:', fileError)

    if (!existingFile || existingFile.user_id !== userId) {
      return NextResponse.json({ error: 'File not found or access denied' }, { status: 404 })
    }

    // Admin 클라이언트로 직접 삭제 (RLS 우회)
    const { error: deleteError } = await supabaseAdmin
      .from('flashcard_files')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }
    
    console.log('File deleted successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}