'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FlipCard } from './flip-card'
import { StudyControls, StudyResponse } from './study-controls'
import { StudyProgress } from './study-progress'
import { LearningSession, SessionCard, LearningSessionConfig } from '@/services/flashcard/learning-session'
import { UserResponse } from '@/services/flashcard/anki-algorithm'
import { ArrowLeft, Pause, Play, RotateCcw, X } from 'lucide-react'

interface LearningScreenProps {
  fileId: string
  userId: string
  cards: SessionCard[]
  onSessionComplete?: (stats: any) => void
  onExit?: () => void
}

export function LearningScreen({ 
  fileId, 
  userId, 
  cards, 
  onSessionComplete, 
  onExit 
}: LearningScreenProps) {
  const router = useRouter()
  
  // Session state
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null)
  const [currentCard, setCurrentCard] = useState<SessionCard | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [sessionStats, setSessionStats] = useState<any>(null)
  const [isSessionActive, setIsSessionActive] = useState(true)
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now())
  const [studyStartTime] = useState<number>(Date.now())

  // Session configuration
  const sessionConfig: LearningSessionConfig = {
    maxNewCards: 10,
    maxReviewCards: 50,
    learningAheadLimit: 10, // 10 minutes ahead
  }

  // Initialize learning session
  useEffect(() => {
    const initSession = async () => {
      const session = new LearningSession(userId, fileId, sessionConfig)
      await session.initializeSession(cards)
      
      setLearningSession(session)
      setCurrentCard(session.getCurrentCard())
      setCardStartTime(Date.now())
    }

    if (cards.length > 0) {
      initSession()
    }
  }, [cards, userId, fileId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isProcessing) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          if (!showAnswer) {
            handleShowAnswer()
          }
          break
        case '1':
          e.preventDefault()
          if (showAnswer) handleResponse('again')
          break
        case '2':
          e.preventDefault()
          if (showAnswer) handleResponse('hard')
          break
        case '3':
          e.preventDefault()
          if (showAnswer) handleResponse('good')
          break
        case '4':
          e.preventDefault()
          if (showAnswer) handleResponse('easy')
          break
        case 'u':
          e.preventDefault()
          handleUndo()
          break
        case 'Escape':
          e.preventDefault()
          handlePause()
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showAnswer, isProcessing])

  const handleShowAnswer = useCallback(() => {
    if (!showAnswer && !isProcessing) {
      setShowAnswer(true)
    }
  }, [showAnswer, isProcessing])

  const handleFlip = useCallback(() => {
    setShowAnswer(!showAnswer)
  }, [showAnswer])

  const handleResponse = useCallback(async (response: StudyResponse) => {
    if (!learningSession || !currentCard || isProcessing) return

    setIsProcessing(true)

    try {
      const responseTime = Date.now() - cardStartTime
      const ankiResponse: UserResponse = response as UserResponse
      
      const { updateResult, nextCard } = await learningSession.processResponse(ankiResponse, responseTime)
      
      // Update session stats
      setSessionStats(learningSession.getStats())
      
      // Move to next card or end session
      if (nextCard) {
        setCurrentCard(nextCard)
        setShowAnswer(false)
        setCardStartTime(Date.now())
      } else {
        // Session completed
        const finalResults = learningSession.endSession()
        setIsSessionActive(false)
        onSessionComplete?.(finalResults)
      }

    } catch (error) {
      console.error('Error processing response:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [learningSession, currentCard, cardStartTime, onSessionComplete, isProcessing])

  const handleUndo = useCallback(() => {
    if (!learningSession || isProcessing) return

    const success = learningSession.undoLastReview()
    if (success) {
      const undoneCard = learningSession.getCurrentCard()
      setCurrentCard(undoneCard)
      setShowAnswer(false)
      setCardStartTime(Date.now())
      setSessionStats(learningSession.getStats())
    }
  }, [learningSession, isProcessing])

  const handlePause = useCallback(() => {
    setIsSessionActive(!isSessionActive)
  }, [isSessionActive])

  const handleExit = useCallback(() => {
    if (learningSession && isSessionActive) {
      learningSession.endSession()
    }
    onExit?.()
    router.push('/folders')
  }, [learningSession, isSessionActive, onExit, router])

  const handleTTS = useCallback((text: string, language?: string) => {
    // Check if ResponsiveVoice is available
    if (typeof window !== 'undefined' && (window as any).responsiveVoice) {
      const rv = (window as any).responsiveVoice;
      
      // Detect language and choose appropriate voice
      let voiceName = 'UK English Female'; // Default voice
      
      // Language detection for better voice selection
      const hasKorean = /[가-힣]/.test(text);
      const hasJapanese = /[ひらがなカタカナ]/.test(text);
      const hasChinese = /[\u4e00-\u9fff]/.test(text);
      
      if (hasKorean) {
        voiceName = 'Korean Female';
      } else if (hasJapanese) {
        voiceName = 'Japanese Female';
      } else if (hasChinese) {
        voiceName = 'Chinese Female';
      } else {
        // For English and other languages, use high quality English voice
        voiceName = 'US English Female';
      }
      
      // Speak with ResponsiveVoice
      rv.speak(text, voiceName, {
        rate: 0.8, // Slightly slower for learning
        pitch: 1,
        volume: 1
      });
    } 
    // Fallback to Web Speech API
    else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Better language setting
      if (language && language !== 'auto') {
        utterance.lang = language
      } else {
        // Auto-detect and set appropriate language
        const hasKorean = /[가-힣]/.test(text);
        const hasJapanese = /[ひらがなカタカナ]/.test(text);
        
        if (hasKorean) {
          utterance.lang = 'ko-KR';
        } else if (hasJapanese) {
          utterance.lang = 'ja-JP';
        } else {
          utterance.lang = 'en-US';
        }
      }
      
      utterance.rate = 0.8; // Slower for learning
      speechSynthesis.speak(utterance)
    }
  }, [])

  // Get current session statistics for progress display
  const getProgressData = useCallback(() => {
    if (!learningSession) {
      return {
        currentCard: 0,
        totalCards: 0,
        newCards: 0,
        learningCards: 0, 
        reviewCards: 0,
        completedCards: 0,
        studyTime: 0,
        accuracy: undefined
      }
    }

    const progress = learningSession.getProgress()
    const stats = learningSession.getStats()
    const remaining = learningSession.getRemainingCardsByStatus()
    const currentTime = Math.floor((Date.now() - studyStartTime) / 1000)

    return {
      currentCard: progress.current + 1,
      totalCards: progress.total,
      newCards: remaining.new,
      learningCards: remaining.learning,
      reviewCards: remaining.review,
      completedCards: stats.completedCards,
      studyTime: currentTime,
      accuracy: stats.completedCards > 0 ? stats.accuracyRate : undefined
    }
  }, [learningSession, studyStartTime])

  // Loading state
  if (!learningSession || !currentCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-medium text-gray-700">학습 세션을 준비하고 있습니다...</div>
        </Card>
      </div>
    )
  }

  // Session completed state
  if (!isSessionActive && sessionStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">수고하셨습니다!</h2>
            <p className="text-gray-600">학습 세션이 완료되었습니다</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{sessionStats.completedCards}</div>
              <div className="text-sm text-blue-700">학습한 카드</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{Math.round(sessionStats.accuracyRate)}%</div>
              <div className="text-sm text-green-700">정답률</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {Math.floor(sessionStats.studyDuration / 60)}분
              </div>
              <div className="text-sm text-orange-700">학습 시간</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{sessionStats.newCardsLearned}</div>
              <div className="text-sm text-purple-700">새로 학습</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => router.push('/folders')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white"
            >
              폴더로 돌아가기
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="px-6 py-3"
            >
              다시 학습하기
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleExit}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-800 flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">나가기</span>
            </Button>
            
            <div className="text-sm sm:text-base text-gray-600 font-medium text-center px-2">
              {getProgressData().currentCard} / {getProgressData().totalCards}
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                onClick={handleUndo}
                variant="ghost"
                size="sm"
                disabled={!learningSession || learningSession.getStats().completedCards === 0}
                className="text-gray-600 hover:text-gray-800"
                title="실행취소"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handlePause}
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-800"
                title={isSessionActive ? "일시정지" : "계속하기"}
              >
                {isSessionActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Progress Panel (Mobile: top, Desktop: left) */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <StudyProgress
              {...getProgressData()}
              className="lg:sticky lg:top-24"
            />
          </div>

          {/* Main Study Area */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="space-y-4 lg:space-y-6">
              {/* Flashcard */}
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <FlipCard
                    card={currentCard}
                    showAnswer={showAnswer}
                    onFlip={handleFlip}
                    onTTS={handleTTS}
                    className="min-h-[300px] sm:min-h-[350px] md:min-h-[400px]"
                  />
                </div>
              </div>

              {/* Study Controls */}
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <StudyControls
                    onResponse={handleResponse}
                    showAnswerFirst={!showAnswer}
                    onShowAnswer={handleShowAnswer}
                    disabled={isProcessing}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Session Paused Overlay */}
      {!isSessionActive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-8 text-center max-w-md">
            <div className="mb-4">
              <Pause className="w-12 h-12 mx-auto text-gray-600 mb-2" />
              <h3 className="text-xl font-semibold text-gray-800">학습 일시정지</h3>
              <p className="text-gray-600 mt-2">계속하려면 재생 버튼을 클릭하세요</p>
            </div>
            
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handlePause}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                계속하기
              </Button>
              
              <Button
                onClick={handleExit}
                variant="outline"
                className="px-6 py-2"
              >
                <X className="w-4 h-4 mr-2" />
                종료
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}