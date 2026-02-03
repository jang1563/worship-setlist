import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PracticeSettings {
  // Saved per song
  songSettings: Record<number, {
    playbackRate: number;
    loopStart: number | null;
    loopEnd: number | null;
    volume: number;
  }>;

  // Global settings
  autoScroll: boolean;
  showNextChord: boolean;
  highlightCurrentChord: boolean;
  scrollOffset: number; // pixels from top

  // Actions
  saveSongSettings: (songId: number, settings: {
    playbackRate?: number;
    loopStart?: number | null;
    loopEnd?: number | null;
    volume?: number;
  }) => void;
  getSongSettings: (songId: number) => {
    playbackRate: number;
    loopStart: number | null;
    loopEnd: number | null;
    volume: number;
  };

  setAutoScroll: (enabled: boolean) => void;
  setShowNextChord: (enabled: boolean) => void;
  setHighlightCurrentChord: (enabled: boolean) => void;
  setScrollOffset: (offset: number) => void;
}

const defaultSongSettings = {
  playbackRate: 1,
  loopStart: null,
  loopEnd: null,
  volume: 100,
};

export const usePracticeStore = create<PracticeSettings>()(
  persist(
    (set, get) => ({
      songSettings: {},
      autoScroll: true,
      showNextChord: true,
      highlightCurrentChord: true,
      scrollOffset: 200,

      saveSongSettings: (songId, settings) => set((state) => ({
        songSettings: {
          ...state.songSettings,
          [songId]: {
            ...defaultSongSettings,
            ...state.songSettings[songId],
            ...settings,
          },
        },
      })),

      getSongSettings: (songId) => {
        const { songSettings } = get();
        return songSettings[songId] || defaultSongSettings;
      },

      setAutoScroll: (enabled) => set({ autoScroll: enabled }),
      setShowNextChord: (enabled) => set({ showNextChord: enabled }),
      setHighlightCurrentChord: (enabled) => set({ highlightCurrentChord: enabled }),
      setScrollOffset: (offset) => set({ scrollOffset: offset }),
    }),
    {
      name: 'worshipflow-practice-settings',
    }
  )
);
