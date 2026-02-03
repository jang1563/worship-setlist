import { cn } from '@/utils/cn';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Music,
  ChevronRight,
} from 'lucide-react';
import type { SongPracticeStatus } from './PracticeChecklist';
import type { SetlistSong } from '@/types';

interface SetlistReadinessProps {
  songs: SetlistSong[];
  practiceStatuses?: SongPracticeStatus[];
  teamMemberCount?: number;
  onClick?: () => void;
  compact?: boolean;
}

/**
 * SetlistReadiness - A visual indicator showing the overall readiness status of a setlist.
 * Displays progress as a percentage and status summary.
 */
export function SetlistReadiness({
  songs,
  practiceStatuses = [],
  teamMemberCount = 0,
  onClick,
  compact = false,
}: SetlistReadinessProps) {
  // Calculate stats
  const totalSongs = songs.length;
  const statusMap = new Map(practiceStatuses.map((ps) => [ps.setlist_song_id, ps]));

  let readyCount = 0;
  let inProgressCount = 0;
  let notStartedCount = 0;

  songs.forEach((song) => {
    const status = statusMap.get(song.id)?.status || 'not_started';
    if (status === 'ready') readyCount++;
    else if (status === 'in_progress') inProgressCount++;
    else notStartedCount++;
  });

  const readyPercentage = totalSongs > 0 ? Math.round((readyCount / totalSongs) * 100) : 0;

  // Determine overall status
  type OverallStatus = 'ready' | 'in_progress' | 'not_ready';
  let overallStatus: OverallStatus;
  if (readyCount === totalSongs && totalSongs > 0) {
    overallStatus = 'ready';
  } else if (readyCount > 0 || inProgressCount > 0) {
    overallStatus = 'in_progress';
  } else {
    overallStatus = 'not_ready';
  }

  const statusConfig: Record<OverallStatus, { color: string; bgColor: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
    'ready': {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: CheckCircle2,
      label: '준비 완료',
    },
    'in_progress': {
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      icon: Clock,
      label: '준비 중',
    },
    'not_ready': {
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      icon: AlertTriangle,
      label: '준비 시작 전',
    },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  // Compact version - just shows a small badge
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          'transition-all',
          config.bgColor,
          config.color,
          onClick && 'hover:opacity-80 cursor-pointer'
        )}
        title={`${readyCount}/${totalSongs} 곡 준비완료`}
      >
        <StatusIcon className="w-3.5 h-3.5" />
        <span>{readyCount}/{totalSongs}</span>
      </button>
    );
  }

  // Full version
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border p-4',
        'bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        onClick && 'cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 transition-colors'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              config.bgColor
            )}
          >
            <StatusIcon className={cn('w-5 h-5', config.color)} />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {config.label}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {readyCount}/{totalSongs} 곡 준비완료
            </p>
          </div>
        </div>
        {onClick && (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div className="h-full flex">
          <div
            className="bg-green-500 transition-all duration-500"
            style={{ width: `${(readyCount / Math.max(totalSongs, 1)) * 100}%` }}
          />
          <div
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${(inProgressCount / Math.max(totalSongs, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Music className="w-3.5 h-3.5" />
            <span>{totalSongs}곡</span>
          </div>
          {teamMemberCount > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{teamMemberCount}명</span>
            </div>
          )}
        </div>
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {readyPercentage}% 완료
        </span>
      </div>
    </div>
  );
}

/**
 * SetlistReadinessMini - Minimal inline indicator for lists
 */
interface SetlistReadinessMiniProps {
  readyCount: number;
  totalCount: number;
}

export function SetlistReadinessMini({ readyCount, totalCount }: SetlistReadinessMiniProps) {
  const percentage = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const isComplete = readyCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Mini Progress Bar */}
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            isComplete ? 'bg-green-500' : 'bg-amber-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {/* Text */}
      <span
        className={cn(
          'text-xs font-medium',
          isComplete
            ? 'text-green-600 dark:text-green-400'
            : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {readyCount}/{totalCount}
      </span>
    </div>
  );
}

/**
 * ReadinessProgressCircle - Circular progress indicator
 */
interface ReadinessProgressCircleProps {
  readyCount: number;
  totalCount: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ReadinessProgressCircle({
  readyCount,
  totalCount,
  size = 'md',
  showLabel = true,
}: ReadinessProgressCircleProps) {
  const percentage = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const isComplete = readyCount === totalCount && totalCount > 0;

  const sizeConfig = {
    sm: { outer: 40, stroke: 4, text: 'text-xs' },
    md: { outer: 56, stroke: 5, text: 'text-sm' },
    lg: { outer: 80, stroke: 6, text: 'text-lg' },
  };

  const { outer, stroke, text } = sizeConfig[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: outer, height: outer }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={outer} height={outer}>
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(
              'transition-all duration-500',
              isComplete ? 'text-green-500' : 'text-amber-500'
            )}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-bold', text, isComplete ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300')}>
            {percentage}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {readyCount}/{totalCount} 곡
        </span>
      )}
    </div>
  );
}

export default SetlistReadiness;
