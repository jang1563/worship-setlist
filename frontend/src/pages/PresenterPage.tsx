import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize, Minimize, Eye, EyeOff, Music, Settings, X, ArrowLeft, Clock, Minus, Plus, RotateCcw } from 'lucide-react';
import { useSetlistStore } from '@/stores/setlistStore';
import { chordsApi } from '@/services/api';
import { cn } from '@/utils/cn';
import type { SetlistSong, ParsedChordPro } from '@/types';

interface PresenterPageProps {
  onBack?: () => void;
}

type BackgroundTheme = 'black' | 'dark-blue' | 'white';

interface PresenterSettings {
  fontSize: number; // 24-72pt range
  showChords: boolean;
  showSongInfo: boolean;
  showTimer: boolean;
  background: BackgroundTheme;
  autoScroll: boolean;
}

// Background theme configurations
const BACKGROUND_THEMES: Record<BackgroundTheme, { bg: string; text: string; textSecondary: string; accent: string }> = {
  'black': {
    bg: 'bg-black',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    accent: 'text-primary-400',
  },
  'dark-blue': {
    bg: 'bg-[#0a1628]',
    text: 'text-white',
    textSecondary: 'text-blue-300',
    accent: 'text-blue-400',
  },
  'white': {
    bg: 'bg-white',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    accent: 'text-primary-600',
  },
};

// Min/max font sizes
const MIN_FONT_SIZE = 24;
const MAX_FONT_SIZE = 72;
const FONT_SIZE_STEP = 4;

export function PresenterPage({ onBack }: PresenterPageProps) {
  const { editingSongs } = useSetlistStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [parsedContent, setParsedContent] = useState<ParsedChordPro | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [settings, setSettings] = useState<PresenterSettings>({
    fontSize: 48, // Default 48pt
    showChords: true,
    showSongInfo: true,
    showTimer: false,
    background: 'black',
    autoScroll: false,
  });

  const currentSong: SetlistSong | undefined = editingSongs[currentIndex];
  const theme = BACKGROUND_THEMES[settings.background];

  // Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle timer
  const toggleTimer = useCallback(() => {
    setIsTimerRunning(prev => !prev);
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    setElapsedSeconds(0);
    setIsTimerRunning(false);
  }, []);

  // Adjust font size
  const increaseFontSize = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      fontSize: Math.min(MAX_FONT_SIZE, prev.fontSize + FONT_SIZE_STEP)
    }));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      fontSize: Math.max(MIN_FONT_SIZE, prev.fontSize - FONT_SIZE_STEP)
    }));
  }, []);

  // Load lyrics/chords for current song
  useEffect(() => {
    const loadContent = async () => {
      if (!currentSong?.song_id) {
        setParsedContent(null);
        return;
      }

      setIsLoading(true);
      try {
        const charts = await chordsApi.getForSong(currentSong.song_id);
        if (charts && charts.length > 0) {
          // Find chart matching current key or use first one
          const matchingChart = charts.find(c => c.key === currentSong.key) || charts[0];
          let content = matchingChart.chordpro_content || matchingChart.content;

          // If key is different, transpose
          if (matchingChart.key !== currentSong.key && content) {
            const transposed = await chordsApi.transpose({
              content,
              from_key: matchingChart.key,
              to_key: currentSong.key,
            });
            content = transposed.content;
          }

          // Parse for display
          if (content) {
            const parsed = await chordsApi.parse(content);
            setParsedContent(parsed);
          }
        } else {
          // No chord chart, show basic info
          setParsedContent(null);
        }
      } catch (error) {
        console.error('Failed to load lyrics:', error);
        setParsedContent(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [currentSong?.song_id, currentSong?.key]);

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(editingSongs.length - 1, prev + 1));
  }, [editingSongs.length]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        goToPrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape') {
        if (showSettings) {
          setShowSettings(false);
        } else if (isFullscreen) {
          document.exitFullscreen();
        }
      } else if (e.key === 'c' || e.key === 'C') {
        setSettings(prev => ({ ...prev, showChords: !prev.showChords }));
      } else if (e.key === 't' || e.key === 'T') {
        // Toggle timer visibility
        setSettings(prev => ({ ...prev, showTimer: !prev.showTimer }));
      } else if (e.key === 's' || e.key === 'S') {
        // Toggle timer start/stop
        toggleTimer();
      } else if (e.key === 'r' || e.key === 'R') {
        // Reset timer
        resetTimer();
      } else if (e.key === '+' || e.key === '=') {
        // Increase font size
        increaseFontSize();
      } else if (e.key === '-' || e.key === '_') {
        // Decrease font size
        decreaseFontSize();
      } else if (e.key === '1') {
        // Set background to black
        setSettings(prev => ({ ...prev, background: 'black' }));
      } else if (e.key === '2') {
        // Set background to dark blue
        setSettings(prev => ({ ...prev, background: 'dark-blue' }));
      } else if (e.key === '3') {
        // Set background to white
        setSettings(prev => ({ ...prev, background: 'white' }));
      } else if (e.key === 'Home') {
        // Go to first song
        setCurrentIndex(0);
      } else if (e.key === 'End') {
        // Go to last song
        setCurrentIndex(editingSongs.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, toggleFullscreen, showSettings, isFullscreen, toggleTimer, resetTimer, increaseFontSize, decreaseFontSize, editingSongs.length]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (editingSongs.length === 0) {
    return (
      <div className={cn('h-full flex flex-col items-center justify-center', theme.bg, theme.text)}>
        <Music className="w-16 h-16 text-gray-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">송리스트가 비어있습니다</h2>
        <p className={cn('mb-4', theme.textSecondary)}>먼저 송리스트에 곡을 추가해주세요</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            돌아가기
          </button>
        )}
      </div>
    );
  }

  // Calculate chord font size (roughly 60% of main font size)
  const chordFontSize = Math.round(settings.fontSize * 0.6);

  return (
    <div className={cn('h-full flex flex-col relative select-none', theme.bg, theme.text)}>
      {/* Top bar - hidden in fullscreen, shown on hover */}
      <div className={cn(
        'absolute top-0 left-0 right-0 z-20 transition-opacity duration-300',
        isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100',
        settings.background === 'white'
          ? 'bg-gradient-to-b from-white/90 to-transparent'
          : 'bg-gradient-to-b from-black/50 to-transparent',
        'py-3 px-4'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  settings.background === 'white'
                    ? 'hover:bg-black/10 text-gray-800'
                    : 'hover:bg-white/20 text-white'
                )}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {settings.showSongInfo && currentSong && (
              <div>
                <h1 className={cn(
                  'text-lg font-bold',
                  settings.background === 'white' ? 'text-gray-900' : 'text-white'
                )}>
                  {currentSong.song?.title}
                </h1>
                <p className={cn(
                  'text-sm',
                  settings.background === 'white' ? 'text-gray-600' : 'text-white/70'
                )}>
                  {currentSong.song?.artist} · Key: {currentSong.key}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Timer display */}
            {settings.showTimer && (
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                settings.background === 'white' ? 'bg-gray-100' : 'bg-white/10'
              )}>
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg tabular-nums">{formatTime(elapsedSeconds)}</span>
                <button
                  onClick={toggleTimer}
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    isTimerRunning
                      ? 'bg-red-500 text-white'
                      : 'bg-green-500 text-white'
                  )}
                >
                  {isTimerRunning ? '정지' : '시작'}
                </button>
                <button
                  onClick={resetTimer}
                  className={cn(
                    'p-1 rounded hover:bg-white/20',
                    settings.background === 'white' ? 'text-gray-600' : 'text-white/70'
                  )}
                  title="타이머 리셋"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <span className={cn(
              'text-sm',
              settings.background === 'white' ? 'text-gray-600' : 'text-white/70'
            )}>
              {currentIndex + 1} / {editingSongs.length}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                settings.background === 'white'
                  ? 'hover:bg-black/10 text-gray-800'
                  : 'hover:bg-white/20 text-white'
              )}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className={cn(
                'p-2 rounded-lg transition-colors',
                settings.background === 'white'
                  ? 'hover:bg-black/10 text-gray-800'
                  : 'hover:bg-white/20 text-white'
              )}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-8 py-16 overflow-auto">
        {isLoading ? (
          <div className="animate-pulse">
            <div className={cn(
              'h-12 w-64 rounded mb-4',
              settings.background === 'white' ? 'bg-gray-200' : 'bg-gray-700'
            )} />
            <div className={cn(
              'h-8 w-48 rounded',
              settings.background === 'white' ? 'bg-gray-200' : 'bg-gray-700'
            )} />
          </div>
        ) : parsedContent && parsedContent.lines.length > 0 ? (
          <div className="max-w-5xl mx-auto text-center">
            {parsedContent.lines.map((line, lineIndex) => (
              <div key={lineIndex} className="mb-4">
                {line.segments.map((segment, segIndex) => (
                  <span key={segIndex} className="inline-flex flex-col items-center">
                    {settings.showChords && segment.chord && (
                      <span
                        className={cn('font-mono font-bold mb-1', theme.accent)}
                        style={{ fontSize: `${chordFontSize}px` }}
                      >
                        {segment.chord}
                      </span>
                    )}
                    <span
                      className="leading-relaxed whitespace-pre"
                      style={{ fontSize: `${settings.fontSize}px` }}
                    >
                      {segment.lyric}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center">
            <h2
              className="font-bold mb-4"
              style={{ fontSize: `${settings.fontSize}px` }}
            >
              {currentSong?.song?.title}
            </h2>
            <p className={cn('text-2xl mb-2', theme.textSecondary)}>{currentSong?.song?.artist}</p>
            <p className="text-xl font-mono">Key: {currentSong?.key}</p>
            <p className={cn('mt-8', theme.textSecondary)}>
              가사/코드 정보가 없습니다
            </p>
          </div>
        )}
      </div>

      {/* Navigation buttons - always visible at edges */}
      <button
        onClick={goToPrevious}
        disabled={currentIndex === 0}
        className={cn(
          'absolute left-4 top-1/2 -translate-y-1/2 z-10',
          'p-4 rounded-full transition-all',
          currentIndex === 0
            ? 'opacity-30 cursor-not-allowed'
            : settings.background === 'white'
              ? 'opacity-50 hover:opacity-100 hover:bg-black/10'
              : 'opacity-50 hover:opacity-100 hover:bg-white/20'
        )}
      >
        <ChevronLeft className="w-10 h-10" />
      </button>
      <button
        onClick={goToNext}
        disabled={currentIndex === editingSongs.length - 1}
        className={cn(
          'absolute right-4 top-1/2 -translate-y-1/2 z-10',
          'p-4 rounded-full transition-all',
          currentIndex === editingSongs.length - 1
            ? 'opacity-30 cursor-not-allowed'
            : settings.background === 'white'
              ? 'opacity-50 hover:opacity-100 hover:bg-black/10'
              : 'opacity-50 hover:opacity-100 hover:bg-white/20'
        )}
      >
        <ChevronRight className="w-10 h-10" />
      </button>

      {/* Bottom song list - mini preview */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300',
        isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100',
        settings.background === 'white'
          ? 'bg-gradient-to-t from-gray-100/90 to-transparent'
          : 'bg-gradient-to-t from-black/70 to-transparent',
        'py-4 px-4'
      )}>
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 px-2">
          {editingSongs.map((song, index) => (
            <button
              key={song.id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'px-3 py-2.5 min-h-[44px] rounded-lg text-sm whitespace-nowrap transition-all flex-shrink-0',
                index === currentIndex
                  ? 'bg-primary-600 text-white scale-105 ring-2 ring-primary-400 ring-offset-2 ring-offset-transparent'
                  : settings.background === 'white'
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-white/20 text-white/70 hover:bg-white/30'
              )}
            >
              {index + 1}. {song.song?.title}
            </button>
          ))}
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">프레젠터 설정</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Font size with slider */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  글꼴 크기: {settings.fontSize}pt
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={decreaseFontSize}
                    disabled={settings.fontSize <= MIN_FONT_SIZE}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      settings.fontSize <= MIN_FONT_SIZE
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    )}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min={MIN_FONT_SIZE}
                    max={MAX_FONT_SIZE}
                    step={FONT_SIZE_STEP}
                    value={settings.fontSize}
                    onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <button
                    onClick={increaseFontSize}
                    disabled={settings.fontSize >= MAX_FONT_SIZE}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      settings.fontSize >= MAX_FONT_SIZE
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    )}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{MIN_FONT_SIZE}pt</span>
                  <span>{MAX_FONT_SIZE}pt</span>
                </div>
              </div>

              {/* Background color */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  배경 색상
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, background: 'black' }))}
                    className={cn(
                      'flex-1 py-3 rounded-lg text-sm transition-colors flex flex-col items-center gap-1',
                      settings.background === 'black'
                        ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-900'
                        : ''
                    )}
                    style={{ backgroundColor: '#000' }}
                  >
                    <span className="text-white text-xs">검정</span>
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, background: 'dark-blue' }))}
                    className={cn(
                      'flex-1 py-3 rounded-lg text-sm transition-colors flex flex-col items-center gap-1',
                      settings.background === 'dark-blue'
                        ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-900'
                        : ''
                    )}
                    style={{ backgroundColor: '#0a1628' }}
                  >
                    <span className="text-white text-xs">진한 파랑</span>
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, background: 'white' }))}
                    className={cn(
                      'flex-1 py-3 rounded-lg text-sm transition-colors flex flex-col items-center gap-1 border border-gray-600',
                      settings.background === 'white'
                        ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-gray-900'
                        : ''
                    )}
                    style={{ backgroundColor: '#fff' }}
                  >
                    <span className="text-gray-800 text-xs">흰색</span>
                  </button>
                </div>
              </div>

              {/* Toggle options */}
              <div className="space-y-3">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, showChords: !prev.showChords }))}
                  className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-gray-300">코드 표시</span>
                  {settings.showChords ? (
                    <Eye className="w-5 h-5 text-primary-400" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, showSongInfo: !prev.showSongInfo }))}
                  className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-gray-300">곡 정보 표시</span>
                  {settings.showSongInfo ? (
                    <Eye className="w-5 h-5 text-primary-400" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, showTimer: !prev.showTimer }))}
                  className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-gray-300">타이머 표시</span>
                  {settings.showTimer ? (
                    <Clock className="w-5 h-5 text-primary-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Keyboard shortcuts help */}
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3">키보드 단축키</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span className="text-gray-400">← / →</span>
                    <span>이전/다음 곡</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Space</span>
                    <span>다음 곡</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Home / End</span>
                    <span>처음/마지막</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">F</span>
                    <span>전체 화면</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">C</span>
                    <span>코드 토글</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">T</span>
                    <span>타이머 표시</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">S</span>
                    <span>타이머 시작/정지</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">R</span>
                    <span>타이머 리셋</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">+ / -</span>
                    <span>글꼴 크기</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">1 / 2 / 3</span>
                    <span>배경 색상</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
