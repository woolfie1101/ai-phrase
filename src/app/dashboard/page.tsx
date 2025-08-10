'use client'

import { useAuth } from '@/context/auth/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user, profile, signOut, loading } = useAuth()
  const router = useRouter()
  
  // 디버깅용 로그
  console.log('Dashboard - User:', user)
  console.log('Dashboard - Profile:', profile)
  console.log('Dashboard - Loading:', loading)

  const handleSignOut = async () => {
    await signOut()
  }

  const handleFolderManagement = () => {
    router.push('/folders')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-1">
              안녕하세요, {profile?.display_name || user?.email}님!
            </p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            로그아웃
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">연속 학습일</CardTitle>
              <span className="text-2xl">🔥</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profile?.streak_count || 0}일</div>
              <p className="text-xs text-muted-foreground">
                마지막 학습: {profile?.last_study_date || '없음'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">오늘 학습할 카드</CardTitle>
              <span className="text-2xl">📚</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                새로운 카드 0개, 복습 카드 0개
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">전체 폴더</CardTitle>
              <span className="text-2xl">📁</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                학습 자료를 추가해보세요
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button className="h-20 flex flex-col space-y-2">
            <span className="text-2xl">📖</span>
            <span>학습 시작</span>
          </Button>

          <Button 
            variant="outline" 
            className="h-20 flex flex-col space-y-2"
            onClick={handleFolderManagement}
          >
            <span className="text-2xl">📁</span>
            <span>폴더 관리</span>
          </Button>

          <Button variant="outline" className="h-20 flex flex-col space-y-2">
            <span className="text-2xl">➕</span>
            <span>카드 추가</span>
          </Button>

          <Button variant="outline" className="h-20 flex flex-col space-y-2">
            <span className="text-2xl">📊</span>
            <span>학습 통계</span>
          </Button>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>최근 학습 기록을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              아직 학습 기록이 없습니다. 첫 번째 카드를 학습해보세요!
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}