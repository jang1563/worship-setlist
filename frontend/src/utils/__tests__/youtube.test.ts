import { describe, it, expect } from 'vitest'
import {
  extractVideoId,
  formatTime,
  parseTime,
  generateMRSearchUrl,
  getThumbnailUrl,
} from '../youtube'

describe('extractVideoId', () => {
  it('should extract ID from standard YouTube URL', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from YouTube URL with extra params', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://www.youtube.com/watch?list=abc&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from short youtu.be URL', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from embed URL', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from /v/ URL', () => {
    expect(extractVideoId('https://www.youtube.com/v/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should return the input if already a video ID', () => {
    expect(extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should return null for invalid URLs', () => {
    expect(extractVideoId('')).toBe(null)
    expect(extractVideoId('https://www.google.com')).toBe(null)
    expect(extractVideoId('not-a-url')).toBe(null)
  })
})

describe('formatTime', () => {
  it('should format seconds to MM:SS', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(65)).toBe('1:05')
    expect(formatTime(599)).toBe('9:59')
  })

  it('should format to HH:MM:SS for long durations', () => {
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3665)).toBe('1:01:05')
    expect(formatTime(7200)).toBe('2:00:00')
  })

  it('should handle invalid input', () => {
    expect(formatTime(NaN)).toBe('0:00')
  })
})

describe('parseTime', () => {
  it('should parse MM:SS format', () => {
    expect(parseTime('0:00')).toBe(0)
    expect(parseTime('1:00')).toBe(60)
    expect(parseTime('1:30')).toBe(90)
    expect(parseTime('10:05')).toBe(605)
  })

  it('should parse HH:MM:SS format', () => {
    expect(parseTime('1:00:00')).toBe(3600)
    expect(parseTime('1:30:45')).toBe(5445)
    expect(parseTime('2:00:00')).toBe(7200)
  })

  it('should return 0 for invalid input', () => {
    expect(parseTime('')).toBe(0)
    expect(parseTime('invalid')).toBe(0)
  })
})

describe('generateMRSearchUrl', () => {
  it('should generate search URL with song title', () => {
    const url = generateMRSearchUrl('Amazing Grace')
    expect(url).toContain('youtube.com/results')
    expect(url).toContain(encodeURIComponent('Amazing Grace MR instrumental'))
  })

  it('should include artist if provided', () => {
    const url = generateMRSearchUrl('주의 사랑이', '마커스워십')
    expect(url).toContain(encodeURIComponent('주의 사랑이 마커스워십 MR instrumental'))
  })

  it('should properly encode Korean characters', () => {
    const url = generateMRSearchUrl('테스트 곡')
    expect(url).not.toContain(' ')  // Spaces should be encoded
    expect(decodeURIComponent(url)).toContain('테스트 곡')
  })
})

describe('getThumbnailUrl', () => {
  const videoId = 'dQw4w9WgXcQ'

  it('should return default quality URL', () => {
    const url = getThumbnailUrl(videoId, 'default')
    expect(url).toBe(`https://img.youtube.com/vi/${videoId}/default.jpg`)
  })

  it('should return medium quality URL', () => {
    const url = getThumbnailUrl(videoId, 'medium')
    expect(url).toBe(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`)
  })

  it('should return high quality URL', () => {
    const url = getThumbnailUrl(videoId, 'high')
    expect(url).toBe(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)
  })

  it('should return maxres quality URL', () => {
    const url = getThumbnailUrl(videoId, 'maxres')
    expect(url).toBe(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
  })

  it('should default to medium quality', () => {
    const url = getThumbnailUrl(videoId)
    expect(url).toContain('mqdefault')
  })
})
