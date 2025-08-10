import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Enhanced Auth helpers
export const signUp = async (email: string, password: string, displayName?: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  })
  
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })
  
  return { data, error }
}

export const updatePassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password,
  })
  
  return { data, error }
}

export const updateProfile = async (updates: { 
  display_name?: string
  avatar_url?: string 
}) => {
  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  })
  
  return { data, error }
}

// Database user profile helpers
export const createUserProfile = async (userId: string, displayName?: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      user_id: userId,
      display_name: displayName,
    })
    .select()
    .single()
    
  return { data, error }
}

export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
    
  return { data, error }
}

export const updateUserProfile = async (
  userId: string,
  updates: {
    display_name?: string
    avatar_url?: string
    settings?: any
  }
) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()
    
  return { data, error }
}