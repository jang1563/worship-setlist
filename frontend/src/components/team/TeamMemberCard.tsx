import { cn } from '@/utils/cn';
import {
  Music2,
  Piano,
  Guitar,
  Drum,
  Mic2,
  Music,
  Crown,
  Shield,
  Star,
  User,
  MoreVertical,
  Settings,
  X
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { TeamMember, TeamRole } from '@/types';

// Instrument types in Korean
export type Instrument =
  | '피아노'
  | '기타'
  | '베이스'
  | '드럼'
  | '보컬'
  | '키보드'
  | '어쿠스틱'
  | '일렉기타'
  | '카혼'
  | '바이올린'
  | '첼로'
  | '기타 악기';

interface InstrumentConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const instrumentConfig: Record<Instrument, InstrumentConfig> = {
  '피아노': { icon: Piano, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  '기타': { icon: Guitar, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  '베이스': { icon: Guitar, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  '드럼': { icon: Drum, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  '보컬': { icon: Mic2, color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  '키보드': { icon: Piano, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  '어쿠스틱': { icon: Guitar, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  '일렉기타': { icon: Guitar, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  '카혼': { icon: Drum, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  '바이올린': { icon: Music2, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  '첼로': { icon: Music2, color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-900/30' },
  '기타 악기': { icon: Music, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
};

const roleConfig: Record<TeamRole, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  'owner': { icon: Crown, label: '소유자', color: 'text-amber-500' },
  'admin': { icon: Shield, label: '관리자', color: 'text-blue-500' },
  'leader': { icon: Star, label: '인도자', color: 'text-purple-500' },
  'member': { icon: User, label: '멤버', color: 'text-gray-500' },
};

// Instruments list for selection
export const INSTRUMENTS: Instrument[] = [
  '피아노',
  '기타',
  '베이스',
  '드럼',
  '보컬',
  '키보드',
  '어쿠스틱',
  '일렉기타',
  '카혼',
  '바이올린',
  '첼로',
  '기타 악기',
];

// Extended TeamMember with instruments
export interface TeamMemberWithInstruments extends TeamMember {
  instruments?: Instrument[];
}

interface InstrumentBadgeProps {
  instrument: Instrument;
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
}

export function InstrumentBadge({ instrument, size = 'sm', removable, onRemove }: InstrumentBadgeProps) {
  const config = instrumentConfig[instrument] || instrumentConfig['기타 악기'];
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
      <span>{instrument}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5"
          aria-label={`${instrument} 제거`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface TeamMemberCardProps {
  member: TeamMemberWithInstruments;
  isCurrentUser?: boolean;
  canEdit?: boolean;
  onUpdateInstruments?: (memberId: number, instruments: Instrument[]) => void;
  onUpdateRole?: (memberId: number, role: TeamRole) => void;
  onRemoveMember?: (memberId: number) => void;
}

export function TeamMemberCard({
  member,
  isCurrentUser = false,
  canEdit = false,
  onUpdateInstruments,
  onUpdateRole,
  onRemoveMember,
}: TeamMemberCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showInstrumentPicker, setShowInstrumentPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const instrumentPickerRef = useRef<HTMLDivElement>(null);

  const roleInfo = roleConfig[member.role];
  const RoleIcon = roleInfo.icon;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (instrumentPickerRef.current && !instrumentPickerRef.current.contains(event.target as Node)) {
        setShowInstrumentPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddInstrument = (instrument: Instrument) => {
    if (!member.instruments?.includes(instrument) && onUpdateInstruments) {
      onUpdateInstruments(member.id, [...(member.instruments || []), instrument]);
    }
    setShowInstrumentPicker(false);
  };

  const handleRemoveInstrument = (instrument: Instrument) => {
    if (onUpdateInstruments) {
      onUpdateInstruments(
        member.id,
        (member.instruments || []).filter((i) => i !== instrument)
      );
    }
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border',
        'bg-white dark:bg-gray-800',
        'border-gray-200 dark:border-gray-700',
        isCurrentUser && 'ring-2 ring-primary-500/50'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-primary-400 to-primary-600',
              'text-white font-bold text-lg'
            )}
          >
            {member.user_name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {member.user_name}
                {isCurrentUser && (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">(나)</span>
                )}
              </h4>
              <span className={cn('flex items-center gap-1 text-xs', roleInfo.color)}>
                <RoleIcon className="w-3 h-3" />
                {roleInfo.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{member.user_email}</p>
          </div>
        </div>

        {/* Actions Menu */}
        {canEdit && !isCurrentUser && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="더 보기"
            >
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                {onUpdateRole && (
                  <div className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    역할 변경
                  </div>
                )}
                {onUpdateRole &&
                  (['leader', 'member'] as TeamRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        onUpdateRole(member.id, role);
                        setShowMenu(false);
                      }}
                      className={cn(
                        'w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                        member.role === role && 'bg-gray-50 dark:bg-gray-700/50'
                      )}
                    >
                      {roleConfig[role].label}
                    </button>
                  ))}
                {onRemoveMember && (
                  <>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => {
                        if (confirm(`${member.user_name}님을 팀에서 제거하시겠습니까?`)) {
                          onRemoveMember(member.id);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      멤버 제거
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instruments */}
      <div className="mt-3">
        <div className="flex items-center flex-wrap gap-1.5">
          {member.instruments && member.instruments.length > 0 ? (
            member.instruments.map((instrument) => (
              <InstrumentBadge
                key={instrument}
                instrument={instrument}
                removable={canEdit}
                onRemove={() => handleRemoveInstrument(instrument)}
              />
            ))
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">악기 미지정</span>
          )}

          {/* Add Instrument Button */}
          {canEdit && (
            <div className="relative" ref={instrumentPickerRef}>
              <button
                onClick={() => setShowInstrumentPicker(!showInstrumentPicker)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                  'border border-dashed border-gray-300 dark:border-gray-600',
                  'text-gray-500 dark:text-gray-400',
                  'hover:border-primary-500 hover:text-primary-500 dark:hover:border-primary-400 dark:hover:text-primary-400',
                  'transition-colors'
                )}
              >
                <Settings className="w-3 h-3" />
                악기 추가
              </button>

              {showInstrumentPicker && (
                <div className="absolute left-0 mt-1 w-40 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {INSTRUMENTS.filter(
                    (inst) => !member.instruments?.includes(inst)
                  ).map((instrument) => {
                    const config = instrumentConfig[instrument];
                    const Icon = config.icon;
                    return (
                      <button
                        key={instrument}
                        onClick={() => handleAddInstrument(instrument)}
                        className={cn(
                          'w-full px-3 py-1.5 text-left text-sm flex items-center gap-2',
                          'hover:bg-gray-100 dark:hover:bg-gray-700'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', config.color)} />
                        {instrument}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TeamMembersListProps {
  members: TeamMemberWithInstruments[];
  currentUserId?: number;
  canEdit?: boolean;
  onUpdateInstruments?: (memberId: number, instruments: Instrument[]) => void;
  onUpdateRole?: (memberId: number, role: TeamRole) => void;
  onRemoveMember?: (memberId: number) => void;
}

export function TeamMembersList({
  members,
  currentUserId,
  canEdit = false,
  onUpdateInstruments,
  onUpdateRole,
  onRemoveMember,
}: TeamMembersListProps) {
  // Sort by role priority
  const sortedMembers = [...members].sort((a, b) => {
    const rolePriority: Record<TeamRole, number> = {
      owner: 0,
      admin: 1,
      leader: 2,
      member: 3,
    };
    return rolePriority[a.role] - rolePriority[b.role];
  });

  return (
    <div className="space-y-3">
      {sortedMembers.map((member) => (
        <TeamMemberCard
          key={member.id}
          member={member}
          isCurrentUser={member.user_id === currentUserId}
          canEdit={canEdit && member.role !== 'owner'}
          onUpdateInstruments={onUpdateInstruments}
          onUpdateRole={onUpdateRole}
          onRemoveMember={onRemoveMember}
        />
      ))}
    </div>
  );
}
