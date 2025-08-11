'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Plus, Folder, FileText, Edit2, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/context/auth/auth-context'
import { useRouter } from 'next/navigation'
import SchedulePicker from '@/components/scheduling/schedule-picker'
import { DayOfWeek } from '@/lib/database'

interface Folder {
  id: string
  name: string
  parent_id: string | null
  user_id: string
  schedule: any
  color: string | null
  created_at: string
  updated_at: string
  flashcard_files?: { id: string }[]
}

export default function FoldersPage() {
  return (
    <ProtectedRoute>
      <FoldersContent />
    </ProtectedRoute>
  )
}

function FoldersContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderSchedule, setNewFolderSchedule] = useState<DayOfWeek[]>([])
  const [newFolderColor, setNewFolderColor] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  
  // 폴더 수정을 위한 상태들
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [editFolderSchedule, setEditFolderSchedule] = useState<DayOfWeek[]>([])
  const [editFolderColor, setEditFolderColor] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    fetchFolders()
  }, [])

  const fetchFolders = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/folders?userId=${user?.id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('폴더를 불러오는데 실패했습니다.')
      }
      
      const data = await response.json()
      setFolders(data)
    } catch (error) {
      console.error('Error fetching folders:', error)
      setError(error instanceof Error ? error.message : '폴더를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setError('폴더 이름을 입력해주세요.')
      return
    }

    try {
      setIsCreating(true)
      setError(null)
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          schedule: newFolderSchedule,
          color: newFolderColor || null,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '폴더 생성에 실패했습니다.')
      }

      const newFolder = await response.json()
      setFolders(prev => [newFolder, ...prev])
      setIsCreateDialogOpen(false)
      setNewFolderName('')
      setNewFolderSchedule([])
      setNewFolderColor('')
    } catch (error) {
      console.error('Error creating folder:', error)
      setError(error instanceof Error ? error.message : '폴더 생성에 실패했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditFolder = (folder: Folder) => {
    setSelectedFolder(folder)
    setEditFolderName(folder.name)
    
    // 기존 스케줄 파싱
    try {
      const schedule = folder.schedule ? JSON.parse(folder.schedule) : []
      setEditFolderSchedule(Array.isArray(schedule) ? schedule : [])
    } catch {
      setEditFolderSchedule([])
    }
    
    // 기존 색상 설정
    setEditFolderColor(folder.color || '')
    
    setIsEditDialogOpen(true)
  }

  const handleUpdateFolder = async () => {
    if (!selectedFolder || !editFolderName.trim()) return

    setIsEditing(true)
    try {
      const response = await fetch(`/api/folders/${selectedFolder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editFolderName.trim(),
          schedule: editFolderSchedule,
          color: editFolderColor || null,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '폴더 수정에 실패했습니다.')
      }

      await fetchFolders()
      setIsEditDialogOpen(false)
      setSelectedFolder(null)
      setEditFolderName('')
      setEditFolderSchedule([])
      setEditFolderColor('')
    } catch (error) {
      console.error('Error updating folder:', error)
      setError(error instanceof Error ? error.message : '폴더 수정에 실패했습니다.')
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('정말로 이 폴더를 삭제하시겠습니까? 폴더 내의 모든 카드도 함께 삭제됩니다.')) {
      return
    }

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '폴더 삭제에 실패했습니다.')
      }

      setFolders(prev => prev.filter(folder => folder.id !== folderId))
    } catch (error) {
      console.error('Error deleting folder:', error)
      setError(error instanceof Error ? error.message : '폴더 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">폴더 관리</h1>
            <p className="text-gray-600 mt-1">
              학습 카드를 폴더별로 정리하고 관리하세요
            </p>
          </div>
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
            >
              대시보드로 돌아가기
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setNewFolderName('')
                  setNewFolderSchedule([])
                  setNewFolderColor('')
                  setError(null)
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 폴더
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 폴더 만들기</DialogTitle>
                  <DialogDescription>
                    새로운 학습 폴더를 생성하세요
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="folderName">폴더 이름</Label>
                    <Input
                      id="folderName"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="예: 영어 단어"
                      maxLength={50}
                    />
                  </div>

                  <SchedulePicker
                    value={newFolderSchedule}
                    onChange={setNewFolderSchedule}
                    label="학습 스케줄 (선택사항)"
                    disabled={isCreating}
                  />

                  <div>
                    <Label htmlFor="folderColor">색상 (선택사항)</Label>
                    <div className="flex space-x-2 mt-2">
                      {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((colorOption) => (
                        <button
                          key={colorOption}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            newFolderColor === colorOption ? 'border-gray-400' : 'border-gray-200'
                          }`}
                          style={{ backgroundColor: colorOption }}
                          onClick={() => setNewFolderColor(newFolderColor === colorOption ? '' : colorOption)}
                          disabled={isCreating}
                        />
                      ))}
                      <button
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          newFolderColor === '' ? 'border-gray-400' : 'border-gray-200'
                        } bg-gray-100 text-xs text-gray-500 flex items-center justify-center`}
                        onClick={() => setNewFolderColor('')}
                        disabled={isCreating}
                        title="색상 없음"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      취소
                    </Button>
                    <Button onClick={handleCreateFolder} disabled={isCreating}>
                      {isCreating ? '생성 중...' : '생성'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error Alert */}
        {error && !isCreateDialogOpen && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">폴더를 불러오는 중...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && folders.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Folder className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                아직 폴더가 없습니다
              </h3>
              <p className="text-gray-600 mb-6">
                첫 번째 폴더를 만들어 학습 카드를 정리해보세요
              </p>
              <Button onClick={() => {
                setNewFolderName('')
                setNewFolderSchedule([])
                setNewFolderColor('')
                setError(null)
                setIsCreateDialogOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                첫 번째 폴더 만들기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Folders Grid */}
        {!loading && folders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => (
              <Card key={folder.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <Folder 
                        className="w-5 h-5" 
                        style={{ 
                          color: folder.color || '#2563eb' 
                        }} 
                      />
                      <CardTitle className="text-lg truncate">{folder.name}</CardTitle>
                      {folder.color && (
                        <div 
                          className="w-3 h-3 rounded-full border border-gray-300"
                          style={{ backgroundColor: folder.color }}
                          title={`폴더 색상: ${folder.color}`}
                        />
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditFolder(folder)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteFolder(folder.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs text-gray-500">
                    {folder.parent_id ? '하위 폴더' : '최상위 폴더'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {folder.flashcard_files?.length || 0}개 파일
                      </span>
                    </div>
                    <Badge variant="outline">
                      {new Date(folder.created_at).toLocaleDateString('ko-KR')}
                    </Badge>
                  </div>
                  
                  {/* 스케줄 정보 표시 */}
                  {folder.schedule && (() => {
                    try {
                      const schedule = JSON.parse(folder.schedule)
                      if (Array.isArray(schedule) && schedule.length > 0) {
                        const dayMap = {
                          monday: '월',
                          tuesday: '화', 
                          wednesday: '수',
                          thursday: '목',
                          friday: '금',
                          saturday: '토',
                          sunday: '일'
                        }
                        const scheduleText = schedule.length === 7 ? '매일' : 
                          schedule.map(day => dayMap[day as keyof typeof dayMap] || day).join(', ')
                        
                        return (
                          <div className="flex items-center space-x-1 mb-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-700">스케줄: {scheduleText}</span>
                          </div>
                        )
                      }
                    } catch {
                      return null
                    }
                    return null
                  })()}
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => router.push(`/files?folder=${folder.id}`)}
                  >
                    폴더 열기
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 폴더 수정 다이얼로그 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>폴더 수정</DialogTitle>
              <DialogDescription>
                폴더 정보를 수정하세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editFolderName">폴더 이름</Label>
                <Input
                  id="editFolderName"
                  value={editFolderName}
                  onChange={(e) => setEditFolderName(e.target.value)}
                  placeholder="폴더 이름을 입력하세요"
                  maxLength={50}
                />
              </div>

              <SchedulePicker
                value={editFolderSchedule}
                onChange={setEditFolderSchedule}
                label="학습 스케줄 (선택사항)"
                disabled={isEditing}
              />

              <div>
                <Label htmlFor="editFolderColor">색상 (선택사항)</Label>
                <div className="flex space-x-2 mt-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((colorOption) => (
                    <button
                      key={colorOption}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        editFolderColor === colorOption ? 'border-gray-400' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: colorOption }}
                      onClick={() => setEditFolderColor(editFolderColor === colorOption ? '' : colorOption)}
                      disabled={isEditing}
                    />
                  ))}
                  <button
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      editFolderColor === '' ? 'border-gray-400' : 'border-gray-200'
                    } bg-gray-100 text-xs text-gray-500 flex items-center justify-center`}
                    onClick={() => setEditFolderColor('')}
                    disabled={isEditing}
                    title="색상 없음"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isEditing}
              >
                취소
              </Button>
              <Button
                onClick={handleUpdateFolder}
                disabled={isEditing || !editFolderName.trim()}
              >
                {isEditing ? '수정 중...' : '수정'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}