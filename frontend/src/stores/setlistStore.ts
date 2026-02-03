import { create } from 'zustand';
import type { Setlist, SetlistSong, Song } from '@/types';

interface SetlistState {
  currentSetlist: Setlist | null;
  editingSongs: SetlistSong[];
  availableSongs: Song[];
  setCurrentSetlist: (setlist: Setlist | null) => void;
  setEditingSongs: (songs: SetlistSong[]) => void;
  setAvailableSongs: (songs: Song[]) => void;
  addSongToSetlist: (song: Song, key?: string) => void;
  removeSongFromSetlist: (index: number) => void;
  reorderSongs: (fromIndex: number, toIndex: number) => void;
  updateSongKey: (index: number, key: string) => void;
  clearSetlist: () => void;
}

export const useSetlistStore = create<SetlistState>((set) => ({
  currentSetlist: null,
  editingSongs: [],
  availableSongs: [],

  setCurrentSetlist: (setlist) =>
    set({
      currentSetlist: setlist,
      editingSongs: setlist?.songs || [],
    }),

  setEditingSongs: (songs) =>
    set({ editingSongs: songs }),

  setAvailableSongs: (songs) =>
    set({ availableSongs: songs }),

  addSongToSetlist: (song, key) =>
    set((state) => {
      const newSong: SetlistSong = {
        id: Date.now(),
        song_id: song.id,
        order: state.editingSongs.length + 1,
        key: key || song.default_key,
        song: song,
      };
      return {
        editingSongs: [...state.editingSongs, newSong],
      };
    }),

  removeSongFromSetlist: (index) =>
    set((state) => {
      const newSongs = [...state.editingSongs];
      newSongs.splice(index, 1);
      // Reorder
      return {
        editingSongs: newSongs.map((s, i) => ({ ...s, order: i + 1 })),
      };
    }),

  reorderSongs: (fromIndex, toIndex) =>
    set((state) => {
      const newSongs = [...state.editingSongs];
      const [removed] = newSongs.splice(fromIndex, 1);
      newSongs.splice(toIndex, 0, removed);
      // Reorder
      return {
        editingSongs: newSongs.map((s, i) => ({ ...s, order: i + 1 })),
      };
    }),

  updateSongKey: (index, key) =>
    set((state) => {
      const newSongs = [...state.editingSongs];
      newSongs[index] = { ...newSongs[index], key };
      return { editingSongs: newSongs };
    }),

  clearSetlist: () =>
    set({
      currentSetlist: null,
      editingSongs: [],
    }),
}));
