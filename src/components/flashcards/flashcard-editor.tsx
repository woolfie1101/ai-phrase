'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, Save, X, FileText, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { useAuth } from '@/context/auth/auth-context'

interface Flashcard {
  id: string
  front: string
  back: string
  notes: string | null
  language: string | null
  status: 'new' | 'learning' | 'review' | 'suspended'
  created_at: string
}

interface FlashcardEditorProps {
  fileId: string
  fileName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FlashcardEditor({ fileId, fileName, open, onOpenChange }: FlashcardEditorProps) {
  const { user } = useAuth()
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCard, setNewCard] = useState({ front: '', back: '', notes: '', language: '' })

  const fetchFlashcards = async () => {
    if (!user || !fileId) return

    try {
      const response = await fetch(`/api/flashcards?fileId=${fileId}&userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setFlashcards(data.flashcards || [])
      } else {
        console.error('Failed to fetch flashcards')
      }
    } catch (error) {
      console.error('Error fetching flashcards:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && fileId) {
      fetchFlashcards()
    }
  }, [open, fileId, user])

  const handleAddCard = async () => {
    if (!newCard.front.trim() || !newCard.back.trim()) {
      alert('공부할 단어와 뜻은 필수입니다.')
      return
    }

    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          front: newCard.front.trim(),
          back: newCard.back.trim(),
          notes: newCard.notes.trim() || null,
          language: newCard.language.trim() || null,
          userId: user?.id
        })
      })

      if (response.ok) {
        setNewCard({ front: '', back: '', notes: '', language: '' })
        setShowAddForm(false)
        fetchFlashcards()
      } else {
        console.error('Failed to create flashcard')
        alert('플래시카드 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error creating flashcard:', error)
      alert('플래시카드 생성 중 오류가 발생했습니다.')
    }
  }

  const handleUpdateCard = async () => {
    if (!editingCard || !editingCard.front.trim() || !editingCard.back.trim()) {
      alert('공부할 단어와 뜻은 필수입니다.')
      return
    }

    try {
      const response = await fetch(`/api/flashcards/${editingCard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: editingCard.front.trim(),
          back: editingCard.back.trim(),
          notes: editingCard.notes?.trim() || null,
          language: editingCard.language?.trim() || null,
          userId: user?.id
        })
      })

      if (response.ok) {
        setEditingCard(null)
        fetchFlashcards()
      } else {
        console.error('Failed to update flashcard')
        alert('플래시카드 수정에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error updating flashcard:', error)
      alert('플래시카드 수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('이 플래시카드를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`/api/flashcards/${cardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      })

      if (response.ok) {
        fetchFlashcards()
      } else {
        console.error('Failed to delete flashcard')
        alert('플래시카드 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Error deleting flashcard:', error)
      alert('플래시카드 삭제 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      new: { text: '새로운', class: 'bg-blue-100 text-blue-800' },
      learning: { text: '학습중', class: 'bg-yellow-100 text-yellow-800' },
      review: { text: '복습', class: 'bg-green-100 text-green-800' },
      suspended: { text: '중단', class: 'bg-gray-100 text-gray-800' }
    }
    const badge = badges[status as keyof typeof badges] || badges.new
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {fileName} - 플래시카드 관리
          </DialogTitle>
          <DialogDescription>
            플래시카드를 추가, 수정, 삭제할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Add New Card Form */}
              {showAddForm ? (
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-blue-900">새 플래시카드 추가</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="newFront">공부할 단어 *</Label>
                      <Input
                        id="newFront"
                        value={newCard.front}
                        onChange={(e) => setNewCard(prev => ({ ...prev, front: e.target.value }))}
                        placeholder="예: Hello"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newBack">뜻 *</Label>
                      <Input
                        id="newBack"
                        value={newCard.back}
                        onChange={(e) => setNewCard(prev => ({ ...prev, back: e.target.value }))}
                        placeholder="예: 안녕하세요"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newNotes">예시문/메모 (선택사항)</Label>
                      <Input
                        id="newNotes"
                        value={newCard.notes}
                        onChange={(e) => setNewCard(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="예: Hello, how are you?"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newLanguage">언어 (선택사항)</Label>
                      <Input
                        id="newLanguage"
                        value={newCard.language}
                        onChange={(e) => setNewCard(prev => ({ ...prev, language: e.target.value }))}
                        placeholder="예: en"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCard} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setShowAddForm(false)
                        setNewCard({ front: '', back: '', notes: '', language: '' })
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowAddForm(true)} className="w-full" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  새 플래시카드 추가
                </Button>
              )}

              {/* Flashcards List */}
              {flashcards.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>플래시카드가 없습니다.</p>
                  <p className="text-sm">새 플래시카드를 추가하여 학습을 시작하세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {flashcards.map((card) => (
                    <div key={card.id} className="bg-gray-50 p-4 rounded-lg">
                      {editingCard?.id === card.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>공부할 단어 *</Label>
                              <Input
                                value={editingCard.front}
                                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, front: e.target.value }) : null)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>뜻 *</Label>
                              <Input
                                value={editingCard.back}
                                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, back: e.target.value }) : null)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>예시문/메모</Label>
                              <Input
                                value={editingCard.notes || ''}
                                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>언어</Label>
                              <Input
                                value={editingCard.language || ''}
                                onChange={(e) => setEditingCard(prev => prev ? ({ ...prev, language: e.target.value }) : null)}
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateCard} size="sm">
                              <Save className="w-4 h-4 mr-2" />
                              저장
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setEditingCard(null)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-lg">{card.front}</span>
                              {getStatusBadge(card.status)}
                            </div>
                            <div className="text-gray-700">
                              <strong>뜻:</strong> {card.back}
                            </div>
                            {card.notes && (
                              <div className="text-gray-600">
                                <strong>예시문/메모:</strong> {card.notes}
                              </div>
                            )}
                            {card.language && (
                              <div className="text-gray-500 text-sm">
                                <strong>언어:</strong> {card.language}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCard(card)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCard(card.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}