import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Admin 클라이언트 (RLS 우회)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 일반 클라이언트 (사용자 인증용)
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('GET folders request started')
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      console.log('No userId provided in query params')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    console.log('Fetching folders for user:', userId)
    
    // 폴더 목록 조회 (Admin 클라이언트 사용으로 RLS 우회)
    const { data: folders, error: foldersError } = await supabaseAdmin
      .from('folders')
      .select(`
        *,
        flashcard_files(id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    console.log('Folders found:', folders?.length, folders?.map(f => ({ id: f.id, name: f.name })))

    if (foldersError) {
      console.error('Database error:', foldersError)
      return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
    }

    return NextResponse.json(folders || [])
  } catch (error) {
    console.error('Error fetching folders:', error)
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST folders request started')
    
    const body = await request.json()
    const { name, description, parentId, schedule, color, userId } = body
    
    console.log('Request body:', { name, userId, parentId })

    if (!userId) {
      console.log('No userId provided in request body')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    // Admin 클라이언트로 폴더 생성 (RLS 우회)
    const folderData: any = {
      name: name.trim(),
      user_id: userId,
    }
    
    if (parentId !== undefined) folderData.parent_id = parentId
    if (schedule !== undefined) folderData.schedule = JSON.stringify(schedule)
    if (color !== undefined) folderData.color = color

    console.log('Creating folder with data:', folderData)

    const { data: folder, error: createError } = await supabaseAdmin
      .from('folders')
      .insert(folderData)
      .select()
      .single()

    if (createError) {
      console.error('Create folder error:', createError)
      
      // Handle unique constraint violations
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A folder with this name already exists' }, 
          { status: 409 }
        )
      }
      
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
    }

    return NextResponse.json(folder, { status: 201 })
  } catch (error: any) {
    console.error('Error creating folder:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}