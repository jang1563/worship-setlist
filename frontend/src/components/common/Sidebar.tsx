import { MessageSquare, ListMusic, Music, TrendingUp, Settings, X, Monitor, LayoutDashboard, Tv, Users } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { id: 'chat', label: 'AI 대화', icon: MessageSquare },
  { id: 'setlists', label: '송리스트', icon: ListMusic },
  { id: 'songs', label: '찬양 DB', icon: Music },
  { id: 'trends', label: '워십 동향', icon: TrendingUp },
  { id: 'teams', label: '찬양팀', icon: Users },
];

const worshipItems = [
  { id: 'leader', label: '인도자 모드', icon: LayoutDashboard },
  { id: 'presenter', label: '프레젠터', icon: Monitor },
  { id: 'stage', label: '스테이지 모니터', icon: Tv },
];

export function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-navigation"
        role="navigation"
        aria-label="주 메뉴"
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700',
          'transform transition-transform duration-200 lg:transform-none',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile close button */}
          <div className="lg:hidden flex justify-end p-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="메뉴 닫기"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Menu items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="주 메뉴">
            <ul role="list" className="space-y-1">
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onViewChange(item.id);
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                      currentView === item.id
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                    aria-current={currentView === item.id ? 'page' : undefined}
                  >
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Worship Mode Section */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <h2 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                예배 모드
              </h2>
              <ul role="list" className="space-y-1">
                {worshipItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onViewChange(item.id);
                        onClose();
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                        'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                        currentView === item.id
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      aria-current={currentView === item.id ? 'page' : undefined}
                    >
                      <item.icon className="w-5 h-5" aria-hidden="true" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="설정 열기"
            >
              <Settings className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">설정</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
