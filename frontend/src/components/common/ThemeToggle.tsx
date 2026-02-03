import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/utils/cn';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-5 h-5" />;
      case 'dark':
        return <Moon className="w-5 h-5" />;
      case 'system':
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getTitle = () => {
    switch (theme) {
      case 'light':
        return '라이트 모드 (클릭하여 다크 모드로)';
      case 'dark':
        return '다크 모드 (클릭하여 시스템 설정으로)';
      case 'system':
        return '시스템 설정 (클릭하여 라이트 모드로)';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'p-2 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'active:bg-gray-200 dark:active:bg-gray-700',
        'text-gray-600 dark:text-gray-300'
      )}
      title={getTitle()}
      aria-label={getTitle()}
    >
      {getIcon()}
    </button>
  );
}
