import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { favoritesApi } from '@/services/api';

interface FavoritesState {
  // Set of song IDs that are favorited
  favoriteIds: Set<number>;
  // Whether user is authenticated (affects API vs localStorage usage)
  isAuthenticated: boolean;
  // Loading state
  isLoading: boolean;
  // Error state
  error: string | null;

  // Actions
  setAuthenticated: (value: boolean) => void;
  loadFavorites: () => Promise<void>;
  addFavorite: (songId: number) => Promise<void>;
  removeFavorite: (songId: number) => Promise<void>;
  toggleFavorite: (songId: number) => Promise<void>;
  isFavorite: (songId: number) => boolean;
  clearError: () => void;
}

// Helper to convert Set to array for serialization
const setToArray = (set: Set<number>): number[] => Array.from(set);
const arrayToSet = (arr: number[]): Set<number> => new Set(arr);

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: new Set(),
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAuthenticated: (value: boolean) => set({ isAuthenticated: value }),

      loadFavorites: async () => {
        const { isAuthenticated } = get();

        if (!isAuthenticated) {
          // For non-authenticated users, favorites are already loaded from localStorage via persist
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const ids = await favoritesApi.getIds();
          set({ favoriteIds: new Set(ids), isLoading: false });
        } catch (error) {
          console.error('Failed to load favorites:', error);
          set({ error: 'Failed to load favorites', isLoading: false });
        }
      },

      addFavorite: async (songId: number) => {
        const { isAuthenticated, favoriteIds } = get();

        // Optimistic update
        const newFavorites = new Set(favoriteIds);
        newFavorites.add(songId);
        set({ favoriteIds: newFavorites });

        if (isAuthenticated) {
          try {
            await favoritesApi.add(songId);
          } catch (error) {
            // Revert on error
            const revertedFavorites = new Set(favoriteIds);
            revertedFavorites.delete(songId);
            set({ favoriteIds: revertedFavorites, error: 'Failed to add favorite' });
            console.error('Failed to add favorite:', error);
          }
        }
      },

      removeFavorite: async (songId: number) => {
        const { isAuthenticated, favoriteIds } = get();

        // Optimistic update
        const newFavorites = new Set(favoriteIds);
        newFavorites.delete(songId);
        set({ favoriteIds: newFavorites });

        if (isAuthenticated) {
          try {
            await favoritesApi.remove(songId);
          } catch (error) {
            // Revert on error
            const revertedFavorites = new Set(favoriteIds);
            revertedFavorites.add(songId);
            set({ favoriteIds: revertedFavorites, error: 'Failed to remove favorite' });
            console.error('Failed to remove favorite:', error);
          }
        }
      },

      toggleFavorite: async (songId: number) => {
        const { isFavorite, addFavorite, removeFavorite } = get();

        if (isFavorite(songId)) {
          await removeFavorite(songId);
        } else {
          await addFavorite(songId);
        }
      },

      isFavorite: (songId: number) => {
        return get().favoriteIds.has(songId);
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'worshipflow-favorites',
      // Custom serialization for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          try {
            const parsed = JSON.parse(str);
            return {
              ...parsed,
              state: {
                ...parsed.state,
                favoriteIds: arrayToSet(parsed.state.favoriteIds || []),
              },
            };
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              favoriteIds: setToArray(value.state.favoriteIds),
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Only persist favoriteIds, not loading/error states
      partialize: (state) => ({
        favoriteIds: state.favoriteIds,
      }) as FavoritesState,
    }
  )
);
