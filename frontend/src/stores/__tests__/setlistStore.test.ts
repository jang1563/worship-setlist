import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useSetlistStore } from '../setlistStore'
import type { Song } from '@/types'

describe('setlistStore', () => {
  const mockSong: Song = {
    id: 1,
    title: '테스트 찬양',
    artist: '테스트 아티스트',
    default_key: 'G',
    mood_tags: ['경배'],
    service_types: ['주일예배'],
    season_tags: [],
    difficulty: 'medium',
    min_instruments: ['piano'],
    scripture_refs: [],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  const mockSong2: Song = {
    id: 2,
    title: '두번째 찬양',
    artist: '다른 아티스트',
    default_key: 'D',
    mood_tags: ['찬양'],
    service_types: ['주일예배'],
    season_tags: [],
    difficulty: 'easy',
    min_instruments: ['piano'],
    scripture_refs: [],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useSetlistStore.getState().clearSetlist()
      useSetlistStore.getState().setAvailableSongs([])
    })
  })

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const state = useSetlistStore.getState()
      expect(state.currentSetlist).toBe(null)
      expect(state.editingSongs).toEqual([])
      expect(state.availableSongs).toEqual([])
    })
  })

  describe('addSongToSetlist', () => {
    it('should add song with default key', () => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong)
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs.length).toBe(1)
      expect(state.editingSongs[0].song_id).toBe(mockSong.id)
      expect(state.editingSongs[0].key).toBe('G')
      expect(state.editingSongs[0].order).toBe(1)
    })

    it('should add song with custom key', () => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong, 'A')
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs[0].key).toBe('A')
    })

    it('should increment order for multiple songs', () => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong)
        useSetlistStore.getState().addSongToSetlist(mockSong2)
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs.length).toBe(2)
      expect(state.editingSongs[0].order).toBe(1)
      expect(state.editingSongs[1].order).toBe(2)
    })
  })

  describe('removeSongFromSetlist', () => {
    beforeEach(() => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong)
        useSetlistStore.getState().addSongToSetlist(mockSong2)
      })
    })

    it('should remove song at index', () => {
      act(() => {
        useSetlistStore.getState().removeSongFromSetlist(0)
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs.length).toBe(1)
      expect(state.editingSongs[0].song_id).toBe(mockSong2.id)
    })

    it('should reorder remaining songs', () => {
      act(() => {
        useSetlistStore.getState().removeSongFromSetlist(0)
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs[0].order).toBe(1)
    })
  })

  describe('reorderSongs', () => {
    beforeEach(() => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong)
        useSetlistStore.getState().addSongToSetlist(mockSong2)
      })
    })

    it('should swap song positions', () => {
      act(() => {
        useSetlistStore.getState().reorderSongs(0, 1)
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs[0].song_id).toBe(mockSong2.id)
      expect(state.editingSongs[1].song_id).toBe(mockSong.id)
    })

    it('should update order numbers', () => {
      act(() => {
        useSetlistStore.getState().reorderSongs(0, 1)
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs[0].order).toBe(1)
      expect(state.editingSongs[1].order).toBe(2)
    })
  })

  describe('updateSongKey', () => {
    beforeEach(() => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong)
      })
    })

    it('should update song key at index', () => {
      act(() => {
        useSetlistStore.getState().updateSongKey(0, 'A')
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs[0].key).toBe('A')
    })

    it('should not affect other songs', () => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong2)
        useSetlistStore.getState().updateSongKey(0, 'A')
      })

      const state = useSetlistStore.getState()
      expect(state.editingSongs[0].key).toBe('A')
      expect(state.editingSongs[1].key).toBe('D')
    })
  })

  describe('setAvailableSongs', () => {
    it('should set available songs', () => {
      act(() => {
        useSetlistStore.getState().setAvailableSongs([mockSong, mockSong2])
      })

      const state = useSetlistStore.getState()
      expect(state.availableSongs.length).toBe(2)
    })
  })

  describe('clearSetlist', () => {
    it('should clear all setlist data', () => {
      act(() => {
        useSetlistStore.getState().addSongToSetlist(mockSong)
        useSetlistStore.getState().clearSetlist()
      })

      const state = useSetlistStore.getState()
      expect(state.currentSetlist).toBe(null)
      expect(state.editingSongs).toEqual([])
    })
  })
})
