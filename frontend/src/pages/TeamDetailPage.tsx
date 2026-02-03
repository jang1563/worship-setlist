import { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, Plus, Mail, Trash2,
  Check, X, Clock, UserPlus, Edit2, Building2, MapPin
} from 'lucide-react';
import { teamsApi } from '@/services/api';
import { toast } from '@/stores/toastStore';
import type { Team, TeamMember, TeamInvite, ServiceSchedule, TeamRole } from '@/types';

interface TeamDetailPageProps {
  teamId: number;
  onBack: () => void;
}

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: '소유자',
  admin: '관리자',
  leader: '인도자',
  member: '멤버',
};

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  leader: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  member: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export function TeamDetailPage({ teamId, onBack }: TeamDetailPageProps) {
  const [team, setTeam] = useState<(Team & { members: TeamMember[] }) | null>(null);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'schedules' | 'invites'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [teamData, invitesData, schedulesData] = await Promise.all([
        teamsApi.getById(teamId),
        teamsApi.getInvites(teamId),
        teamsApi.getSchedules(teamId, true),
      ]);
      setTeam(teamData);
      setInvites(invitesData.invites);
      setSchedules(schedulesData.schedules);
    } catch {
      toast.error('팀 정보를 불러올 수 없습니다. 인터넷 연결을 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (email: string, role: TeamRole) => {
    try {
      await teamsApi.createInvite(teamId, { email, role });
      toast.success('초대가 발송되었습니다!');
      setShowInviteModal(false);
      const invitesData = await teamsApi.getInvites(teamId);
      setInvites(invitesData.invites);
    } catch {
      toast.error('초대를 보낼 수 없습니다. 이메일 주소를 확인하고 다시 시도해주세요.');
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    try {
      await teamsApi.cancelInvite(teamId, inviteId);
      toast.success('초대가 취소되었습니다.');
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      toast.error('초대를 취소할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleRemoveMember = async (userId: number, userName: string) => {
    if (!confirm(`${userName}님을 팀에서 제외하시겠습니까?`)) return;
    try {
      await teamsApi.removeMember(teamId, userId);
      toast.success('멤버가 제외되었습니다.');
      loadTeamData();
    } catch {
      toast.error('멤버를 제외할 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  const handleCreateSchedule = async (data: {
    title: string;
    service_type: string;
    date: string;
    location?: string;
  }) => {
    try {
      await teamsApi.createSchedule(teamId, data);
      toast.success('일정이 생성되었습니다!');
      setShowScheduleModal(false);
      const schedulesData = await teamsApi.getSchedules(teamId, true);
      setSchedules(schedulesData.schedules);
    } catch {
      toast.error('일정을 생성할 수 없습니다. 입력 내용을 확인하고 다시 시도해주세요.');
    }
  };

  if (loading || !team) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로</span>
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
              {team.description && (
                <p className="mt-1 text-gray-500 dark:text-gray-400">{team.description}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                {team.church_name && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {team.church_name}
                  </span>
                )}
                {team.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {team.location}
                  </span>
                )}
              </div>
            </div>
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['members', 'schedules', 'invites'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab === 'members' && `멤버 (${team.members?.length || 0})`}
              {tab === 'schedules' && `일정 (${schedules.length})`}
              {tab === 'invites' && `초대 (${invites.filter((i) => i.status === 'pending').length})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <UserPlus className="w-5 h-5" />
                멤버 초대
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {team.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 dark:text-primary-400 font-medium">
                        {member.user_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {member.user_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user_email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[member.role]}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.user_name)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Plus className="w-5 h-5" />
                일정 추가
              </button>
            </div>
            {schedules.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">예정된 일정이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {schedule.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(schedule.date).toLocaleString('ko-KR', {
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            {schedule.service_type}
                          </span>
                          {schedule.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {schedule.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          schedule.is_confirmed
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {schedule.is_confirmed ? '확정' : '미확정'}
                      </span>
                    </div>
                    {schedule.assignments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex flex-wrap gap-2">
                          {schedule.assignments.map((assignment) => (
                            <span
                              key={assignment.id}
                              className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                                assignment.is_confirmed
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {assignment.is_confirmed && <Check className="w-3 h-3" />}
                              {assignment.user_name} - {assignment.position}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Mail className="w-5 h-5" />
                새 초대
              </button>
            </div>
            {invites.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Mail className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">보낸 초대가 없습니다</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{invite.email}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {ROLE_LABELS[invite.role]} · {invite.invited_by_name}님이 초대
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          invite.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : invite.status === 'accepted'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {invite.status === 'pending' && '대기중'}
                        {invite.status === 'accepted' && '수락됨'}
                        {invite.status === 'declined' && '거절됨'}
                        {invite.status === 'expired' && '만료됨'}
                      </span>
                      {invite.status === 'pending' && (
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} onInvite={handleInvite} />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal onClose={() => setShowScheduleModal(false)} onCreate={handleCreateSchedule} />
      )}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (email: string, role: TeamRole) => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('member');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.warning('이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    await onInvite(email.trim(), role);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">멤버 초대</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이메일 *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="초대할 멤버의 이메일"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              역할
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="member">멤버</option>
              <option value="leader">인도자</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? '전송 중...' : '초대 보내기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScheduleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { title: string; service_type: string; date: string; location?: string }) => void;
}) {
  const [title, setTitle] = useState('');
  const [serviceType, setServiceType] = useState('주일예배');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      toast.warning('필수 항목을 입력해주세요.');
      return;
    }
    setLoading(true);
    await onCreate({
      title: title.trim(),
      service_type: serviceType,
      date: new Date(date).toISOString(),
      location: location.trim() || undefined,
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">일정 추가</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="예: 주일 2부 예배"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                예배 유형 *
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="주일예배">주일예배</option>
                <option value="청년예배">청년예배</option>
                <option value="수요예배">수요예배</option>
                <option value="금요기도회">금요기도회</option>
                <option value="새벽기도">새벽기도</option>
                <option value="특별집회">특별집회</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                장소
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="예: 본당"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              날짜 및 시간 *
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? '생성 중...' : '일정 추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
