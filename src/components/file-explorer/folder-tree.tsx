'use client'

import { useState, useEffect } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { ChevronRight, ChevronDown, Folder, FolderPlus, File, FileText, MoreHorizontal, Trash2, Edit3, Move } from 'lucide-react'
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
import { FolderWithChildren, DayOfWeek } from '@/lib/database'
import SchedulePicker from '@/components/scheduling/schedule-picker'

// Drag and drop types
const ItemTypes = {
  FOLDER: 'folder',
  FILE: 'file',
}

interface DragItem {
  id: string
  type: string
  name: string
}

interface FolderTreeProps {
  onFileSelect?: (fileId: string) => void
  onFolderSelect?: (folderId: string, folder?: any) => void
  selectedFileId?: string
  selectedFolderId?: string
}

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId: string | null
  onSuccess: () => void
}

interface EditFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: FolderWithChildren
  onSuccess: () => void
}

export function FolderTree({ onFileSelect, onFolderSelect, selectedFileId, selectedFolderId }: FolderTreeProps) {
  const { user } = useAuth()
  const [folders, setFolders] = useState<FolderWithChildren[]>([])
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedFolderForCreate, setSelectedFolderForCreate] = useState<string | null>(null)
  const [selectedFolderForEdit, setSelectedFolderForEdit] = useState<FolderWithChildren | null>(null)

  const fetchFolders = async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/folders?userId=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        setFolders(data)
      } else {
        console.error('Failed to fetch folders')
      }
    } catch (error) {
      console.error('Error fetching folders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [user])

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleCreateFolder = (parentId: string | null = null) => {
    setSelectedFolderForCreate(parentId)
    setCreateDialogOpen(true)
  }

  const handleEditFolder = (folder: FolderWithChildren) => {
    setSelectedFolderForEdit(folder)
    setEditDialogOpen(true)
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('이 폴더와 모든 하위 항목이 삭제됩니다. 계속하시겠습니까?')) {
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

      if (response.ok) {
        fetchFolders()
      } else {
        console.error('Failed to delete folder')
      }
    } catch (error) {
      console.error('Error deleting folder:', error)
    }
  }

  const handleMoveItem = async (dragItem: DragItem, targetFolderId: string | null) => {
    try {
      if (dragItem.type === ItemTypes.FOLDER) {
        const response = await fetch(`/api/folders/${dragItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parentId: targetFolderId,
            userId: user?.id,
          }),
        })

        if (response.ok) {
          fetchFolders()
        } else {
          console.error('Failed to move folder')
        }
      } else if (dragItem.type === ItemTypes.FILE) {
        if (targetFolderId) {
          const response = await fetch(`/api/files/${dragItem.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              folderId: targetFolderId,
              userId: user?.id,
            }),
          })

          if (response.ok) {
            fetchFolders()
          } else {
            console.error('Failed to move file')
          }
        }
      }
    } catch (error) {
      console.error('Error moving item:', error)
    }
  }

  const DraggableFolder = ({ folder, level }: { folder: FolderWithChildren; level: number }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.FOLDER,
      item: { id: folder.id, type: ItemTypes.FOLDER, name: folder.name },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }))

    const [{ isOver, canDrop }, drop] = useDrop(() => ({
      accept: [ItemTypes.FOLDER, ItemTypes.FILE],
      drop: (item: DragItem) => {
        if (item.id !== folder.id) {
          handleMoveItem(item, folder.id)
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }))

    const isExpanded = expandedFolders.has(folder.id)
    const hasChildren = folder.children && folder.children.length > 0
    const hasFiles = folder.files && folder.files.length > 0
    const isSelected = selectedFolderId === folder.id

    const dragDropRef = (node: HTMLDivElement | null) => {
      drag(drop(node))
    }

    return (
      <div 
        ref={dragDropRef} 
        key={folder.id} 
        className="select-none"
        style={{ opacity: isDragging ? 0.5 : 1 }}
      >
        <div
          className={`
            flex items-center py-1.5 px-2 hover:bg-gray-100 cursor-pointer rounded transition-colors
            ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}
            ${isOver && canDrop ? 'bg-green-50 border border-green-300' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => onFolderSelect?.(folder.id, folder)}
        >
          <div className="flex items-center flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (hasChildren || hasFiles) {
                  toggleFolder(folder.id)
                }
              }}
              className="flex items-center justify-center w-6 h-6 hover:bg-gray-200 rounded"
            >
              {(hasChildren || hasFiles) ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <div className="w-4 h-4" />
              )}
            </button>

            <Folder 
              className="w-4 h-4 mx-2 flex-shrink-0" 
              style={{ 
                color: folder.color || '#2563eb' 
              }} 
            />
            
            <span className="text-sm truncate" title={folder.name}>
              {folder.name}
            </span>

            {folder.color && (
              <div 
                className="w-2 h-2 rounded-full border border-gray-300 ml-2 flex-shrink-0"
                style={{ backgroundColor: folder.color }}
                title={`폴더 색상: ${folder.color}`}
              />
            )}

            {folder.schedule && (() => {
              try {
                const schedule = JSON.parse(folder.schedule)
                return Array.isArray(schedule) && schedule.length > 0
              } catch {
                return false
              }
            })() && (
              <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                예약됨
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCreateFolder(folder.id)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                하위 폴더 만들기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                <Edit3 className="w-4 h-4 mr-2" />
                폴더 수정
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDeleteFolder(folder.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                폴더 삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div>
            {/* Render child folders */}
            {folder.children?.map(child => (
              <DraggableFolder key={child.id} folder={child} level={level + 1} />
            ))}
            
            {/* Render files in this folder */}
            {folder.files?.map(file => (
              <DraggableFile 
                key={file.id} 
                file={file} 
                level={level + 1}
                isSelected={selectedFileId === file.id}
                onSelect={() => onFileSelect?.(file.id)}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const DraggableFile = ({ 
    file, 
    level, 
    isSelected, 
    onSelect 
  }: { 
    file: any; 
    level: number; 
    isSelected: boolean; 
    onSelect: () => void 
  }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: ItemTypes.FILE,
      item: { id: file.id, type: ItemTypes.FILE, name: file.name },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }))

    const dragRef = (node: HTMLDivElement | null) => {
      drag(node)
    }

    return (
      <div
        ref={dragRef}
        className={`
          flex items-center py-1.5 px-2 hover:bg-gray-100 cursor-pointer rounded transition-colors
          ${isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''}
        `}
        style={{ 
          paddingLeft: `${level * 20 + 8}px`,
          opacity: isDragging ? 0.5 : 1 
        }}
        onClick={onSelect}
      >
        <div className="w-6 h-6" /> {/* Spacer for alignment */}
        <FileText className="w-4 h-4 text-gray-600 mx-2 flex-shrink-0" />
        <span className="text-sm truncate" title={file.name}>
          {file.name}
        </span>
        
        {file.schedule && (() => {
          try {
            const schedule = JSON.parse(file.schedule)
            return Array.isArray(schedule) && schedule.length > 0
          } catch {
            return false
          }
        })() && (
          <div className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
            예약됨
          </div>
        )}
      </div>
    )
  }

  const renderFolderItem = (folder: FolderWithChildren, level = 0) => {
    return <DraggableFolder key={folder.id} folder={folder} level={level} />
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">파일 탐색기</h3>
        <Button
          size="sm"
          onClick={() => handleCreateFolder()}
          className="text-xs"
        >
          <FolderPlus className="w-4 h-4 mr-1" />
          새 폴더
        </Button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {folders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">폴더가 없습니다.</p>
            <p className="text-xs text-gray-400 mt-1">새 폴더를 만들어 시작하세요.</p>
          </div>
        ) : (
          <div className="py-2">
            {folders.map(folder => renderFolderItem(folder))}
          </div>
        )}
      </div>

      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        parentId={selectedFolderForCreate}
        onSuccess={() => {
          fetchFolders()
          setCreateDialogOpen(false)
        }}
      />

      {selectedFolderForEdit && (
        <EditFolderDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          folder={selectedFolderForEdit}
          onSuccess={() => {
            fetchFolders()
            setEditDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}

function CreateFolderDialog({ open, onOpenChange, parentId, onSuccess }: CreateFolderDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState<DayOfWeek[]>([])
  const [color, setColor] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          parentId,
          schedule,
          color: color || null,
          userId: user?.id,
        }),
      })

      if (response.ok) {
        setName('')
        setSchedule([])
        setColor('')
        onSuccess()
      } else {
        console.error('Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 폴더 만들기</DialogTitle>
          <DialogDescription>
            {parentId ? '하위 폴더' : '루트 폴더'}를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folderName">폴더 이름</Label>
              <Input
                id="folderName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="폴더 이름을 입력하세요"
                disabled={loading}
                autoFocus
              />
            </div>

            <SchedulePicker
              value={schedule}
              onChange={setSchedule}
              label="학습 스케줄 (선택사항)"
              disabled={loading}
            />

            <div className="space-y-2">
              <Label htmlFor="folderColor">색상 (선택사항)</Label>
              <div className="flex space-x-2">
                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === colorOption ? 'border-gray-400' : 'border-gray-200'
                    }`}
                    style={{ backgroundColor: colorOption }}
                    onClick={() => setColor(color === colorOption ? '' : colorOption)}
                    disabled={loading}
                  />
                ))}
                <button
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === '' ? 'border-gray-400' : 'border-gray-200'
                  } bg-gray-100 text-xs text-gray-500 flex items-center justify-center`}
                  onClick={() => setColor('')}
                  disabled={loading}
                  title="색상 없음"
                >
                  ×
                </button>
              </div>
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
              {loading ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditFolderDialog({ open, onOpenChange, folder, onSuccess }: EditFolderDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState(folder.name)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setName(folder.name)
  }, [folder.name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/folders/${folder.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          userId: user?.id,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        console.error('Failed to update folder')
      }
    } catch (error) {
      console.error('Error updating folder:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>폴더 수정</DialogTitle>
          <DialogDescription>
            폴더 정보를 수정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFolderName">폴더 이름</Label>
              <Input
                id="editFolderName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="폴더 이름을 입력하세요"
                disabled={loading}
                autoFocus
              />
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