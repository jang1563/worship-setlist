import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { usePlayerStore } from '../playerStore'

// Mock YT.Player interface
const createMockPlayer = () => ({
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  seekTo: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unMute: vi.fn(),
  setPlaybackRate: vi.fn(),
})

describe('playerStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      usePlayerStore.setState({
        videoId: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 100,
        isMuted: false,
        playbackRate: 1,
        isReady: false,
        loopStart: null,
        loopEnd: null,
        isLooping: false,
        currentSongId: null,
        currentSongTitle: null,
        playerRef: null,
      })
    })
  })

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = usePlayerStore.getState()
      expect(state.videoId).toBe(null)
      expect(state.isPlaying).toBe(false)
      expect(state.currentTime).toBe(0)
      expect(state.duration).toBe(0)
      expect(state.volume).toBe(100)
      expect(state.isMuted).toBe(false)
      expect(state.playbackRate).toBe(1)
      expect(state.isReady).toBe(false)
      expect(state.loopStart).toBe(null)
      expect(state.loopEnd).toBe(null)
      expect(state.isLooping).toBe(false)
    })
  })

  describe('video controls', () => {
    it('should set video ID and reset state', () => {
      act(() => {
        usePlayerStore.getState().setCurrentTime(100)
        usePlayerStore.getState().setDuration(300)
        usePlayerStore.getState().setIsReady(true)
        usePlayerStore.getState().setVideoId('test-video-id')
      })

      const state = usePlayerStore.getState()
      expect(state.videoId).toBe('test-video-id')
      expect(state.currentTime).toBe(0) // Reset
      expect(state.duration).toBe(0) // Reset
      expect(state.isReady).toBe(false) // Reset
    })

    it('should set playing state', () => {
      act(() => {
        usePlayerStore.getState().setIsPlaying(true)
      })
      expect(usePlayerStore.getState().isPlaying).toBe(true)

      act(() => {
        usePlayerStore.getState().setIsPlaying(false)
      })
      expect(usePlayerStore.getState().isPlaying).toBe(false)
    })

    it('should set duration', () => {
      act(() => {
        usePlayerStore.getState().setDuration(240)
      })
      expect(usePlayerStore.getState().duration).toBe(240)
    })

    it('should set ready state', () => {
      act(() => {
        usePlayerStore.getState().setIsReady(true)
      })
      expect(usePlayerStore.getState().isReady).toBe(true)
    })
  })

  describe('playback rate', () => {
    it('should set playback rate', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setPlaybackRate(0.75)
      })

      const state = usePlayerStore.getState()
      expect(state.playbackRate).toBe(0.75)
      expect(mockPlayer.setPlaybackRate).toHaveBeenCalledWith(0.75)
    })

    it('should update playback rate without player', () => {
      act(() => {
        usePlayerStore.getState().setPlaybackRate(1.25)
      })
      expect(usePlayerStore.getState().playbackRate).toBe(1.25)
    })
  })

  describe('volume controls', () => {
    it('should set volume', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setVolume(50)
      })

      const state = usePlayerStore.getState()
      expect(state.volume).toBe(50)
      expect(state.isMuted).toBe(false)
      expect(mockPlayer.setVolume).toHaveBeenCalledWith(50)
    })

    it('should set muted when volume is 0', () => {
      act(() => {
        usePlayerStore.getState().setVolume(0)
      })

      const state = usePlayerStore.getState()
      expect(state.volume).toBe(0)
      expect(state.isMuted).toBe(true)
    })

    it('should toggle mute', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().toggleMute()
      })

      expect(usePlayerStore.getState().isMuted).toBe(true)
      expect(mockPlayer.mute).toHaveBeenCalled()

      act(() => {
        usePlayerStore.getState().toggleMute()
      })

      expect(usePlayerStore.getState().isMuted).toBe(false)
      expect(mockPlayer.unMute).toHaveBeenCalled()
    })
  })

  describe('loop controls', () => {
    it('should set loop start', () => {
      act(() => {
        usePlayerStore.getState().setLoopStart(10)
      })
      expect(usePlayerStore.getState().loopStart).toBe(10)
    })

    it('should set loop end', () => {
      act(() => {
        usePlayerStore.getState().setLoopEnd(30)
      })
      expect(usePlayerStore.getState().loopEnd).toBe(30)
    })

    it('should toggle loop', () => {
      act(() => {
        usePlayerStore.getState().toggleLoop()
      })
      expect(usePlayerStore.getState().isLooping).toBe(true)

      act(() => {
        usePlayerStore.getState().toggleLoop()
      })
      expect(usePlayerStore.getState().isLooping).toBe(false)
    })

    it('should clear loop', () => {
      act(() => {
        usePlayerStore.getState().setLoopStart(10)
        usePlayerStore.getState().setLoopEnd(30)
        usePlayerStore.getState().toggleLoop()
        usePlayerStore.getState().clearLoop()
      })

      const state = usePlayerStore.getState()
      expect(state.loopStart).toBe(null)
      expect(state.loopEnd).toBe(null)
      expect(state.isLooping).toBe(false)
    })

    it('should loop back to start when reaching loop end', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setLoopStart(10)
        usePlayerStore.getState().setLoopEnd(30)
        usePlayerStore.getState().toggleLoop()
      })

      // Simulate reaching loop end
      act(() => {
        usePlayerStore.getState().setCurrentTime(30)
      })

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(10, true)
    })

    it('should not loop when looping is disabled', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setLoopStart(10)
        usePlayerStore.getState().setLoopEnd(30)
        // Don't enable looping
      })

      act(() => {
        usePlayerStore.getState().setCurrentTime(30)
      })

      expect(mockPlayer.seekTo).not.toHaveBeenCalled()
    })
  })

  describe('seek controls', () => {
    it('should seek to absolute time', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().seek(60)
      })

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(60, true)
      expect(usePlayerStore.getState().currentTime).toBe(60)
    })

    it('should seek relative forward', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setDuration(300)
        usePlayerStore.getState().setCurrentTime(100)
      })

      act(() => {
        usePlayerStore.getState().seekRelative(10)
      })

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(110, true)
      expect(usePlayerStore.getState().currentTime).toBe(110)
    })

    it('should seek relative backward', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setDuration(300)
        usePlayerStore.getState().setCurrentTime(100)
      })

      act(() => {
        usePlayerStore.getState().seekRelative(-10)
      })

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(90, true)
    })

    it('should clamp seek to 0', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setDuration(300)
        usePlayerStore.getState().setCurrentTime(5)
      })

      act(() => {
        usePlayerStore.getState().seekRelative(-20)
      })

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(0, true)
      expect(usePlayerStore.getState().currentTime).toBe(0)
    })

    it('should clamp seek to duration', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().setDuration(300)
        usePlayerStore.getState().setCurrentTime(295)
      })

      act(() => {
        usePlayerStore.getState().seekRelative(20)
      })

      expect(mockPlayer.seekTo).toHaveBeenCalledWith(300, true)
      expect(usePlayerStore.getState().currentTime).toBe(300)
    })
  })

  describe('play/pause controls', () => {
    it('should call playVideo on play', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().play()
      })

      expect(mockPlayer.playVideo).toHaveBeenCalled()
    })

    it('should call pauseVideo on pause', () => {
      const mockPlayer = createMockPlayer()
      act(() => {
        usePlayerStore.getState().setPlayerRef(mockPlayer as unknown as YT.Player)
        usePlayerStore.getState().pause()
      })

      expect(mockPlayer.pauseVideo).toHaveBeenCalled()
    })
  })

  describe('song info', () => {
    it('should set current song', () => {
      act(() => {
        usePlayerStore.getState().setCurrentSong(123, '나의 찬양')
      })

      const state = usePlayerStore.getState()
      expect(state.currentSongId).toBe(123)
      expect(state.currentSongTitle).toBe('나의 찬양')
    })

    it('should clear current song', () => {
      act(() => {
        usePlayerStore.getState().setCurrentSong(123, '나의 찬양')
        usePlayerStore.getState().setCurrentSong(null, null)
      })

      const state = usePlayerStore.getState()
      expect(state.currentSongId).toBe(null)
      expect(state.currentSongTitle).toBe(null)
    })
  })
})
