'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Starting OAuth callback handling...')
        
        // URL fragment에서 토큰 정보 처리 (안전하게)
        let hashParams
        try {
          const hash = window.location.hash.substring(1)
          console.log('Raw hash:', hash.substring(0, 50) + '...')
          hashParams = new URLSearchParams(hash)
        } catch (error) {
          console.error('Error parsing hash params:', error)
          hashParams = new URLSearchParams()
        }
        
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken) {
          console.log('Found access token in URL, setting session...')
          
          // 토큰을 사용해서 세션 설정
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          })
          
          console.log('Set session result:', sessionData, sessionError)
          
          if (sessionError) {
            console.error('Error setting session:', sessionError)
            router.replace('/auth/login?error=session_error')
            return
          }

          if (sessionData.session) {
            console.log('Session set successfully, redirecting to dashboard')
            // 약간의 지연을 두고 리다이렉트
            setTimeout(() => {
              window.location.href = '/dashboard'
            }, 500)
            return
          }
        }
        
        // fallback: 일반 세션 확인
        const { data, error } = await supabase.auth.getSession()
        
        console.log('Fallback session check:', data, error)
        
        if (error) {
          console.error('Auth callback error:', error)
          router.replace('/auth/login?error=callback_error')
          return
        }

        if (data.session) {
          console.log('Session found, redirecting to dashboard')
          // window.location을 사용해서 확실한 리다이렉트
          window.location.href = '/dashboard'
        } else {
          console.log('No session found, redirecting to login')
          window.location.href = '/auth/login'
        }
      } catch (error) {
        console.error('Callback handling error:', error)
        router.replace('/auth/login?error=callback_error')
      } finally {
        setLoading(false)
      }
    }

    // 약간의 지연을 두고 처리 (브라우저가 URL을 완전히 로드할 때까지 기다림)
    const timer = setTimeout(() => {
      handleAuthCallback()
    }, 100)

    return () => clearTimeout(timer)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">로그인 처리 중...</p>
      </div>
    </div>
  )
}