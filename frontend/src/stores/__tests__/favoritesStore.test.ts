import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFavoritesStore } from '../favoritesStore';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock the API
vi.mock('@/services/api', () => ({
  favoritesApi: {
    getIds: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('favoritesStore', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    useFavoritesStore.setState({
      favoriteIds: new Set(),
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  describe('toggleFavorite', () => {
    it('should add a song to favorites', async () => {
      const store = useFavoritesStore.getState();

      expect(store.isFavorite(1)).toBe(false);
      await store.toggleFavorite(1);
      expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);
    });

    it('should remove a song from favorites', async () => {
      const store = useFavoritesStore.getState();
      await store.toggleFavorite(1);
      expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);

      await useFavoritesStore.getState().toggleFavorite(1);
      expect(useFavoritesStore.getState().isFavorite(1)).toBe(false);
    });

    it('should handle multiple favorites', async () => {
      const store = useFavoritesStore.getState();

      await store.addFavorite(1);
      await store.addFavorite(2);
      await store.addFavorite(3);

      const state = useFavoritesStore.getState();
      expect(state.isFavorite(1)).toBe(true);
      expect(state.isFavorite(2)).toBe(true);
      expect(state.isFavorite(3)).toBe(true);
      expect(state.isFavorite(4)).toBe(false);
    });
  });

  describe('isFavorite', () => {
    it('should return false for non-favorite song', () => {
      const { isFavorite } = useFavoritesStore.getState();
      expect(isFavorite(999)).toBe(false);
    });

    it('should return true for favorite song', async () => {
      const store = useFavoritesStore.getState();
      await store.addFavorite(42);
      expect(useFavoritesStore.getState().isFavorite(42)).toBe(true);
    });
  });

  describe('addFavorite', () => {
    it('should add a song to favorites optimistically', async () => {
      const store = useFavoritesStore.getState();
      await store.addFavorite(1);

      expect(useFavoritesStore.getState().favoriteIds.has(1)).toBe(true);
    });

    it('should not duplicate favorites', async () => {
      const store = useFavoritesStore.getState();
      await store.addFavorite(1);
      await store.addFavorite(1);

      expect(useFavoritesStore.getState().favoriteIds.size).toBe(1);
    });
  });

  describe('removeFavorite', () => {
    it('should remove a song from favorites', async () => {
      const store = useFavoritesStore.getState();
      await store.addFavorite(1);
      expect(useFavoritesStore.getState().isFavorite(1)).toBe(true);

      await useFavoritesStore.getState().removeFavorite(1);
      expect(useFavoritesStore.getState().isFavorite(1)).toBe(false);
    });

    it('should handle removing non-existent favorite', async () => {
      const store = useFavoritesStore.getState();
      await store.removeFavorite(999);

      expect(useFavoritesStore.getState().favoriteIds.has(999)).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear the error state', () => {
      useFavoritesStore.setState({ error: 'Some error' });
      expect(useFavoritesStore.getState().error).toBe('Some error');

      useFavoritesStore.getState().clearError();
      expect(useFavoritesStore.getState().error).toBeNull();
    });
  });

  describe('setAuthenticated', () => {
    it('should set authentication state', () => {
      const store = useFavoritesStore.getState();
      expect(store.isAuthenticated).toBe(false);

      store.setAuthenticated(true);
      expect(useFavoritesStore.getState().isAuthenticated).toBe(true);

      useFavoritesStore.getState().setAuthenticated(false);
      expect(useFavoritesStore.getState().isAuthenticated).toBe(false);
    });
  });
});
