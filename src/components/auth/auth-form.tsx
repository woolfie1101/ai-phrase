'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/context/auth/auth-context'

interface AuthFormProps {
  mode: 'signin' | 'signup' | 'reset-password' | 'update-password'
  title: string
  description: string
}

export function AuthForm({ mode, title, description }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const authContext = useAuth()
  const { signIn, signUp, signInWithOAuth, resetPassword, updatePassword } = authContext
  
  // AuthContext 초기화 디버깅
  console.log('AuthForm - AuthContext loaded:', !!authContext)
  console.log('AuthForm - signInWithOAuth available:', !!signInWithOAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) {
          setMessage({ type: 'error', text: error.message })
        }
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' })
          return
        }

        const { error } = await signUp(email, password, displayName)
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else {
          setMessage({ 
            type: 'success', 
            text: '회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화하세요.' 
          })
        }
      } else if (mode === 'reset-password') {
        const { error } = await resetPassword(email)
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else {
          setMessage({ 
            type: 'success', 
            text: '비밀번호 재설정 링크를 이메일로 발송했습니다.' 
          })
        }
      } else if (mode === 'update-password') {
        if (password !== confirmPassword) {
          setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다.' })
          return
        }

        const { error } = await updatePassword(password)
        if (error) {
          setMessage({ type: 'error', text: error.message })
        } else {
          setMessage({ 
            type: 'success', 
            text: '비밀번호가 성공적으로 변경되었습니다.' 
          })
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '오류가 발생했습니다. 다시 시도해주세요.' })
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    // AuthContext 초기화 확인
    if (!signInWithOAuth) {
      console.error('signInWithOAuth function not available')
      setMessage({ type: 'error', text: 'OAuth 로그인을 초기화하는 중입니다. 잠시 후 다시 시도해주세요.' })
      return
    }
    
    // 중복 클릭 방지
    if (loading) {
      console.log('OAuth already in progress, ignoring click')
      return
    }
    
    console.log(`Starting OAuth login with ${provider}`)
    setLoading(true)
    setMessage(null)
    
    try {
      const { error } = await signInWithOAuth(provider)
      if (error) {
        console.error('OAuth error:', error)
        setMessage({ type: 'error', text: error.message })
        setLoading(false)
      } else {
        console.log('OAuth redirect initiated')
        // OAuth will handle the redirect, keep loading state until redirect
      }
    } catch (error) {
      console.error('OAuth exception:', error)
      setMessage({ type: 'error', text: '소셜 로그인 중 오류가 발생했습니다.' })
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{title}</CardTitle>
          <CardDescription className="text-center">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {mode !== 'update-password' && (
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="displayName">닉네임 (선택사항)</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="닉네임"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            {(mode === 'signin' || mode === 'signup' || mode === 'update-password') && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === 'update-password' ? '새 비밀번호' : '비밀번호'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            )}

            {(mode === 'signup' || mode === 'update-password') && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호 확인"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '처리 중...' : 
                mode === 'signin' ? '로그인' :
                mode === 'signup' ? '회원가입' :
                mode === 'reset-password' ? '비밀번호 재설정' :
                '비밀번호 변경'
              }
            </Button>

            {/* OAuth 소셜 로그인 버튼 (로그인, 회원가입 페이지에만 표시) */}
            {(mode === 'signin' || mode === 'signup') && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      또는
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google로 {mode === 'signin' ? '로그인' : '회원가입'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuthSignIn('github')}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    GitHub로 {mode === 'signin' ? '로그인' : '회원가입'}
                  </Button>
                </div>
              </>
            )}

            <div className="text-center text-sm space-y-2">
              {mode === 'signin' && (
                <>
                  <div>
                    <Link 
                      href="/auth/forgot-password" 
                      className="text-primary hover:underline"
                    >
                      비밀번호를 잊으셨나요?
                    </Link>
                  </div>
                  <div>
                    계정이 없으신가요?{' '}
                    <Link 
                      href="/auth/signup" 
                      className="text-primary hover:underline"
                    >
                      회원가입
                    </Link>
                  </div>
                </>
              )}

              {mode === 'signup' && (
                <div>
                  이미 계정이 있으신가요?{' '}
                  <Link 
                    href="/auth/login" 
                    className="text-primary hover:underline"
                  >
                    로그인
                  </Link>
                </div>
              )}

              {mode === 'reset-password' && (
                <div>
                  <Link 
                    href="/auth/login" 
                    className="text-primary hover:underline"
                  >
                    로그인으로 돌아가기
                  </Link>
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}