import axios from 'axios';
import type {
  Song,
  Setlist,
  SetlistGenerateRequest,
  SetlistGenerateResponse,
  KeyCompatibility,
  TrendAnalysis,
  VideoInfo,
  WorshipChannel,
  ChainSongRequest,
  ChainSongResponse,
  Team,
  TeamMember,
  TeamInvite,
  TeamRole,
  ServiceSchedule
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Songs API
export const songsApi = {
  getAll: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    artist?: string;
    key?: string;
    mood?: string;
    service_type?: string;
  }) => {
    const response = await api.get<{
      songs: Song[];
      total: number;
      page: number;
      per_page: number;
    }>('/songs', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Song>(`/songs/${id}`);
    return response.data;
  },

  create: async (song: Partial<Song>) => {
    const response = await api.post<Song>('/songs', song);
    return response.data;
  },

  update: async (id: number, song: Partial<Song>) => {
    const response = await api.put<Song>(`/songs/${id}`, song);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/songs/${id}`);
  },
};

// Setlist song create type (without id)
export interface SetlistSongCreate {
  song_id: number;
  order: number;
  key: string;
  transition_type?: string;
  transition_chord_progression?: string;
  transition_notes?: string;
  role?: string;
  scripture_ref?: string;
  notes?: string;
}

// Setlist create type
export interface SetlistCreateRequest {
  title: string;
  date?: string;
  service_type?: string;
  sermon_topic?: string;
  sermon_scripture?: string;
  notes?: string;
  is_public?: boolean;
  songs?: SetlistSongCreate[];
}

// Setlists API
export const setlistsApi = {
  getAll: async (params?: { page?: number; per_page?: number }) => {
    const response = await api.get<{
      setlists: Setlist[];
      total: number;
      page: number;
      per_page: number;
    }>('/setlists', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get<Setlist>(`/setlists/${id}`);
    return response.data;
  },

  create: async (setlist: SetlistCreateRequest) => {
    const response = await api.post<Setlist>('/setlists', setlist);
    return response.data;
  },

  update: async (id: number, setlist: Partial<Setlist>) => {
    const response = await api.put<Setlist>(`/setlists/${id}`, setlist);
    return response.data;
  },

  delete: async (id: number) => {
    await api.delete(`/setlists/${id}`);
  },

  updateSongs: async (id: number, songs: SetlistSongCreate[]) => {
    const response = await api.put<Setlist>(`/setlists/${id}/songs`, songs);
    return response.data;
  },
};

// AI API
export const aiApi = {
  generateSetlist: async (request: SetlistGenerateRequest) => {
    const response = await api.post<SetlistGenerateResponse>('/ai/generate-setlist', request);
    return response.data;
  },

  checkKeyCompatibility: async (fromKey: string, toKey: string) => {
    const response = await api.post<KeyCompatibility>('/ai/check-key-compatibility', null, {
      params: { from_key: fromKey, to_key: toKey },
    });
    return response.data;
  },

  analyzeKeyFlow: async (keys: string[]) => {
    const response = await api.post<{
      overall: string;
      transitions: { from: string; to: string; compatibility: string }[];
      warnings: string[];
    }>('/ai/analyze-key-flow', keys);
    return response.data;
  },

  chat: async (messages: { role: string; content: string }[], context?: object) => {
    const response = await api.post<{
      message: string;
      setlist?: SetlistGenerateResponse;
      action?: string;
    }>('/ai/chat', { messages, context });
    return response.data;
  },

  recommendChainSongs: async (request: ChainSongRequest) => {
    const response = await api.post<ChainSongResponse>('/ai/chain-songs', request);
    return response.data;
  },
};

// Playlists API
export const playlistApi = {
  generateFromSetlist: async (setlistId: number) => {
    const response = await api.post<{
      setlist_id: number;
      setlist_title: string;
      playlist_url: string | null;
      embed_url: string | null;
      video_ids: string[];
      total_songs: number;
      songs_with_youtube: number;
      songs_without_youtube: string[];
    }>('/playlists/generate', { setlist_id: setlistId });
    return response.data;
  },

  getYoutubeUrl: async (setlistId: number) => {
    const response = await api.get<{
      setlist_id: number;
      setlist_title: string;
      playlist_url: string | null;
      embed_url: string | null;
      video_ids: string[];
      total_songs: number;
      songs_with_youtube: number;
      songs_without_youtube: string[];
    }>(`/playlists/${setlistId}/youtube-url`);
    return response.data;
  },
};

// Share API
export const shareApi = {
  createShareLink: async (setlistId: number, expiresDays?: number) => {
    const response = await api.post<{
      token: string;
      setlist_id: number;
      expires_at: string | null;
      share_url: string;
    }>(`/share/setlists/${setlistId}`, { expires_days: expiresDays });
    return response.data;
  },

  getSharedSetlist: async (token: string) => {
    const response = await api.get<{
      setlist: {
        id: number;
        title: string;
        date: string | null;
        service_type: string | null;
        sermon_topic: string | null;
        sermon_scripture: string | null;
        total_duration_sec: number | null;
        notes: string | null;
        is_public: boolean;
        songs: Array<{
          id: number;
          song_id: number;
          order: number;
          key: string;
          song: Song | null;
        }>;
        created_at: string;
        updated_at: string;
      };
      shared_at: string;
      expires_at: string | null;
    }>(`/share/shared/${token}`);
    return response.data;
  },

  revokeShareLinks: async (setlistId: number) => {
    const response = await api.delete<{ message: string }>(`/share/setlists/${setlistId}/revoke`);
    return response.data;
  },
};

// Trends API
export const trendsApi = {
  getChannels: async (category?: string) => {
    const response = await api.get<WorshipChannel[]>('/trends/channels', {
      params: category ? { category } : undefined,
    });
    return response.data;
  },

  searchVideos: async (params?: {
    query?: string;
    days_back?: number;
    max_results?: number;
  }) => {
    const response = await api.get<VideoInfo[]>('/trends/search', { params });
    return response.data;
  },

  getChannelVideos: async (channelId: string, maxResults?: number) => {
    const response = await api.get<VideoInfo[]>(`/trends/channel/${channelId}/videos`, {
      params: maxResults ? { max_results: maxResults } : undefined,
    });
    return response.data;
  },

  getWeeklyTrends: async (daysBack?: number, forceRefresh?: boolean) => {
    const response = await api.get<TrendAnalysis>('/trends/weekly', {
      params: {
        ...(daysBack && { days_back: daysBack }),
        ...(forceRefresh && { force_refresh: true }),
      },
    });
    return response.data;
  },

  clearCache: async () => {
    const response = await api.post('/trends/cache/clear');
    return response.data;
  },

  getSongPopularity: async (songTitle: string, daysBack?: number) => {
    const response = await api.get<{
      song_title: string;
      video_count: number;
      channels: string[];
      channel_count: number;
      recent_videos: VideoInfo[];
    }>('/trends/song-popularity', {
      params: { song_title: songTitle, days_back: daysBack },
    });
    return response.data;
  },
};

// Chords API
export interface ChordChartData {
  id: number;
  song_id: number;
  key: string;
  content: string;
  chordpro_content?: string;
  source: string;
  confidence?: number;
  created_at: string;
  updated_at: string;
}

export interface TransposeRequest {
  content: string;
  from_key: string;
  to_key: string;
}

export interface TransposeResponse {
  content: string;
  from_key: string;
  to_key: string;
  semitones: number;
}

export interface ParsedLineSegment {
  chord?: string;
  lyric: string;
}

export interface ParsedLine {
  segments: ParsedLineSegment[];
}

export interface ParseResponse {
  title?: string;
  artist?: string;
  key?: string;
  tempo?: number;
  lines: ParsedLine[];
  chords: string[];
  html: string;
}

export interface ValidateResponse {
  is_valid: boolean;
  warnings: string[];
}

export const chordsApi = {
  // Get chord charts for a song
  getForSong: async (songId: number) => {
    const response = await api.get<ChordChartData[]>(`/chords/songs/${songId}`);
    return response.data;
  },

  // Save chord chart for a song
  saveForSong: async (songId: number, data: {
    key: string;
    content: string;
    chordpro_content?: string;
    source?: string;
    confidence?: number;
  }) => {
    const response = await api.post<ChordChartData>(`/chords/songs/${songId}`, data);
    return response.data;
  },

  // Update chord chart
  updateForSong: async (songId: number, chartId: number, data: {
    key?: string;
    content?: string;
    chordpro_content?: string;
    source?: string;
    confidence?: number;
  }) => {
    const response = await api.put<ChordChartData>(`/chords/songs/${songId}/${chartId}`, data);
    return response.data;
  },

  // Delete chord chart
  deleteForSong: async (songId: number, chartId: number) => {
    await api.delete(`/chords/songs/${songId}/${chartId}`);
  },

  // Transpose ChordPro content
  transpose: async (request: TransposeRequest) => {
    const response = await api.post<TransposeResponse>('/chords/transpose', request);
    return response.data;
  },

  // Parse ChordPro content
  parse: async (content: string) => {
    const response = await api.post<ParseResponse>('/chords/parse', { content });
    return response.data;
  },

  // Convert to HTML
  toHtml: async (content: string, highlightClass: string = 'chord') => {
    const response = await api.post<{ html: string }>('/chords/to-html', {
      content,
      highlight_class: highlightClass,
    });
    return response.data;
  },

  // Detect key from content
  detectKey: async (content: string) => {
    const response = await api.post<{ key?: string; confidence: string }>('/chords/detect-key', {
      content,
    });
    return response.data;
  },

  // Validate ChordPro content
  validate: async (content: string) => {
    const response = await api.post<ValidateResponse>('/chords/validate', { content });
    return response.data;
  },

  // Extract chords from content
  extractChords: async (content: string) => {
    const response = await api.post<{
      chords: string[];
      details: { chord: string; root: string; quality: string; bass?: string }[];
      count: number;
    }>('/chords/extract-chords', { content });
    return response.data;
  },

  // AI chord extraction from lyrics
  aiExtract: async (request: {
    title: string;
    artist: string;
    lyrics: string;
    key?: string;
  }) => {
    const response = await api.post<{
      success: boolean;
      key?: string;
      time_signature?: string;
      chordpro?: string;
      chord_progression?: string[];
      unique_chords?: string[];
      confidence?: number;
      notes?: string;
      source: string;
      error?: string;
    }>('/chords/ai-extract', request);
    return response.data;
  },
};

// Favorites API
export const favoritesApi = {
  add: async (songId: number) => {
    const response = await api.post<{
      id: number;
      song_id: number;
      created_at: string;
    }>(`/favorites/${songId}`);
    return response.data;
  },

  remove: async (songId: number) => {
    await api.delete(`/favorites/${songId}`);
  },

  getAll: async () => {
    const response = await api.get<{
      favorites: {
        id: number;
        title: string;
        title_en?: string;
        artist: string;
        default_key: string;
        bpm?: number;
        duration_sec?: number;
        youtube_url?: string;
        favorited_at: string;
      }[];
      total: number;
    }>('/favorites');
    return response.data;
  },

  getIds: async () => {
    const response = await api.get<number[]>('/favorites/ids');
    return response.data;
  },
};

// Export API
export interface ExportRequest {
  setlist_id?: number;
  songs?: {
    title: string;
    artist: string;
    key: string;
    role?: string;
    duration_sec?: number;
    lyrics?: string;
  }[];
  setlist_name?: string;
  date?: string;
  service_type?: string;
}

export const exportApi = {
  // PDF setlist summary
  pdfSetlist: async (request: ExportRequest) => {
    const response = await api.post<{
      format: string;
      content: string;
      filename: string;
    }>('/export/pdf/setlist', request);
    return response.data;
  },

  // PDF single song
  pdfSong: async (songId: number, options?: { key?: string; include_chords?: boolean; chordpro_content?: string }) => {
    const response = await api.post<{
      format: string;
      content: string;
      filename: string;
    }>('/export/pdf/song', { song_id: songId, ...options });
    return response.data;
  },

  // PowerPoint export
  powerpoint: async (request: ExportRequest, includeChords = false) => {
    const response = await api.post('/export/powerpoint', request, {
      params: { include_chords: includeChords },
      responseType: 'blob'
    });
    return response.data;
  },

  // Plain text export
  text: async (request: ExportRequest, includeChords = false) => {
    const response = await api.post<{
      format: string;
      content: string;
      filename: string;
    }>('/export/text', request, { params: { include_chords: includeChords } });
    return response.data;
  },

  // ProPresenter export
  propresenter: async (request: ExportRequest) => {
    const response = await api.post('/export/propresenter', request, {
      responseType: 'blob'
    });
    return response.data;
  },

  // OpenLyrics XML export
  openlyrics: async (songId: number, key?: string) => {
    const response = await api.post(`/export/openlyrics/${songId}`, null, {
      params: { key },
      responseType: 'blob'
    });
    return response.data;
  },
};

// Teams API
export interface TeamCreateRequest {
  name: string;
  description?: string;
  church_name?: string;
  location?: string;
  default_service_type?: string;
  timezone?: string;
}

export interface TeamInviteRequest {
  email: string;
  role?: TeamRole;
  message?: string;
}

export interface ScheduleCreateRequest {
  title: string;
  service_type: string;
  date: string;
  description?: string;
  location?: string;
  setlist_id?: number;
}

export interface AssignmentCreateRequest {
  user_id: number;
  position: string;
  notes?: string;
}

export const teamsApi = {
  // Get user's teams
  getMyTeams: async () => {
    const response = await api.get<{
      teams: Team[];
      total: number;
    }>('/teams');
    return response.data;
  },

  // Create team
  create: async (data: TeamCreateRequest) => {
    const response = await api.post<Team & { members: TeamMember[] }>('/teams', data);
    return response.data;
  },

  // Get team details
  getById: async (teamId: number) => {
    const response = await api.get<Team & { members: TeamMember[] }>(`/teams/${teamId}`);
    return response.data;
  },

  // Update team
  update: async (teamId: number, data: Partial<TeamCreateRequest>) => {
    const response = await api.put<Team>(`/teams/${teamId}`, data);
    return response.data;
  },

  // Delete team
  delete: async (teamId: number) => {
    await api.delete(`/teams/${teamId}`);
  },

  // Update member role
  updateMemberRole: async (teamId: number, userId: number, role: TeamRole) => {
    const response = await api.put<TeamMember>(`/teams/${teamId}/members/${userId}`, { role });
    return response.data;
  },

  // Remove member
  removeMember: async (teamId: number, userId: number) => {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },

  // Create invite
  createInvite: async (teamId: number, data: TeamInviteRequest) => {
    const response = await api.post<TeamInvite>(`/teams/${teamId}/invites`, data);
    return response.data;
  },

  // Get team invites
  getInvites: async (teamId: number, status?: string) => {
    const response = await api.get<{
      invites: TeamInvite[];
      total: number;
    }>(`/teams/${teamId}/invites`, { params: status ? { status } : undefined });
    return response.data;
  },

  // Cancel invite
  cancelInvite: async (teamId: number, inviteId: number) => {
    await api.delete(`/teams/${teamId}/invites/${inviteId}`);
  },

  // Accept invite
  acceptInvite: async (token: string) => {
    const response = await api.post<{ message: string }>(`/teams/invites/${token}/accept`);
    return response.data;
  },

  // Decline invite
  declineInvite: async (token: string) => {
    const response = await api.post<{ message: string }>(`/teams/invites/${token}/decline`);
    return response.data;
  },

  // Get schedules
  getSchedules: async (teamId: number, upcomingOnly = false) => {
    const response = await api.get<{
      schedules: ServiceSchedule[];
      total: number;
    }>(`/teams/${teamId}/schedules`, { params: { upcoming_only: upcomingOnly } });
    return response.data;
  },

  // Create schedule
  createSchedule: async (teamId: number, data: ScheduleCreateRequest) => {
    const response = await api.post<ServiceSchedule>(`/teams/${teamId}/schedules`, data);
    return response.data;
  },

  // Update schedule
  updateSchedule: async (teamId: number, scheduleId: number, data: Partial<ScheduleCreateRequest & { is_confirmed?: boolean }>) => {
    const response = await api.put<ServiceSchedule>(`/teams/${teamId}/schedules/${scheduleId}`, data);
    return response.data;
  },

  // Delete schedule
  deleteSchedule: async (teamId: number, scheduleId: number) => {
    await api.delete(`/teams/${teamId}/schedules/${scheduleId}`);
  },

  // Create assignment
  createAssignment: async (teamId: number, scheduleId: number, data: AssignmentCreateRequest) => {
    const response = await api.post(`/teams/${teamId}/schedules/${scheduleId}/assignments`, data);
    return response.data;
  },

  // Remove assignment
  removeAssignment: async (teamId: number, scheduleId: number, assignmentId: number) => {
    await api.delete(`/teams/${teamId}/schedules/${scheduleId}/assignments/${assignmentId}`);
  },

  // Confirm assignment
  confirmAssignment: async (teamId: number, scheduleId: number, assignmentId: number) => {
    const response = await api.post<{ message: string }>(`/teams/${teamId}/schedules/${scheduleId}/assignments/${assignmentId}/confirm`);
    return response.data;
  },
};

export default api;
