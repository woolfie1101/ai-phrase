'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth/auth-context'
import { Card, CardContent } from '@/components/ui/card'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading, session } = useAuth()
  const router = useRouter()
  
  // 디버깅용 로그 - 더 자세히
  console.log('ProtectedRoute render - User:', !!user, user?.id)
  console.log('ProtectedRoute render - Loading:', loading)
  console.log('ProtectedRoute render - Session:', !!session)
  
  // 클라이언트에서만 pathname 로그
  useEffect(() => {
    console.log('ProtectedRoute render - Current pathname:', window.location.pathname)
  }, [])

  useEffect(() => {
    console.log('ProtectedRoute useEffect - Loading:', loading, 'User:', !!user, 'Session:', !!session)
    
    // 로딩이 완료되고 사용자가 없을 때만 리다이렉트 (세션 체크 제거)
    if (!loading && !user) {
      console.log('ProtectedRoute redirecting to login - no user')
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // 로딩 중인 경우만 로딩 화면 표시
  if (loading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>로딩 중...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}

// Hook for protected pages
export function useProtectedRoute() {
  const { user, loading, session } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user && !session) {
      router.push('/auth/login')
    }
  }, [user, loading, session, router])

  return { user, loading, isAuthenticated: !!user }
}