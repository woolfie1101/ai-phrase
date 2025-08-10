import { AuthForm } from '@/components/auth/auth-form'

export default function ResetPasswordPage() {
  return (
    <AuthForm
      mode="update-password"
      title="새 비밀번호 설정"
      description="새로운 비밀번호를 설정하세요"
    />
  )
}