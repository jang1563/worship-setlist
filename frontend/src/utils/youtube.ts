/**
 * YouTube 유틸리티 함수
 */

/**
 * YouTube URL에서 비디오 ID 추출
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    // https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([^&]+)/,
    // https://youtu.be/VIDEO_ID
    /youtu\.be\/([^?]+)/,
    // https://www.youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^?]+)/,
    // https://www.youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 이미 비디오 ID인 경우 (11자리)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  return null;
}

/**
 * 초를 MM:SS 또는 HH:MM:SS 형식으로 변환
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * MM:SS 형식을 초로 변환
 */
export function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(Number);

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return 0;
}

/**
 * 곡 제목으로 YouTube MR 검색 URL 생성
 */
export function generateMRSearchUrl(songTitle: string, artist?: string): string {
  const query = artist
    ? `${songTitle} ${artist} MR instrumental`
    : `${songTitle} MR instrumental`;

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * YouTube 썸네일 URL 생성
 */
export function getThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };

  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * 재생 속도 옵션
 */
export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type PlaybackRate = typeof PLAYBACK_RATES[number];
