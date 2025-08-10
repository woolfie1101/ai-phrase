'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DayOfWeek } from '@/lib/database'

interface SchedulePickerProps {
  value: DayOfWeek[]
  onChange: (schedule: DayOfWeek[]) => void
  label?: string
  disabled?: boolean
}

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'monday', label: '월요일', short: '월' },
  { value: 'tuesday', label: '화요일', short: '화' },
  { value: 'wednesday', label: '수요일', short: '수' },
  { value: 'thursday', label: '목요일', short: '목' },
  { value: 'friday', label: '금요일', short: '금' },
  { value: 'saturday', label: '토요일', short: '토' },
  { value: 'sunday', label: '일요일', short: '일' },
]

export function SchedulePicker({ value, onChange, label, disabled }: SchedulePickerProps) {
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(new Set(value))

  useEffect(() => {
    setSelectedDays(new Set(value))
  }, [value])

  const handleDayToggle = (day: DayOfWeek) => {
    if (disabled) return
    
    const newSelectedDays = new Set(selectedDays)
    if (newSelectedDays.has(day)) {
      newSelectedDays.delete(day)
    } else {
      newSelectedDays.add(day)
    }
    
    setSelectedDays(newSelectedDays)
    onChange(Array.from(newSelectedDays))
  }

  const handleSelectAll = () => {
    if (disabled) return
    
    if (selectedDays.size === 7) {
      // Deselect all
      setSelectedDays(new Set())
      onChange([])
    } else {
      // Select all
      const allDays = new Set(DAYS.map(d => d.value))
      setSelectedDays(allDays)
      onChange(Array.from(allDays))
    }
  }

  const handleWorkdaysOnly = () => {
    if (disabled) return
    
    const workdays = DAYS.slice(0, 5).map(d => d.value)
    const newSelectedDays = new Set(workdays)
    setSelectedDays(newSelectedDays)
    onChange(workdays)
  }

  const isAllSelected = selectedDays.size === 7
  const isWorkdaysSelected = selectedDays.size === 5 && 
    DAYS.slice(0, 5).every(day => selectedDays.has(day.value))

  return (
    <div className="space-y-3">
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}

      {/* Quick Selection Buttons */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant={isAllSelected ? "default" : "outline"}
          size="sm"
          onClick={handleSelectAll}
          disabled={disabled}
        >
          {isAllSelected ? '전체 해제' : '매일'}
        </Button>
        <Button
          type="button"
          variant={isWorkdaysSelected ? "default" : "outline"}
          size="sm"
          onClick={handleWorkdaysOnly}
          disabled={disabled}
        >
          평일만
        </Button>
      </div>

      {/* Day Selection Grid */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => {
          const isSelected = selectedDays.has(day.value)
          return (
            <button
              key={day.value}
              type="button"
              className={`
                p-2 text-xs font-medium rounded-md border transition-colors
                ${isSelected 
                  ? 'bg-blue-500 text-white border-blue-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => handleDayToggle(day.value)}
              disabled={disabled}
              title={day.label}
            >
              {day.short}
            </button>
          )
        })}
      </div>

      {/* Selected Days Summary */}
      <div className="text-sm text-gray-600">
        {selectedDays.size === 0 && (
          <span>선택된 요일이 없습니다</span>
        )}
        {selectedDays.size === 7 && (
          <span>매일 학습</span>
        )}
        {selectedDays.size > 0 && selectedDays.size < 7 && (
          <span>
            주 {selectedDays.size}일 학습 ({
              DAYS
                .filter(day => selectedDays.has(day.value))
                .map(day => day.short)
                .join(', ')
            })
          </span>
        )}
      </div>
    </div>
  )
}

export default SchedulePicker