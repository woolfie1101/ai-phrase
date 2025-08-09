import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, Settings, LogOut, Menu } from 'lucide-react';

interface HeaderProps {
  user?: any;
  onSignOut?: () => void;
}

export function Header({ user, onSignOut }: HeaderProps) {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-2xl font-bold text-primary">
              AI Phrase
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/dashboard" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              대시보드
            </Link>
            <Link 
              href="/folders" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              폴더 관리
            </Link>
            <Link 
              href="/learn" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              학습하기
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  {user.email}
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
                {onSignOut && (
                  <Button variant="ghost" size="sm" onClick={onSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/signin">로그인</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">회원가입</Link>
                </Button>
              </div>
            )}
            
            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}