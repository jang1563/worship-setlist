import { useState, useEffect, useMemo, useCallback } from 'react';
import { Music, Search, Heart, Play, Youtube, ChevronUp, ChevronDown } from 'lucide-react';
import { useSongs } from '@/hooks/useSongs';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { cn } from '@/utils/cn';
import { MusicTermTooltip } from '@/components/common/MusicTermTooltip';
import type { Song } from '@/types';

// Key transposition utilities
const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function transposeKey(key: string, semitones: number): string {
  const baseKey = key.replace('m', ''); // Handle minor keys
  const isMinor = key.includes('m');
  const currentIndex = ALL_KEYS.indexOf(baseKey);
  if (currentIndex === -1) return key;
  const newIndex = (currentIndex + semitones + 12) % 12;
  return ALL_KEYS[newIndex] + (isMinor ? 'm' : '');
}

// Debounce hook for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}


interface SongListProps {
  onPractice?: (song: {
    id: number;
    title: string;
    artist?: string;
    youtubeUrl?: string;
    defaultKey?: string;
  }) => void;
  onSongSelect?: (songId: number) => void;
}

export function SongList({ onPractice, onSongSelect }: SongListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArtist] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // Track transposition for each song by ID
  const [transpositions, setTranspositions] = useState<Record<number, number>>({});

  const { isFavorite, toggleFavorite } = useFavoritesStore();

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Use React Query for caching and automatic refetching
  const { data: songs = [], isLoading: loading } = useSongs({
    search: debouncedSearchQuery,
    artist: selectedArtist,
    key: selectedKey,
  });

  const getTransposition = useCallback((songId: number) => transpositions[songId] || 0, [transpositions]);

  const setTransposition = useCallback((songId: number, value: number) => {
    setTranspositions(prev => ({
      ...prev,
      [songId]: value
    }));
  }, []);

  const keys = useMemo(() => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], []);

  // Filter songs by favorites if showFavoritesOnly is true
  const displayedSongs = useMemo(() => {
    if (showFavoritesOnly) {
      return songs.filter((song) => isFavorite(song.id));
    }
    return songs;
  }, [songs, showFavoritesOnly, isFavorite]);

  const handleFavoriteClick = useCallback((e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    toggleFavorite(songId);
  }, [toggleFavorite]);

  const handlePracticeClick = useCallback((e: React.MouseEvent, song: Song, transposition: number) => {
    e.stopPropagation();
    onPractice?.({
      id: song.id,
      title: song.title,
      artist: song.artist,
      youtubeUrl: song.youtube_url,
      defaultKey: transposeKey(song.default_key, transposition),
    });
  }, [onPractice]);

  const handleSongClick = useCallback((songId: number) => {
    onSongSelect?.(songId);
  }, [onSongSelect]);

  const handleTransposeDown = useCallback((e: React.MouseEvent, songId: number, currentTransposition: number) => {
    e.stopPropagation();
    setTransposition(songId, (currentTransposition - 1 + 12) % 12 || -1);
  }, [setTransposition]);

  const handleTransposeUp = useCallback((e: React.MouseEvent, songId: number, currentTransposition: number) => {
    e.stopPropagation();
    setTransposition(songId, (currentTransposition + 1) % 12);
  }, [setTransposition]);

  const handleResetTransposition = useCallback((e: React.MouseEvent, songId: number) => {
    e.stopPropagation();
    setTransposition(songId, 0);
  }, [setTransposition]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <Music className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white">찬양 DB</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">({displayedSongs.length}곡)</span>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="곡 제목 또는 아티스트 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div className="flex gap-2">
            <MusicTermTooltip term="key" position="bottom">
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">모든 키</option>
              {keys.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </MusicTermTooltip>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "px-3 py-2 border rounded-lg flex items-center gap-2 transition-colors",
                showFavoritesOnly
                  ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
              title={showFavoritesOnly ? "전체 보기" : "즐겨찾기만 보기"}
            >
              <Heart
                className={cn("w-4 h-4", showFavoritesOnly && "fill-current")}
              />
              <span className="hidden sm:inline">즐겨찾기</span>
            </button>
          </div>
        </div>
      </div>

      {/* Songs list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
          </div>
        ) : displayedSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Music className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {showFavoritesOnly ? "즐겨찾기한 곡이 없습니다" : "찾는 곡이 없습니다"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {displayedSongs.map((song) => {
              const transposition = getTransposition(song.id);
              const favorite = isFavorite(song.id);
              return (
                <div
                  key={song.id}
                  onClick={() => handleSongClick(song.id)}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-primary-300 dark:hover:border-primary-600 transition-colors",
                    onSongSelect && "cursor-pointer"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-medium text-gray-900 dark:text-white">{song.title}</h3>
                        {song.youtube_url && (
                          <span title="YouTube 재생 가능">
                            <Youtube className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          </span>
                        )}
                      </div>
                      {song.title_en && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{song.title_en}</p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{song.artist}</p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {song.mood_tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {song.service_types.map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {/* Action buttons */}
                      <div className="flex gap-1">
                        {/* YouTube link button */}
                        {song.youtube_url && (
                          <a
                            href={song.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="YouTube에서 보기"
                            aria-label="YouTube에서 보기"
                          >
                            <Youtube className="w-5 h-5" />
                          </a>
                        )}
                        {/* Practice button */}
                        {onPractice && (
                          <button
                            onClick={(e) => handlePracticeClick(e, song, transposition)}
                            className="p-2 rounded-lg text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            title="연습 모드"
                            aria-label="연습 모드"
                          >
                            <Play className="w-5 h-5" />
                          </button>
                        )}
                        {/* Favorite button */}
                        <button
                          onClick={(e) => handleFavoriteClick(e, song.id)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            favorite
                              ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                              : "text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                          )}
                          title={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                          aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                        >
                          <Heart
                            className={cn("w-5 h-5", favorite && "fill-current")}
                          />
                        </button>
                      </div>

                      {/* Key with transpose controls */}
                      <div className="text-right">
                        <MusicTermTooltip term="transpose" position="left">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleTransposeDown(e, song.id, transposition)}
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                              title="반음 내리기"
                            >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <span className={cn(
                            "inline-block px-2 py-1 rounded font-mono text-sm min-w-[40px] text-center",
                            transposition !== 0
                              ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          )}>
                            {transposeKey(song.default_key, transposition)}
                            {transposition !== 0 && (
                              <span className="text-xs ml-0.5">
                                ({transposition > 0 ? '+' : ''}{transposition > 6 ? transposition - 12 : transposition})
                              </span>
                            )}
                          </span>
                          <button
                            onClick={(e) => handleTransposeUp(e, song.id, transposition)}
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            title="반음 올리기"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          {transposition !== 0 && (
                            <button
                              onClick={(e) => handleResetTransposition(e, song.id)}
                              className="ml-1 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="원래 키로 되돌리기"
                            >
                              초기화
                            </button>
                          )}
                          </div>
                        </MusicTermTooltip>
                        {song.bpm && (
                          <MusicTermTooltip term="bpm" position="left">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{song.bpm} BPM</p>
                          </MusicTermTooltip>
                        )}
                        {song.duration_sec && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {Math.floor(song.duration_sec / 60)}:{(song.duration_sec % 60).toString().padStart(2, '0')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scripture refs */}
                  {song.scripture_refs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        관련 말씀: {song.scripture_refs.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
