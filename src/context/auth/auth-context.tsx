'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase, createUserProfile, getUserProfile } from '@/lib/supabase'
import { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  updatePassword: (password: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Initialize auth state
  useEffect(() => {
    console.log('AuthContext useEffect triggered - initializing auth state')
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Initial session result:', !!session, 'error:', error)
        console.log('Session user:', session?.user?.id)
        
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          console.log('Initial session user found, loading profile in background...')
          // 프로필 로딩을 기다리지 않고 백그라운드에서 처리
          loadUserProfile(session.user.id)
        } else {
          console.log('No initial session user found')
        }
        
        console.log('AuthContext: Setting loading to false immediately')
        setLoading(false)
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        
        setSession(session)
        setUser(session?.user ?? null)

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, loading profile...')
          // 프로필 로딩을 기다리지 않고 백그라운드에서 처리
          loadUserProfile(session.user.id)
          
          // OAuth 콜백 페이지에서만 대시보드로 리다이렉트 (다른 페이지에서는 현재 위치 유지)
          const currentPath = window.location.pathname
          if (currentPath === '/auth/callback') {
            console.log('Redirecting to dashboard from OAuth callback')
            router.push('/dashboard')
          }
          // 다른 보호된 페이지에서는 현재 위치를 유지
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, redirecting to login')
          setProfile(null)
          setSession(null)
          setUser(null)
          router.push('/auth/login')
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('Token refreshed, updating profile...')
          await loadUserProfile(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router])

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for user ID:', userId)
      const { data: existingProfile, error: profileError } = await getUserProfile(userId)
      
      console.log('Existing profile:', existingProfile, 'Profile error:', profileError)
      
      if (existingProfile) {
        console.log('Setting existing profile:', existingProfile)
        setProfile(existingProfile)
        return // 프로필 로딩 완료
      } else {
        console.log('Creating new profile for user:', user?.user_metadata)
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await createUserProfile(
          userId,
          user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name
        )
        console.log('New profile created:', newProfile, 'Create error:', createError)
        if (newProfile) {
          setProfile(newProfile)
        }
        return // 프로필 생성 완료
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // 프로필 로딩 실패해도 계속 진행
      return
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id)
    }
  }

  const handleSignUp = async (email: string, password: string, displayName?: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const handleSignInWithOAuth = async (provider: 'google' | 'github') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setSession(null)
      setProfile(null)
      
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const handleUpdatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signInWithOAuth: handleSignInWithOAuth,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    updatePassword: handleUpdatePassword,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for protected routes
export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  return { user, loading }
}