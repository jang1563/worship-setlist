export interface Song {
  id: number;
  title: string;
  title_en?: string;
  title_original?: string;
  artist: string;
  album?: string;
  year?: number;
  default_key: string;
  bpm?: number;
  duration_sec?: number;
  mood_tags: string[];
  service_types: string[];
  season_tags: string[];
  difficulty: string;
  min_instruments: string[];
  vocal_range_low?: string;
  vocal_range_high?: string;
  scripture_refs: string[];
  scripture_connection?: string;
  youtube_url?: string;
  hymn_number?: number;
  created_at: string;
  updated_at: string;
}

export interface SetlistSong {
  id: number;
  song_id: number;
  order: number;
  key: string;
  transition_type?: string;
  transition_chord_progression?: string;
  transition_notes?: string;
  role?: string;
  scripture_ref?: string;
  notes?: string;
  flow?: string; // Song structure like "V-C-V-C-B-C" (Verse-Chorus-Bridge)
  song?: Song;
}

export interface Setlist {
  id: number;
  title: string;
  date?: string;
  service_type?: string;
  sermon_topic?: string;
  sermon_scripture?: string;
  total_duration_sec?: number;
  notes?: string;
  is_public: boolean;
  songs: SetlistSong[];
  created_at: string;
  updated_at: string;
}

export interface SetlistGenerateRequest {
  service_type: string;
  duration_minutes: number;
  sermon_scripture?: string;
  sermon_topic?: string;
  instruments: string[];
  vocal_count: number;
  mood_request?: string;
  exclude_song_ids: number[];
  additional_notes?: string;
}

export interface SetlistSongItem {
  song_id: number;
  title: string;
  order: number;
  key: string;
  role: string;
  scripture_ref?: string;
  duration_sec: number;
  transition_to_next?: {
    type: string;
    progression: string;
    description: string;
  };
}

export interface SetlistGenerateResponse {
  setlist: SetlistSongItem[];
  total_duration_sec: number;
  key_flow_assessment: string;
  mood_flow: string;
  notes: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  setlist?: SetlistGenerateResponse;
}

export interface KeyCompatibility {
  from_key: string;
  to_key: string;
  compatibility: '자연스러움' | '괜찮음' | '어색함';
  suggestions: {
    compatibility: string;
    distance: number;
    progressions: {
      type: string;
      chords: string;
      description: string;
    }[];
  };
}

// YouTube Trends Types
export interface WorshipChannel {
  name: string;
  channel_id: string;
  channel_url: string;
  category: 'worship_team' | 'church' | 'international';
}

export interface VideoInfo {
  video_id: string;
  title: string;
  channel_name: string;
  published_at: string;
  view_count: number;
  thumbnail_url: string;
  video_url: string;
  extracted_songs: string[];
  service_type?: string;
}

export interface TrendAnalysis {
  period_start: string;
  period_end: string;
  top_songs: {
    title: string;
    count: number;
    channels: string[];
    video_url?: string;
  }[];
  top_channels: {
    name: string;
    video_count: number;
    total_views: number;
  }[];
  recent_videos: VideoInfo[];
  insights: string;
  is_cached?: boolean;
  last_updated?: string;
  is_mock_data?: boolean;
}

// ChordPro Types
export interface ChordChart {
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

export interface ParsedChordSegment {
  chord?: string;
  lyric: string;
}

export interface ParsedChordLine {
  segments: ParsedChordSegment[];
}

export interface ParsedChordPro {
  title?: string;
  artist?: string;
  key?: string;
  tempo?: number;
  lines: ParsedChordLine[];
  chords: string[];
  html: string;
}

// Chain Song Recommendation Types
export interface ChainSongRecommendation {
  song_id: number;
  title: string;
  artist: string;
  key: string;
  compatibility_score: number;
  key_compatibility: '자연스러움' | '괜찮음' | '어색함';
  mood_match: string;
  reason: string;
  suggested_transition?: string;
}

export interface ChainSongRequest {
  fixed_song_id: number;
  fixed_song_key: string;
  position: 'before' | 'after';
  service_type?: string;
  mood_preference?: string;
  exclude_song_ids: number[];
  limit: number;
}

export interface ChainSongResponse {
  fixed_song_title: string;
  fixed_song_key: string;
  recommendations: ChainSongRecommendation[];
  notes: string;
}

// Team Types
export type TeamRole = 'owner' | 'admin' | 'leader' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface TeamMember {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: TeamRole;
  instruments?: string[];
  joined_at: string;
}

// Practice Status Types
export type PracticeStatusType = 'not_started' | 'in_progress' | 'ready';

export interface PracticeStatus {
  id: number;
  setlist_id: number;
  setlist_song_id: number;
  status: PracticeStatusType;
  assigned_to?: number;
  assigned_name?: string;
  notes?: string;
  updated_at: string;
}

export interface SetlistReadiness {
  setlist_id: number;
  total_songs: number;
  ready_count: number;
  in_progress_count: number;
  not_started_count: number;
  ready_percentage: number;
  is_fully_ready: boolean;
}

export interface Team {
  id: number;
  name: string;
  description?: string;
  church_name?: string;
  location?: string;
  default_service_type: string;
  timezone: string;
  created_at: string;
  updated_at: string;
  member_count: number;
  members?: TeamMember[];
}

export interface TeamInvite {
  id: number;
  team_id: number;
  team_name: string;
  email: string;
  role: TeamRole;
  status: InviteStatus;
  message?: string;
  invited_by_name: string;
  created_at: string;
  expires_at: string;
}

export interface ServiceAssignment {
  id: number;
  user_id: number;
  user_name: string;
  position: string;
  notes?: string;
  is_confirmed: boolean;
  confirmed_at?: string;
}

export interface ServiceSchedule {
  id: number;
  team_id: number;
  setlist_id?: number;
  title: string;
  service_type: string;
  date: string;
  description?: string;
  location?: string;
  is_confirmed: boolean;
  assignments: ServiceAssignment[];
  created_at: string;
  updated_at: string;
}
