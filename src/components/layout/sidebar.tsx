import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  Home, 
  FolderOpen, 
  BookOpen, 
  BarChart3, 
  Settings,
  Calendar
} from 'lucide-react';

const navigation = [
  {
    name: '대시보드',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: '오늘의 학습',
    href: '/learn',
    icon: BookOpen,
  },
  {
    name: '폴더 관리',
    href: '/folders',
    icon: FolderOpen,
  },
  {
    name: '통계',
    href: '/stats',
    icon: BarChart3,
  },
  {
    name: '스케줄',
    href: '/schedule',
    icon: Calendar,
  },
  {
    name: '설정',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn('pb-12 w-64', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            메뉴
          </h2>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors',
                      isActive 
                        ? 'bg-accent text-accent-foreground' 
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}