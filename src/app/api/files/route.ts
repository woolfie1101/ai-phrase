import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { 
  createFlashcardFile,
  getFilesInFolder,
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

export async function GET(request: NextRequest) {
  try {
    console.log('GET files request started')
    
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const userId = searchParams.get('userId')

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    if (!userId) {
      console.log('No userId provided in query params')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    console.log('Requested folderId:', folderId)

    // Admin 클라이언트로 폴더 조회 (RLS 우회)
    const { data: folder } = await supabaseAdmin
      .from('folders')
      .select('user_id')
      .eq('id', folderId)
      .single()

    if (!folder) {
      console.log('Folder not found:', folderId)
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    if (folder.user_id !== userId) {
      console.log('User does not have access to this folder')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('Folder found, user_id:', folder.user_id)

    // Admin 클라이언트로 파일 조회 (RLS 우회)
    const { data: files, error: filesError } = await supabaseAdmin
      .from('flashcard_files')
      .select('*')
      .eq('folder_id', folderId)
      .order('created_at', { ascending: true })

    if (filesError) {
      console.error('Files query error:', filesError)
      throw filesError
    }

    console.log('Files found:', files?.length)

    return NextResponse.json({ files: files || [] })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST files request started')
    
    const body = await request.json()
    const { name, folderId, studyMode, schedule, userId } = body
    
    console.log('Request body:', { name, folderId, userId })

    if (!userId) {
      console.log('No userId provided in request body')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 })
    }

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Admin 클라이언트로 폴더 검증 (RLS 우회)
    const { data: folder } = await supabaseAdmin
      .from('folders')
      .select('user_id')
      .eq('id', folderId)
      .single()

    if (!folder || folder.user_id !== userId) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
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

    // Admin 클라이언트로 직접 파일 생성 (RLS 우회)
    const { data: file, error: fileError } = await supabaseAdmin
      .from('flashcard_files')
      .insert({
        name: name.trim(),
        folder_id: folderId,
        user_id: userId,
        study_mode: studyMode || 'bidirectional',
        schedule: schedule ? JSON.stringify(schedule) : '[]',
      })
      .select()
      .single()

    if (fileError) {
      console.error('File creation error:', fileError)
      throw fileError
    }

    console.log('File created successfully')

    return NextResponse.json({ file }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating file:', error)
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A file with this name already exists in this folder' }, 
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }
}