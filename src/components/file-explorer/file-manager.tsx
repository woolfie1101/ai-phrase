'use client'

import { useState, useEffect } from 'react'
import { FileText, FilePlus, MoreHorizontal, Trash2, Edit3, Move, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/context/auth/auth-context'
import SchedulePicker from '@/components/scheduling/schedule-picker'
import { DayOfWeek } from '@/lib/database'

interface FlashcardFile {
  id: string
  name: string
  folder_id: string
  user_id: string
  study_mode: 'bidirectional' | 'front-to-back' | 'back-to-front'
  schedule: string // JSON string
  created_at: string
  updated_at: string
}

interface FileManagerProps {
  selectedFolderId: string | null
  selectedFileId?: string
  onFileSelect?: (fileId: string) => void
}

interface CreateFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderId: string
  onSuccess: () => void
}

interface EditFileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: FlashcardFile
  onSuccess: () => void
}

export function FileManager({ selectedFolderId, selectedFileId, onFileSelect }: FileManagerProps) {
  const { user } = useAuth()
  const [files, setFiles] = useState<FlashcardFile[]>([])
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedFileForEdit, setSelectedFileForEdit] = useState<FlashcardFile | null>(null)

  const fetchFiles = async () => {
    if (!selectedFolderId || !user) {
      setFiles([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/files?folderId=${selectedFolderId}&userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files)
      } else {
        console.error('Failed to fetch files')
        setFiles([])
      }
    } catch (error) {
      console.error('Error fetching files:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [selectedFolderId, user])

  const handleCreateFile = () => {
    if (selectedFolderId) {
      setCreateDialogOpen(true)
    }
  }

  const handleEditFile = (file: FlashcardFile) => {
    setSelectedFileForEdit(file)
    setEditDialogOpen(true)
  }

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('이 파일과 모든 플래시카드가 삭제됩니다. 계속하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      })

      if (response.ok) {
        fetchFiles()
      } else {
        console.error('Failed to delete file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
    }
  }

  const getStudyModeText = (mode: string) => {
    switch (mode) {
      case 'bidirectional':
        return '양방향'
      case 'front-to-back':
        return '앞→뒤'
      case 'back-to-front':
        return '뒤→앞'
      default:
        return mode
    }
  }

  const getScheduleText = (schedule: string) => {
    try {
      const days = JSON.parse(schedule) as string[]
      if (days.length === 0) return '예약 없음'
      if (days.length === 7) return '매일'
      
      const dayMap = {
        monday: '월',
        tuesday: '화',
        wednesday: '수',
        thursday: '목',
        friday: '금',
        saturday: '토',
        sunday: '일'
      }
      
      return days.map(day => dayMap[day as keyof typeof dayMap] || day).join(', ')
    } catch {
      return '예약 없음'
    }
  }

  if (!selectedFolderId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">폴더를 선택하세요</p>
          <p className="text-sm text-gray-400 mt-1">왼쪽에서 폴더를 선택하면 파일 목록이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">플래시카드 파일</h2>
          <p className="text-sm text-gray-600 mt-1">
            {files.length}개의 파일
          </p>
        </div>
        <Button onClick={handleCreateFile}>
          <FilePlus className="w-4 h-4 mr-2" />
          새 파일
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">파일이 없습니다.</p>
              <p className="text-xs text-gray-400 mt-1">새 파일을 만들어 시작하세요.</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {files.map(file => (
              <div
                key={file.id}
                className={`
                  p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors
                  ${selectedFileId === file.id ? 'bg-blue-50 border-blue-300' : ''}
                `}
                onClick={() => onFileSelect?.(file.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
                          {getStudyModeText(file.study_mode)}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {getScheduleText(file.schedule)}
                        </span>
                        <span>
                          {new Date(file.created_at).toLocaleDateString('ko-KR', {
                            year: '2-digit',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditFile(file)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        파일 수정
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Move className="w-4 h-4 mr-2" />
                        파일 이동
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        파일 삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateFileDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        folderId={selectedFolderId}
        onSuccess={() => {
          fetchFiles()
          setCreateDialogOpen(false)
        }}
      />

      {selectedFileForEdit && (
        <EditFileDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          file={selectedFileForEdit}
          onSuccess={() => {
            fetchFiles()
            setEditDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}

function CreateFileDialog({ open, onOpenChange, folderId, onSuccess }: CreateFileDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [studyMode, setStudyMode] = useState<'bidirectional' | 'front-to-back' | 'back-to-front'>('bidirectional')
  const [schedule, setSchedule] = useState<DayOfWeek[]>([])
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          folderId,
          studyMode,
          schedule,
          userId: user?.id,
        }),
      })

      if (response.ok) {
        setName('')
        setStudyMode('bidirectional')
        setSchedule([])
        onSuccess()
      } else {
        console.error('Failed to create file')
      }
    } catch (error) {
      console.error('Error creating file:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 플래시카드 파일 만들기</DialogTitle>
          <DialogDescription>
            새로운 플래시카드 파일을 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">파일 이름</Label>
              <Input
                id="fileName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="파일 이름을 입력하세요"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studyMode">학습 모드</Label>
              <select
                id="studyMode"
                value={studyMode}
                onChange={(e) => setStudyMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="bidirectional">양방향 (앞→뒤, 뒤→앞)</option>
                <option value="front-to-back">앞→뒤만</option>
                <option value="back-to-front">뒤→앞만</option>
              </select>
            </div>

            <SchedulePicker
              value={schedule}
              onChange={setSchedule}
              label="학습 스케줄 (선택사항)"
              disabled={loading}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditFileDialog({ open, onOpenChange, file, onSuccess }: EditFileDialogProps) {
  const [name, setName] = useState(file.name)
  const [studyMode, setStudyMode] = useState<'bidirectional' | 'front-to-back' | 'back-to-front'>(file.study_mode)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setName(file.name)
    setStudyMode(file.study_mode)
  }, [file])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          studyMode,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        console.error('Failed to update file')
      }
    } catch (error) {
      console.error('Error updating file:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>플래시카드 파일 수정</DialogTitle>
          <DialogDescription>
            파일 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFileName">파일 이름</Label>
              <Input
                id="editFileName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="파일 이름을 입력하세요"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editStudyMode">학습 모드</Label>
              <select
                id="editStudyMode"
                value={studyMode}
                onChange={(e) => setStudyMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="bidirectional">양방향 (앞→뒤, 뒤→앞)</option>
                <option value="front-to-back">앞→뒤만</option>
                <option value="back-to-front">뒤→앞만</option>
              </select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}