import { AuthForm } from '@/components/auth/auth-form'

export default function SignupPage() {
  return (
    <AuthForm
      mode="signup"
      title="회원가입"
      description="AI Phrase에 가입하여 학습을 시작하세요"
    />
  )
}