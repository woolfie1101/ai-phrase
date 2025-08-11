'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { useAuth } from '@/context/auth/auth-context'
import { LearningScreen } from '@/components/flashcard/learning-screen'
import { SessionCard } from '@/services/flashcard/learning-session'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react'

export default function LearnPage() {
  return (
    <ProtectedRoute>
      <LearnPageContent />
    </ProtectedRoute>
  )
}

function LearnPageContent() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const fileId = params.fileId as string
  
  const [cards, setCards] = useState<SessionCard[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCardsAndUser() {
      try {
        setLoading(true)
        setError(null)

        if (!user) {
          router.push('/auth/login')
          return
        }

        // Get file information
        const fileResponse = await fetch(`/api/files/${fileId}?userId=${user.id}`)
        if (!fileResponse.ok) {
          throw new Error('파일을 찾을 수 없습니다.')
        }
        const fileData = await fileResponse.json()
        setFileName(fileData.name)

        // Get flashcards for this file
        const flashcardsResponse = await fetch(`/api/flashcards?fileId=${fileId}&userId=${user.id}`)
        if (!flashcardsResponse.ok) {
          throw new Error('플래시카드를 불러올 수 없습니다.')
        }
        const flashcardsData = await flashcardsResponse.json()
        const flashcards = flashcardsData.flashcards

        if (!flashcards || flashcards.length === 0) {
          setError('이 파일에는 플래시카드가 없습니다.')
          return
        }

        // Transform flashcards to SessionCard format
        const sessionCards: SessionCard[] = flashcards.map((card: any) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          notes: card.notes,
          language: card.language,
          file_id: card.file_id,
          status: card.status as 'new' | 'learning' | 'review' | 'suspended',
          ease_factor: card.ease_factor,
          interval: card.interval,
          repetitions: card.repetitions,
          due_date: card.due_date,
          algorithm_data: card.algorithm_data as any,
          created_at: card.created_at,
          updated_at: card.updated_at,
          user_id: card.user_id
        }))

        setCards(sessionCards)

      } catch (error) {
        console.error('Error loading cards:', error)
        setError('플래시카드를 불러오는 중 오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }

    if (fileId && user) {
      loadCardsAndUser()
    }
  }, [fileId, user, router])

  const handleSessionComplete = async (finalResults: any) => {
    try {
      const { stats, studySession } = finalResults

      // Save study session via API
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...studySession,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        console.error('Error saving study session')
      }

      // Update flashcards in database based on session results
      // This would require implementing batch updates based on the completed cards
      // For now, we'll just show the completion screen
      
      console.log('Session completed:', stats)
    } catch (error) {
      console.error('Error handling session completion:', error)
    }
  }

  const handleExit = () => {
    router.push('/folders')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700 mb-2">플래시카드를 불러오는 중...</div>
          <div className="text-sm text-gray-500">{fileName}</div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.push('/folders')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              폴더로 돌아가기
            </Button>
            
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="px-6 py-2"
            >
              다시 시도
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">학습할 카드가 없습니다</h2>
          <p className="text-gray-600 mb-2">{fileName}</p>
          <p className="text-sm text-gray-500 mb-6">이 파일에는 아직 플래시카드가 생성되지 않았습니다.</p>
          
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => router.push('/folders')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              폴더로 돌아가기
            </Button>
            
            <Button
              onClick={() => router.push(`/files`)}
              variant="outline"
              className="px-6 py-2"
            >
              파일 관리로 이동
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <LearningScreen
      fileId={fileId}
      userId={user?.id || ''}
      cards={cards}
      onSessionComplete={handleSessionComplete}
      onExit={handleExit}
    />
  )
}