'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { updateUserProfile } from '@/lib/supabase'

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const { user, profile, refreshProfile } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await updateUserProfile(user.id, {
        display_name: displayName,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        await refreshProfile()
        setMessage({ type: 'success', text: '프로필이 성공적으로 업데이트되었습니다.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: '프로필 업데이트 중 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">프로필 설정</h1>
          <p className="text-gray-600 mt-1">계정 정보를 관리하세요</p>
        </div>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>계정의 기본 정보를 확인하고 수정하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">닉네임</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="닉네임을 입력하세요"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? '저장 중...' : '프로필 저장'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 학습 통계 */}
          <Card>
            <CardHeader>
              <CardTitle>학습 통계</CardTitle>
              <CardDescription>나의 학습 성과를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {profile?.streak_count || 0}
                  </div>
                  <div className="text-sm text-gray-600">연속 학습일</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">총 학습 카드</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 계정 설정 */}
          <Card>
            <CardHeader>
              <CardTitle>계정 설정</CardTitle>
              <CardDescription>계정 보안 및 기타 설정을 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">비밀번호 변경</h3>
                  <p className="text-sm text-gray-600">계정 보안을 위해 정기적으로 비밀번호를 변경하세요</p>
                </div>
                <Button variant="outline">변경하기</Button>
              </div>

              <div className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">학습 알림</h3>
                  <p className="text-sm text-gray-600">학습 시간을 놓치지 않도록 알림을 설정하세요</p>
                </div>
                <Button variant="outline">설정하기</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}