'use client'

import { useState, useEffect } from 'react'
import { Volume2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface FlashcardData {
  id: string
  front: string
  back: string
  notes?: string | null
  language?: string | null
}

interface FlipCardProps {
  card: FlashcardData
  showAnswer: boolean
  onFlip: () => void
  onTTS?: (text: string, language?: string) => void
  className?: string
}

export function FlipCard({ card, showAnswer, onFlip, onTTS, className = '' }: FlipCardProps) {
  const [isFlipping, setIsFlipping] = useState(false)
  const [ttsReady, setTtsReady] = useState(false)

  // Check if ResponsiveVoice is loaded
  useEffect(() => {
    const checkTTS = () => {
      if (typeof window !== 'undefined') {
        const rvReady = !!(window as any).responsiveVoice;
        const webSpeechReady = 'speechSynthesis' in window;
        setTtsReady(rvReady || webSpeechReady);
      }
    };

    // Check immediately
    checkTTS();

    // Check again after a delay in case ResponsiveVoice is still loading
    const timer = setTimeout(checkTTS, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleFlip = () => {
    if (isFlipping) return
    
    setIsFlipping(true)
    onFlip()
    
    // Reset flip animation after animation completes
    setTimeout(() => setIsFlipping(false), 600)
  }

  const handleTTS = (text: string) => {
    if (onTTS) {
      onTTS(text, card.language || 'auto')
    }
  }

  return (
    <div className={`relative w-full h-96 perspective-1000 ${className}`}>
      <div 
        className={`
          relative w-full h-full transition-transform duration-600 transform-style-preserve-3d cursor-pointer
          ${showAnswer ? 'rotate-y-180' : ''}
          ${isFlipping ? 'pointer-events-none' : ''}
        `}
        onClick={handleFlip}
      >
        {/* Front of card */}
        <Card className={`
          absolute inset-0 w-full h-full backface-hidden
          flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 
          bg-gradient-to-br from-blue-50 to-indigo-100 
          border-2 border-blue-200 hover:border-blue-300 transition-colors
          shadow-lg hover:shadow-xl
        `}>
          <div className="text-center space-y-2 sm:space-y-4 w-full">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-blue-600 mb-2 sm:mb-4">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">카드를 클릭하여 답을 확인하세요</span>
              <span className="sm:hidden">답 보기</span>
            </div>
            
            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-800 leading-tight break-words">
              {card.front}
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleTTS(card.front)
                }}
                disabled={!ttsReady}
                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs sm:text-sm disabled:opacity-50"
              >
                <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">발음 듣기</span>
                <span className="sm:hidden">발음</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Back of card */}
        <Card className={`
          absolute inset-0 w-full h-full backface-hidden rotate-y-180
          flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8
          bg-gradient-to-br from-green-50 to-emerald-100
          border-2 border-green-200 hover:border-green-300 transition-colors
          shadow-lg hover:shadow-xl
        `}>
          <div className="text-center space-y-2 sm:space-y-4 w-full">
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-green-600 mb-2 sm:mb-4">
              <span>정답</span>
            </div>
            
            <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 leading-tight break-words">
              {card.back}
            </div>
            
            {card.notes && (
              <div className="mt-3 sm:mt-6 p-3 sm:p-4 bg-white/70 rounded-lg border border-green-200">
                <div className="text-xs sm:text-sm text-green-700 font-medium mb-1 sm:mb-2">예시문/메모:</div>
                <div className="text-gray-700 text-sm sm:text-base leading-relaxed break-words">
                  {card.notes}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mt-3 sm:mt-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleTTS(card.back)
                }}
                disabled={!ttsReady}
                className="text-green-600 border-green-200 hover:bg-green-50 text-xs sm:text-sm disabled:opacity-50"
              >
                <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                <span className="hidden sm:inline">발음 듣기</span>
                <span className="sm:hidden">발음</span>
              </Button>

              {card.notes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTTS(card.notes)
                  }}
                  disabled={!ttsReady}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs sm:text-sm disabled:opacity-50"
                >
                  <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  <span className="hidden sm:inline">예시문 발음</span>
                  <span className="sm:hidden">예시문</span>
                </Button>
              )}
            </div>

            <div className="text-xs text-green-600 mt-2 sm:mt-4 opacity-75">
              <span className="hidden sm:inline">다시 클릭하여 앞면으로 돌아가기</span>
              <span className="sm:hidden">탭하여 앞면으로</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Loading overlay during flip */}
      {isFlipping && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-lg pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}