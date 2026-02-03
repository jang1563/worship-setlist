import { Church, Sun, Users, Calendar, Star, Moon, Tent } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface WorshipTemplate {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  message: string;
  color: string;
}

const templates: WorshipTemplate[] = [
  {
    id: 'dawn',
    label: '새벽예배',
    sublabel: '15분, 잔잔한 곡 3-4곡',
    icon: Sun,
    message: '새벽예배 15분, 잔잔하고 은혜로운 찬양 3-4곡으로 구성해줘',
    color: 'amber',
  },
  {
    id: 'sunday',
    label: '주일예배',
    sublabel: '25분, 다양한 흐름 5-6곡',
    icon: Church,
    message: '주일예배 25분, 찬양-경배-기도-응답의 흐름으로 5-6곡 구성해줘',
    color: 'blue',
  },
  {
    id: 'youth',
    label: '청년예배',
    sublabel: '20분, 활기찬 곡 4-5곡',
    icon: Users,
    message: '청년예배 20분, 활기차고 현대적인 CCM 위주로 4-5곡 구성해줘',
    color: 'purple',
  },
  {
    id: 'wednesday',
    label: '수요예배',
    sublabel: '15분, 은혜로운 곡 3-4곡',
    icon: Calendar,
    message: '수요예배 15분, 은혜롭고 차분한 찬양 3-4곡으로 구성해줘',
    color: 'green',
  },
  {
    id: 'friday',
    label: '금요예배',
    sublabel: '20분, 기도와 회복 4-5곡',
    icon: Moon,
    message: '금요예배 20분, 기도와 회복을 위한 찬양 4-5곡으로 구성해줘',
    color: 'indigo',
  },
  {
    id: 'special',
    label: '특별예배',
    sublabel: '30분, 축제 분위기 6-7곡',
    icon: Star,
    message: '특별예배 30분, 감사와 축제 분위기의 찬양 6-7곡으로 구성해줘',
    color: 'rose',
  },
  {
    id: 'retreat',
    label: '수련회',
    sublabel: '30분, 헌신과 결단 6-7곡',
    icon: Tent,
    message: '수련회 마지막 밤 헌신예배 30분, 헌신과 결단을 위한 찬양 6-7곡으로 구성해줘',
    color: 'orange',
  },
];

interface WorshipTemplatesProps {
  onSelect: (message: string) => void;
  disabled?: boolean;
}

export function WorshipTemplates({ onSelect, disabled }: WorshipTemplatesProps) {
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300',
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300',
      green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
      rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300',
      orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getIconColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      amber: 'text-amber-600 dark:text-amber-400',
      blue: 'text-blue-600 dark:text-blue-400',
      purple: 'text-purple-600 dark:text-purple-400',
      green: 'text-green-600 dark:text-green-400',
      indigo: 'text-indigo-600 dark:text-indigo-400',
      rose: 'text-rose-600 dark:text-rose-400',
      orange: 'text-orange-600 dark:text-orange-400',
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="px-3 sm:px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
        빠른 시작
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.message)}
              disabled={disabled}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
                'min-h-[44px] text-left',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                'active:scale-95',
                getColorClasses(template.color)
              )}
              aria-label={`${template.label} 템플릿 선택: ${template.sublabel}`}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', getIconColorClasses(template.color))} />
              <div className="min-w-0">
                <p className="font-medium text-sm whitespace-nowrap">{template.label}</p>
                <p className="text-xs opacity-75 whitespace-nowrap">{template.sublabel}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
