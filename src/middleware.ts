import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/folders',
  '/learn',
  '/profile',
  '/settings'
]

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/callback'
]

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  console.log('Middleware temporarily disabled for OAuth setup')
  
  // 루트 경로만 대시보드로 리다이렉트 (다른 모든 보호는 클라이언트에서 처리)
  if (pathname === '/') {
    console.log('Redirecting root to dashboard')
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 모든 다른 요청은 통과시킴
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}