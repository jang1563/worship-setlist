import { Music4, Menu } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header
      role="banner"
      className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between min-h-[56px] sm:min-h-[60px]"
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="메뉴 열기"
          aria-expanded="false"
          aria-controls="sidebar-navigation"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <a href="/" className="flex items-center gap-2" aria-label="송플래너 홈">
          <div className="bg-primary-600 p-1.5 sm:p-2 rounded-lg" aria-hidden="true">
            <Music4 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">송플래너</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">찬양 컨설턴트</p>
          </div>
        </a>
      </div>
      <div className="flex items-center gap-2" role="group" aria-label="앱 설정">
        <ThemeToggle />
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden xs:inline" aria-label="버전 0.1.0">v0.1.0</span>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">MVP</span>
      </div>
    </header>
  );
}
