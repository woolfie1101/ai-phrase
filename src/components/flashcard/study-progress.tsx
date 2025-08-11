'use client'

import { Clock, Target, TrendingUp, BookOpen, Zap, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface StudyProgressProps {
  currentCard: number
  totalCards: number
  newCards: number
  learningCards: number
  reviewCards: number
  completedCards: number
  studyTime: number // in seconds
  accuracy?: number // percentage
  className?: string
}

export function StudyProgress({
  currentCard,
  totalCards,
  newCards,
  learningCards,
  reviewCards,
  completedCards,
  studyTime,
  accuracy,
  className = ''
}: StudyProgressProps) {
  const progressPercentage = totalCards > 0 ? (completedCards / totalCards) * 100 : 0
  const remainingCards = totalCards - completedCards

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`
  }

  const formatAccuracy = (accuracy: number): string => {
    return `${Math.round(accuracy)}%`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Progress Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-800">학습 진행률</span>
          </div>
          <span className="text-sm text-gray-600">
            {completedCards} / {totalCards}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="text-center text-sm font-medium text-gray-700">
          {Math.round(progressPercentage)}% 완료
        </div>
      </Card>

      {/* Current Card Info */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-gray-800">현재 카드</span>
          </div>
          <Badge variant="outline" className="text-lg font-bold px-3 py-1">
            {currentCard} / {totalCards}
          </Badge>
        </div>
      </Card>

      {/* Cards by Status */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-purple-600" />
          <span className="font-semibold text-gray-800">카드 현황</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">새로운 카드</span>
            <Badge className="bg-blue-500 hover:bg-blue-500">
              {newCards}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
            <span className="text-sm text-yellow-700">학습중</span>
            <Badge className="bg-yellow-500 hover:bg-yellow-500">
              {learningCards}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
            <span className="text-sm text-green-700">복습</span>
            <Badge className="bg-green-500 hover:bg-green-500">
              {reviewCards}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">남은 카드</span>
            <Badge variant="outline">
              {remainingCards}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Study Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-semibold text-gray-800">학습 시간</span>
          </div>
          <div className="text-xl font-bold text-orange-600">
            {formatTime(studyTime)}
          </div>
        </Card>

        {accuracy !== undefined && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-gray-800">정답률</span>
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatAccuracy(accuracy)}
            </div>
          </Card>
        )}
      </div>

      {/* Motivational Message */}
      {progressPercentage > 0 && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-800">
              {progressPercentage < 25 && "좋은 시작이에요! 계속 진행하세요 💪"}
              {progressPercentage >= 25 && progressPercentage < 50 && "훌륭해요! 절반까지 거의 다 왔어요 🚀"}
              {progressPercentage >= 50 && progressPercentage < 75 && "반을 넘었네요! 계속 화이팅! 🔥"}
              {progressPercentage >= 75 && progressPercentage < 100 && "거의 다 끝났어요! 조금만 더! ⭐"}
              {progressPercentage >= 100 && "축하합니다! 모든 카드를 완료했어요! 🎉"}
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}