'use client'

import { RotateCcw, Zap, CheckCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type StudyResponse = 'again' | 'hard' | 'good' | 'easy'

interface StudyControlsProps {
  onResponse: (response: StudyResponse) => void
  showAnswerFirst?: boolean
  onShowAnswer?: () => void
  disabled?: boolean
  className?: string
}

export function StudyControls({ 
  onResponse, 
  showAnswerFirst = false, 
  onShowAnswer, 
  disabled = false,
  className = '' 
}: StudyControlsProps) {
  
  if (showAnswerFirst && onShowAnswer) {
    return (
      <div className={`flex justify-center ${className}`}>
        <Button
          onClick={onShowAnswer}
          disabled={disabled}
          size="lg"
          className="px-8 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
        >
          답 보기
        </Button>
      </div>
    )
  }

  const responses = [
    {
      key: 'again' as StudyResponse,
      label: '다시',
      description: '완전히 틀렸거나 기억하지 못함',
      icon: RotateCcw,
      color: 'bg-red-500 hover:bg-red-600 border-red-500',
      textColor: 'text-white',
      shortcut: '1',
    },
    {
      key: 'hard' as StudyResponse,
      label: '어려움',
      description: '기억하긴 했지만 어려웠음',
      icon: Zap,
      color: 'bg-orange-500 hover:bg-orange-600 border-orange-500',
      textColor: 'text-white',
      shortcut: '2',
    },
    {
      key: 'good' as StudyResponse,
      label: '보통',
      description: '조금 생각한 후 기억함',
      icon: CheckCircle,
      color: 'bg-green-500 hover:bg-green-600 border-green-500',
      textColor: 'text-white',
      shortcut: '3',
    },
    {
      key: 'easy' as StudyResponse,
      label: '쉬움',
      description: '즉시 기억하고 쉬웠음',
      icon: Sparkles,
      color: 'bg-blue-500 hover:bg-blue-600 border-blue-500',
      textColor: 'text-white',
      shortcut: '4',
    },
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-center text-gray-600 font-medium">
        이 카드를 얼마나 잘 기억하셨나요?
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {responses.map(({ key, label, description, icon: Icon, color, textColor, shortcut }) => (
          <Button
            key={key}
            onClick={() => onResponse(key)}
            disabled={disabled}
            variant="outline"
            className={`
              relative h-auto p-4 flex flex-col items-center gap-2 
              ${color} ${textColor} border-2
              hover:shadow-lg transform hover:scale-105 transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Icon className="w-6 h-6" />
            <div className="font-semibold text-lg">{label}</div>
            <div className="text-xs opacity-90 text-center leading-tight">
              {description}
            </div>
            
            {/* Keyboard shortcut indicator */}
            <div className="absolute top-2 right-2 w-6 h-6 bg-black/20 rounded-full flex items-center justify-center text-xs font-bold">
              {shortcut}
            </div>
          </Button>
        ))}
      </div>
      
      {/* Keyboard shortcuts help */}
      <div className="text-center text-sm text-gray-500 mt-4">
        키보드 단축키: 1(다시) · 2(어려움) · 3(보통) · 4(쉬움) · Space(답 보기/뒤집기)
      </div>
    </div>
  )
}