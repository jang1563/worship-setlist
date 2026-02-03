import { useQuery } from '@tanstack/react-query';
import { songsApi } from '@/services/api';

interface UseSongsParams {
  search?: string;
  artist?: string;
  key?: string;
  perPage?: number;
}

export function useSongs(params: UseSongsParams = {}) {
  const { search, artist, key, perPage = 500 } = params;

  return useQuery({
    queryKey: ['songs', { search, artist, key, perPage }],
    queryFn: () =>
      songsApi.getAll({
        per_page: perPage,
        search: search || undefined,
        artist: artist || undefined,
        key: key || undefined,
      }),
    staleTime: 1000 * 60 * 10, // 10 minutes for song list (rarely changes)
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    select: (data) => data.songs, // Extract just the songs array
  });
}

export function useSong(songId: number) {
  return useQuery({
    queryKey: ['song', songId],
    queryFn: () => songsApi.getById(songId),
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    enabled: !!songId,
  });
}
