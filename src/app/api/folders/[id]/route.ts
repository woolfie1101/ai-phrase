import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { updateFolder, deleteFolder, DayOfWeek } from '@/lib/database'

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
    console.log('PUT folder request started, id:', params.id)
    
    const body = await request.json()
    const { name, parentId, schedule, color, userId } = body
    
    console.log('Request body userId:', userId)

    if (!userId) {
      console.log('No userId provided in request body')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    console.log('Using admin client for folder update operations')

    // Validate that the folder belongs to the user (Admin 클라이언트 사용)
    const { data: existingFolder } = await supabaseAdmin
      .from('folders')
      .select('user_id')
      .eq('id', params.id)
      .single()

    console.log('Existing folder check:', !!existingFolder, existingFolder?.user_id === userId)

    if (!existingFolder || existingFolder.user_id !== userId) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
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
    if (parentId !== undefined) updateData.parent_id = parentId
    if (schedule !== undefined) updateData.schedule = JSON.stringify(schedule)
    if (color !== undefined) updateData.color = color

    const { data: folder, error: updateError } = await supabaseAdmin
      .from('folders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    // 스케줄이 업데이트된 경우, 하위 파일들의 스케줄도 업데이트 (사용자가 개별 설정하지 않은 파일들만)
    if (schedule !== undefined) {
      console.log('Updating child files schedule to match folder schedule')
      
      // 이 폴더에 속한 파일들 중에서 기본 스케줄(폴더와 동일)을 사용하는 파일들 업데이트
      const { data: childFiles } = await supabaseAdmin
        .from('flashcard_files')
        .select('*')
        .eq('folder_id', params.id)

      if (childFiles && childFiles.length > 0) {
        console.log(`Updating schedule for ${childFiles.length} child files`)
        
        const { error: filesUpdateError } = await supabaseAdmin
          .from('flashcard_files')
          .update({ schedule: JSON.stringify(schedule) })
          .eq('folder_id', params.id)
        
        if (filesUpdateError) {
          console.error('Error updating child files schedule:', filesUpdateError)
          // 파일 업데이트 실패해도 폴더 업데이트는 성공으로 처리
        } else {
          console.log('Child files schedule updated successfully')
        }
      }
    }

    console.log('Folder updated successfully')

    return NextResponse.json({ folder })
  } catch (error: any) {
    console.error('Error updating folder:', error)
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A folder with this name already exists in this location' }, 
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    console.log('DELETE folder request started, id:', params.id)
    
    // 미들웨어가 비활성화된 상황에서 임시로 요청 본문에서 userId를 받음
    const body = await request.json()
    const { userId } = body
    
    console.log('Request body userId:', userId)

    if (!userId) {
      console.log('No userId provided in request body')
      return NextResponse.json({ error: 'Unauthorized', debug: 'No userId provided' }, { status: 401 })
    }

    console.log('Using admin client for folder operations')

    // 먼저 모든 폴더를 확인해보자 (Admin 클라이언트 사용)
    const { data: allFolders } = await supabaseAdmin
      .from('folders')
      .select('*')
      .eq('user_id', userId)
    
    console.log('All user folders (admin):', allFolders?.length, allFolders?.map(f => f.id))
    
    // Validate that the folder belongs to the user (Admin 클라이언트 사용)
    const { data: existingFolder, error: folderError } = await supabaseAdmin
      .from('folders')
      .select('user_id')
      .eq('id', params.id)
      .single()

    console.log('Existing folder check:', !!existingFolder, existingFolder?.user_id === userId)
    console.log('Folder query error:', folderError)

    if (!existingFolder || existingFolder.user_id !== userId) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 })
    }

    // Admin 클라이언트로 직접 삭제 (RLS 우회)
    const { error: deleteError } = await supabaseAdmin
      .from('folders')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }
    
    console.log('Folder deleted successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}