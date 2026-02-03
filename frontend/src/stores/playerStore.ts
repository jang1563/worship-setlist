import { create } from 'zustand';

interface PlayerState {
  // Video state
  videoId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isReady: boolean;

  // Loop state
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;

  // Song info
  currentSongId: number | null;
  currentSongTitle: string | null;

  // Player reference
  playerRef: YT.Player | null;

  // Actions
  setVideoId: (id: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  setIsReady: (ready: boolean) => void;

  setLoopStart: (time: number | null) => void;
  setLoopEnd: (time: number | null) => void;
  toggleLoop: () => void;
  clearLoop: () => void;

  setCurrentSong: (id: number | null, title: string | null) => void;
  setPlayerRef: (player: YT.Player | null) => void;

  // Player controls
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
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

  setVideoId: (id) => set({ videoId: id, isReady: false, currentTime: 0, duration: 0 }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => {
    const { isLooping, loopStart, loopEnd, playerRef } = get();

    // Check loop boundaries
    if (isLooping && loopStart !== null && loopEnd !== null) {
      if (time >= loopEnd) {
        playerRef?.seekTo(loopStart, true);
        return;
      }
    }

    set({ currentTime: time });
  },
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => {
    const { playerRef } = get();
    playerRef?.setVolume(volume);
    set({ volume, isMuted: volume === 0 });
  },
  toggleMute: () => {
    const { isMuted, playerRef, volume } = get();
    if (isMuted) {
      playerRef?.unMute();
      playerRef?.setVolume(volume);
    } else {
      playerRef?.mute();
    }
    set({ isMuted: !isMuted });
  },
  setPlaybackRate: (rate) => {
    const { playerRef } = get();
    playerRef?.setPlaybackRate(rate);
    set({ playbackRate: rate });
  },
  setIsReady: (ready) => set({ isReady: ready }),

  setLoopStart: (time) => set({ loopStart: time }),
  setLoopEnd: (time) => set({ loopEnd: time }),
  toggleLoop: () => set((state) => ({ isLooping: !state.isLooping })),
  clearLoop: () => set({ loopStart: null, loopEnd: null, isLooping: false }),

  setCurrentSong: (id, title) => set({ currentSongId: id, currentSongTitle: title }),
  setPlayerRef: (player) => set({ playerRef: player }),

  play: () => {
    const { playerRef } = get();
    playerRef?.playVideo();
  },
  pause: () => {
    const { playerRef } = get();
    playerRef?.pauseVideo();
  },
  seek: (time) => {
    const { playerRef } = get();
    playerRef?.seekTo(time, true);
    set({ currentTime: time });
  },
  seekRelative: (delta) => {
    const { currentTime, duration, playerRef } = get();
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    playerRef?.seekTo(newTime, true);
    set({ currentTime: newTime });
  },
}));
