import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Music,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import type { SetlistSong } from '@/types';
import type { TeamMemberWithInstruments } from './TeamMemberCard';

// Practice status types
export type PracticeStatus = 'not_started' | 'in_progress' | 'ready';

export interface SongPracticeStatus {
  setlist_song_id: number;
  status: PracticeStatus;
  assigned_to?: number; // user_id of who's responsible
  assigned_name?: string;
  notes?: string;
  updated_at?: string;
}

// Status display config
const statusConfig: Record<PracticeStatus, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  'not_started': {
    label: '준비중',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: Circle,
  },
  'in_progress': {
    label: '연습중',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: Clock,
  },
  'ready': {
    label: '준비완료',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle2,
  },
};

interface PracticeStatusBadgeProps {
  status: PracticeStatus;
  size?: 'sm' | 'md';
}

export function PracticeStatusBadge({ status, size = 'sm' }: PracticeStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      <span>{config.label}</span>
    </span>
  );
}

interface PracticeChecklistItemProps {
  song: SetlistSong;
  practiceStatus?: SongPracticeStatus;
  teamMembers?: TeamMemberWithInstruments[];
  canEdit?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onStatusChange?: (songId: number, status: PracticeStatus) => void;
  onAssigneeChange?: (songId: number, userId: number | undefined) => void;
  onNotesChange?: (songId: number, notes: string) => void;
}

export function PracticeChecklistItem({
  song,
  practiceStatus,
  teamMembers = [],
  canEdit = false,
  isExpanded = false,
  onToggleExpand,
  onStatusChange,
  onAssigneeChange,
  onNotesChange,
}: PracticeChecklistItemProps) {
  const [localNotes, setLocalNotes] = useState(practiceStatus?.notes || '');
  const status = practiceStatus?.status || 'not_started';
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Update local notes when practiceStatus changes
  useEffect(() => {
    setLocalNotes(practiceStatus?.notes || '');
  }, [practiceStatus?.notes]);

  // Debounced notes save
  const handleNotesBlur = () => {
    if (onNotesChange && localNotes !== practiceStatus?.notes) {
      onNotesChange(song.id, localNotes);
    }
  };

  const cycleStatus = () => {
    if (!canEdit || !onStatusChange) return;
    const nextStatus: Record<PracticeStatus, PracticeStatus> = {
      'not_started': 'in_progress',
      'in_progress': 'ready',
      'ready': 'not_started',
    };
    onStatusChange(song.id, nextStatus[status]);
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        'bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        status === 'ready' && 'border-l-4 border-l-green-500'
      )}
    >
      {/* Main Row */}
      <div className="flex items-center gap-3 p-3">
        {/* Status Toggle */}
        <button
          onClick={cycleStatus}
          disabled={!canEdit}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            'transition-colors',
            config.bgColor,
            canEdit && 'hover:opacity-80 cursor-pointer'
          )}
          title={`상태: ${config.label}`}
          aria-label={`${song.song?.title || '곡'} 상태 변경`}
        >
          <StatusIcon className={cn('w-5 h-5', config.color)} />
        </button>

        {/* Song Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {song.order}. {song.song?.title || '알 수 없는 곡'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({song.key})
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {song.song?.artist}
            </span>
            {practiceStatus?.assigned_name && (
              <span className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400">
                <User className="w-3 h-3" />
                {practiceStatus.assigned_name}
              </span>
            )}
          </div>
        </div>

        {/* Status Badge (mobile-friendly) */}
        <div className="hidden sm:block">
          <PracticeStatusBadge status={status} />
        </div>

        {/* Expand Toggle */}
        {canEdit && (
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            aria-label={isExpanded ? '접기' : '펼치기'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && canEdit && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Status Selection */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
              준비 상태
            </label>
            <div className="flex gap-2">
              {(Object.keys(statusConfig) as PracticeStatus[]).map((s) => {
                const sc = statusConfig[s];
                const Icon = sc.icon;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange?.(song.id, s)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                      'border transition-all',
                      status === s
                        ? cn(sc.bgColor, sc.color, 'border-current')
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-300 dark:hover:border-gray-500'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assignee Selection */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
              담당자
            </label>
            <select
              value={practiceStatus?.assigned_to || ''}
              onChange={(e) => onAssigneeChange?.(song.id, e.target.value ? Number(e.target.value) : undefined)}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-gray-50 dark:bg-gray-700/50',
                'border border-gray-200 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'focus:ring-2 focus:ring-primary-500 focus:border-transparent'
              )}
            >
              <option value="">담당자 미지정</option>
              {teamMembers.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user_name} {member.instruments?.length ? `(${member.instruments.join(', ')})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
              메모
            </label>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="연습 관련 메모를 입력하세요..."
              rows={2}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-gray-50 dark:bg-gray-700/50',
                'border border-gray-200 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100',
                'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                'focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                'resize-none'
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface PracticeChecklistProps {
  songs: SetlistSong[];
  practiceStatuses?: SongPracticeStatus[];
  teamMembers?: TeamMemberWithInstruments[];
  canEdit?: boolean;
  isLoading?: boolean;
  onStatusChange?: (songId: number, status: PracticeStatus) => void;
  onAssigneeChange?: (songId: number, userId: number | undefined) => void;
  onNotesChange?: (songId: number, notes: string) => void;
}

export function PracticeChecklist({
  songs,
  practiceStatuses = [],
  teamMembers = [],
  canEdit = false,
  isLoading = false,
  onStatusChange,
  onAssigneeChange,
  onNotesChange,
}: PracticeChecklistProps) {
  const [expandedSongId, setExpandedSongId] = useState<number | null>(null);

  // Create a map for easy lookup
  const statusMap = new Map(practiceStatuses.map((ps) => [ps.setlist_song_id, ps]));

  // Calculate progress
  const totalSongs = songs.length;
  const readySongs = practiceStatuses.filter((ps) => ps.status === 'ready').length;
  const inProgressSongs = practiceStatuses.filter((ps) => ps.status === 'in_progress').length;

  const handleToggleExpand = useCallback((songId: number) => {
    setExpandedSongId((prev) => (prev === songId ? null : songId));
  }, []);

  if (songs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>송리스트에 곡이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          연습 체크리스트
        </h3>
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {readySongs}/{totalSongs} 곡 준비완료
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-green-500 transition-all duration-300"
            style={{ width: totalSongs > 0 ? `${(readySongs / totalSongs) * 100}%` : '0%' }}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: totalSongs > 0 ? `${(inProgressSongs / totalSongs) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">준비완료 ({readySongs})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-600 dark:text-gray-400">연습중 ({inProgressSongs})</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span className="text-gray-600 dark:text-gray-400">준비중 ({totalSongs - readySongs - inProgressSongs})</span>
        </div>
      </div>

      {/* Song List */}
      <div className="space-y-2">
        {songs.map((song) => (
          <PracticeChecklistItem
            key={song.id}
            song={song}
            practiceStatus={statusMap.get(song.id)}
            teamMembers={teamMembers}
            canEdit={canEdit}
            isExpanded={expandedSongId === song.id}
            onToggleExpand={() => handleToggleExpand(song.id)}
            onStatusChange={onStatusChange}
            onAssigneeChange={onAssigneeChange}
            onNotesChange={onNotesChange}
          />
        ))}
      </div>

      {/* Warning if not all ready */}
      {totalSongs > 0 && readySongs < totalSongs && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            {totalSongs - readySongs}곡의 준비가 완료되지 않았습니다.
            예배 전 모든 곡의 연습을 완료해주세요.
          </p>
        </div>
      )}
    </div>
  );
}

export default PracticeChecklist;
