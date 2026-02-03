import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Music, Heart, Play, Youtube, ChevronUp, ChevronDown, Book, Clock, Users, Guitar } from 'lucide-react';
import { songsApi, chordsApi } from '@/services/api';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { cn } from '@/utils/cn';
import { ChordDiagramGrid } from '@/components/chords/ChordDiagrams';
import { ChordDisplay } from '@/components/chords/ChordDisplay';
import type { Song } from '@/types';

/**
 * Extract unique chords from ChordPro content
 */
function extractChordsFromContent(content: string): string[] {
  const chordPattern = /\[([A-Ga-g][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]?(?:\/[A-Ga-g][#b]?)?)\]/g;
  const chords = new Set<string>();
  let match;

  while ((match = chordPattern.exec(content)) !== null) {
    chords.add(match[1]);
  }

  return Array.from(chords);
}

const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function transposeKey(key: string, semitones: number): string {
  const baseKey = key.replace('m', '');
  const isMinor = key.includes('m');
  const currentIndex = ALL_KEYS.indexOf(baseKey);
  if (currentIndex === -1) return key;
  const newIndex = (currentIndex + semitones + 12) % 12;
  return ALL_KEYS[newIndex] + (isMinor ? 'm' : '');
}

interface SongDetailPageProps {
  songId: number;
  onBack: () => void;
  onPractice?: (song: {
    id: number;
    title: string;
    artist?: string;
    youtubeUrl?: string;
    defaultKey?: string;
  }) => void;
}

interface ChordChart {
  id: number;
  key: string;
  content: string;
  source: string;
}

export function SongDetailPage({ songId, onBack, onPractice }: SongDetailPageProps) {
  const [song, setSong] = useState<Song | null>(null);
  const [chordCharts, setChordCharts] = useState<ChordChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [transposition, setTransposition] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'chords'>('info');
  const [showDiagrams, setShowDiagrams] = useState(true);

  // Extract all unique chords from chord charts
  const allChords = useMemo(() => {
    const chords = new Set<string>();
    chordCharts.forEach(chart => {
      extractChordsFromContent(chart.content).forEach(chord => chords.add(chord));
    });
    return Array.from(chords);
  }, [chordCharts]);

  const { isFavorite, toggleFavorite } = useFavoritesStore();

  useEffect(() => {
    const fetchSong = async () => {
      setLoading(true);
      try {
        const [songData, chartsData] = await Promise.all([
          songsApi.getById(songId),
          chordsApi.getForSong(songId).catch(() => [])
        ]);
        setSong(songData);
        setChordCharts(chartsData);
      } catch (error) {
        console.error('Failed to load song:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSong();
  }, [songId]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentKey = song ? transposeKey(song.default_key, transposition) : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Music className="w-12 h-12 mb-4" />
        <p>곡을 찾을 수 없습니다</p>
        <button onClick={onBack} className="mt-4 text-primary-600 hover:underline">
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {song.title}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {song.artist}
            </p>
          </div>
          <button
            onClick={() => toggleFavorite(song.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Heart
              className={cn(
                'w-5 h-5',
                isFavorite(song.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
              )}
            />
          </button>
        </div>
      </div>

      {/* Key & Transposition */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">키:</span>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {currentKey}
              </span>
              {transposition !== 0 && (
                <span className="text-xs text-gray-400">
                  (원키: {song.default_key}, {transposition > 0 ? '+' : ''}{transposition})
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTransposition(t => t - 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm">{transposition > 0 ? '+' : ''}{transposition}</span>
            <button
              onClick={() => setTransposition(t => t + 1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'info'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            곡 정보
          </button>
          <button
            onClick={() => setActiveTab('chords')}
            className={cn(
              'flex-1 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'chords'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            코드 악보 {chordCharts.length > 0 && `(${chordCharts.length})`}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'info' ? (
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDuration(song.duration_sec)}
                </div>
                <div className="text-xs text-gray-500">길이</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <Music className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {song.bpm || '-'}
                </div>
                <div className="text-xs text-gray-500">BPM</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {song.difficulty === 'easy' ? '쉬움' : song.difficulty === 'hard' ? '어려움' : '보통'}
                </div>
                <div className="text-xs text-gray-500">난이도</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center">
                <Book className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {song.scripture_refs?.length || 0}
                </div>
                <div className="text-xs text-gray-500">관련 말씀</div>
              </div>
            </div>

            {/* Tags */}
            {(song.mood_tags?.length > 0 || song.service_types?.length > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">태그</h3>
                <div className="flex flex-wrap gap-2">
                  {song.mood_tags?.map((tag, i) => (
                    <span
                      key={`mood-${i}`}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {song.service_types?.map((type, i) => (
                    <span
                      key={`service-${i}`}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scripture References */}
            {song.scripture_refs && song.scripture_refs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">관련 말씀</h3>
                <div className="space-y-2">
                  {song.scripture_refs.map((ref, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Book className="w-4 h-4 text-gray-400" />
                      {ref}
                    </div>
                  ))}
                </div>
                {song.scripture_connection && (
                  <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 italic">
                    "{song.scripture_connection}"
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {song.youtube_url && (
                <a
                  href={song.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg"
                >
                  <Youtube className="w-5 h-5" />
                  YouTube
                </a>
              )}
              {onPractice && (
                <button
                  onClick={() => onPractice({
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    youtubeUrl: song.youtube_url,
                    defaultKey: currentKey
                  })}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg"
                >
                  <Play className="w-5 h-5" />
                  연습하기
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chordCharts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>등록된 코드 악보가 없습니다</p>
              </div>
            ) : (
              <>
                {/* Chord Diagrams Section */}
                {allChords.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <button
                      onClick={() => setShowDiagrams(!showDiagrams)}
                      className="w-full flex items-center justify-between mb-3"
                    >
                      <div className="flex items-center gap-2">
                        <Guitar className="w-5 h-5 text-primary-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          코드 다이어그램 ({allChords.length}개)
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'w-5 h-5 text-gray-500 transition-transform',
                          showDiagrams && 'rotate-180'
                        )}
                      />
                    </button>
                    {showDiagrams && (
                      <ChordDiagramGrid
                        chords={allChords}
                        size="md"
                        showFingers={true}
                        columns={4}
                      />
                    )}
                  </div>
                )}

                {/* Chord Charts */}
                {chordCharts.map((chart) => (
                  <div key={chart.id} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Key: {transposeKey(chart.key, transposition)}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{chart.source}</span>
                    </div>
                    <ChordDisplay
                      chordpro={chart.content}
                      showChordColors={true}
                      fontSize="base"
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
