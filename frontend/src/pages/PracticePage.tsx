import React, { useState, useEffect, useMemo } from 'react';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { PlayerControls } from '@/components/player/PlayerControls';
import { SpeedControl } from '@/components/player/SpeedControl';
import { LoopControl } from '@/components/player/LoopControl';
import { SyncedChordSheet } from '@/components/player/SyncedChordSheet';
import { ChordPlayer } from '@/components/player/ChordPlayer';
import { usePlayerStore } from '@/stores/playerStore';
import { usePracticeStore } from '@/stores/practiceStore';
import { useKeyboardShortcuts, KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';
import { extractVideoId, generateMRSearchUrl } from '@/utils/youtube';
import { chordsApi, type ChordChartData } from '@/services/api';
import type { SyncedSection } from '@/types/sync';

/**
 * Extract unique chords from ChordPro content
 */
function extractChordsFromContent(content: string): string[] {
  const chordPattern = /\[([A-Ga-g][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)*(?:\/[A-Ga-g][#b]?)?)\]/g;
  const chords: string[] = [];
  let match;

  while ((match = chordPattern.exec(content)) !== null) {
    // Only add if not duplicate (preserve order)
    if (!chords.includes(match[1])) {
      chords.push(match[1]);
    }
  }

  return chords;
}

interface PracticePageProps {
  songId?: number;
  songTitle?: string;
  artist?: string;
  youtubeUrl?: string;
  defaultKey?: string;
  onBack?: () => void;
}

export const PracticePage: React.FC<PracticePageProps> = ({
  songId,
  songTitle = '연습 모드',
  artist,
  youtubeUrl,
  defaultKey = 'C',
  onBack,
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [customVideoUrl, setCustomVideoUrl] = useState('');
  const [chordChart, setChordChart] = useState<ChordChartData | null>(null);
  const [isLoadingChords, setIsLoadingChords] = useState(false);
  const [activeTab, setActiveTab] = useState<'controls' | 'midi'>('controls');

  const { videoId, setVideoId, setCurrentSong, playbackRate } = usePlayerStore();

  // Extract all chords from chord chart for MIDI player
  const allChords = useMemo(() => {
    if (!chordChart?.content) return [];
    return extractChordsFromContent(chordChart.content);
  }, [chordChart]);
  const { autoScroll, setAutoScroll } = usePracticeStore();

  // 키보드 단축키 활성화
  useKeyboardShortcuts({ enabled: true });

  // 초기화
  useEffect(() => {
    if (songId) {
      setCurrentSong(songId, songTitle);
    }
    if (youtubeUrl) {
      const id = extractVideoId(youtubeUrl);
      if (id) setVideoId(id);
    }
  }, [songId, songTitle, youtubeUrl, setCurrentSong, setVideoId]);

  // Fetch chord chart for the song
  useEffect(() => {
    if (!songId) return;

    const fetchChordChart = async () => {
      setIsLoadingChords(true);
      try {
        const charts = await chordsApi.getForSong(songId);
        if (charts && charts.length > 0) {
          // Get the chart matching the current key, or the first one
          const matchingChart = charts.find(c => c.key === defaultKey) || charts[0];
          setChordChart(matchingChart);
        }
      } catch (error) {
        console.warn('Failed to load chord chart:', error);
      } finally {
        setIsLoadingChords(false);
      }
    };

    fetchChordChart();
  }, [songId, defaultKey]);

  // 커스텀 URL 적용
  const handleApplyCustomUrl = () => {
    const id = extractVideoId(customVideoUrl);
    if (id) {
      setVideoId(id);
      setCustomVideoUrl('');
    }
  };

  // MR 검색
  const handleSearchMR = () => {
    const url = generateMRSearchUrl(songTitle, artist);
    window.open(url, '_blank');
  };

  // Parse chord chart content into sections for display
  const parseChordContent = (content: string): SyncedSection[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const sections: SyncedSection[] = [];
    let currentSection: SyncedSection = {
      name: 'Intro',
      startTime: 0,
      chords: [],
    };

    // Simple ChordPro parser
    let timestamp = 0;
    for (const line of lines) {
      // Check for section markers like {title:...} or {chorus}
      const sectionMatch = line.match(/\{(?:soc|start_of_chorus|chorus)\}/i) ||
                          line.match(/\{c(?:omment)?:\s*(.+?)\}/i) ||
                          line.match(/\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Interlude).*?\]/i);

      if (sectionMatch) {
        // Save current section if it has content
        if (currentSection.chords.length > 0) {
          sections.push(currentSection);
        }
        const sectionName = sectionMatch[1] || 'Chorus';
        currentSection = {
          name: sectionName,
          startTime: timestamp,
          chords: [],
        };
        continue;
      }

      // Parse chords in brackets [C], [Am], etc.
      const chordPattern = /\[([A-Ga-g][#b]?(?:m|maj|min|dim|aug|sus|add|7|9|11|13)*(?:\/[A-Ga-g][#b]?)?)\]/g;
      const lyricLine = line.replace(chordPattern, '').trim();
      const chords: string[] = [];
      let match;
      while ((match = chordPattern.exec(line)) !== null) {
        chords.push(match[1]);
      }

      if (chords.length > 0 || lyricLine) {
        currentSection.chords.push({
          chord: chords.length > 0 ? chords.join(' ') : '',
          lyrics: lyricLine || '♪',
          timestamp: timestamp,
        });
        timestamp += 5; // Approximate 5 seconds per line
      }
    }

    // Add final section
    if (currentSection.chords.length > 0) {
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [{
      name: songTitle,
      startTime: 0,
      chords: [{ chord: defaultKey, lyrics: '코드 정보를 불러오는 중...', timestamp: 0 }],
    }];
  };

  // Get sections from chord chart or show placeholder
  const sections: SyncedSection[] = chordChart?.content
    ? parseChordContent(chordChart.content)
    : [{
        name: songTitle,
        startTime: 0,
        chords: isLoadingChords
          ? [{ chord: defaultKey, lyrics: '코드 정보를 불러오는 중...', timestamp: 0 }]
          : [{ chord: defaultKey, lyrics: '코드 정보가 없습니다. 코드를 추가해주세요.', timestamp: 0 }],
      }];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {songTitle}
            </h1>
            {artist && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{artist}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
            Key: {defaultKey}
          </span>
          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-mono">
            {playbackRate}x
          </span>
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="단축키 보기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Shortcuts Panel */}
      {showShortcuts && (
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-b dark:border-gray-700">
          <div className="grid grid-cols-4 gap-2 text-sm">
            {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs font-mono">
                  {key}
                </kbd>
                <span className="text-gray-600 dark:text-gray-400">{description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Chord Sheet */}
        <div className="w-full md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r dark:border-gray-700 min-h-[200px] md:min-h-0">
          <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b dark:border-gray-700">
            <h2 className="font-medium text-gray-700 dark:text-gray-300">코드 & 가사</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span className="text-gray-600 dark:text-gray-400">자동 스크롤</span>
            </label>
          </div>
          <SyncedChordSheet
            sections={sections}
            className="flex-1"
          />
        </div>

        {/* Right: Player & Controls */}
        <div className="w-full md:w-1/2 flex flex-col">
          {/* Video */}
          <div className="p-4">
            {videoId ? (
              <YouTubePlayer videoId={videoId} className="w-full" />
            ) : (
              <div className="aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg flex flex-col items-center justify-center gap-4">
                <p className="text-gray-500 dark:text-gray-400">YouTube 영상을 선택하세요</p>
                <button
                  onClick={handleSearchMR}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                  MR 검색
                </button>
              </div>
            )}
          </div>

          {/* Custom URL Input */}
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={customVideoUrl}
                onChange={(e) => setCustomVideoUrl(e.target.value)}
                placeholder="YouTube URL 입력..."
                className="flex-1 px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
              />
              <button
                onClick={handleApplyCustomUrl}
                disabled={!customVideoUrl}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                적용
              </button>
            </div>
          </div>

          {/* Player Controls */}
          {videoId && (
            <div className="px-4 pb-4">
              <PlayerControls />
            </div>
          )}

          {/* Practice Controls Tabs */}
          <div className="border-t dark:border-gray-700">
            <div className="flex bg-white dark:bg-gray-800">
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'controls'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  재생 컨트롤
                </div>
              </button>
              <button
                onClick={() => setActiveTab('midi')}
                className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'midi'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                  MIDI 연습
                  {allChords.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">
                      {allChords.length}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Practice Controls Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'controls' ? (
              <>
                <SpeedControl />
                <LoopControl />
              </>
            ) : (
              <ChordPlayer
                chords={allChords}
                bpm={120}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticePage;
