import { AuthForm } from '@/components/auth/auth-form'

export default function LoginPage() {
  console.log('LoginPage rendering...')
  
  return (
    <AuthForm
      mode="signin"
      title="로그인"
      description="AI Phrase 계정으로 로그인하세요"
    />
  )
}