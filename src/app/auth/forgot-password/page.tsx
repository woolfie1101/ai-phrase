import { AuthForm } from '@/components/auth/auth-form'

export default function ForgotPasswordPage() {
  return (
    <AuthForm
      mode="reset-password"
      title="비밀번호 찾기"
      description="등록된 이메일로 비밀번호 재설정 링크를 보내드립니다"
    />
  )
}