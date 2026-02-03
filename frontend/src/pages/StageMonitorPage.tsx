import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Music, Clock, Maximize, Minimize, Settings, X, Eye, EyeOff } from 'lucide-react';
import { useSetlistStore } from '@/stores/setlistStore';
import { chordsApi } from '@/services/api';
import { cn } from '@/utils/cn';
import type { SetlistSong, ParsedChordPro } from '@/types';

interface StageMonitorSettings {
  fontSize: 'medium' | 'large' | 'xlarge' | 'xxlarge';
  showChords: boolean;
  showNextSong: boolean;
  theme: 'dark' | 'light';
  showTimer: boolean;
}

const FONT_SIZE_MAP = {
  medium: 'text-3xl',
  large: 'text-5xl',
  xlarge: 'text-6xl',
  xxlarge: 'text-7xl',
};

const CHORD_FONT_SIZE_MAP = {
  medium: 'text-xl',
  large: 'text-3xl',
  xlarge: 'text-4xl',
  xxlarge: 'text-5xl',
};

interface StageMonitorPageProps {
  onBack?: () => void;
}

export function StageMonitorPage({ onBack }: StageMonitorPageProps) {
  const { editingSongs } = useSetlistStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [parsedContent, setParsedContent] = useState<ParsedChordPro | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [settings, setSettings] = useState<StageMonitorSettings>({
    fontSize: 'xlarge',
    showChords: true,
    showNextSong: true,
    theme: 'dark',
    showTimer: true,
  });

  const currentSong: SetlistSong | undefined = editingSongs[currentIndex];
  const nextSong: SetlistSong | undefined = editingSongs[currentIndex + 1];

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Reset timer when song changes
  useEffect(() => {
    setElapsedTime(0);
  }, [currentIndex]);

  // Load chord content for current song
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
          const matchingChart = charts.find(c => c.key === currentSong.key) || charts[0];
          let content = matchingChart.chordpro_content || matchingChart.content;

          if (matchingChart.key !== currentSong.key && content) {
            const transposed = await chordsApi.transpose({
              content,
              from_key: matchingChart.key,
              to_key: currentSong.key,
            });
            content = transposed.content;
          }

          if (content) {
            const parsed = await chordsApi.parse(content);
            setParsedContent(parsed);
          }
        } else {
          setParsedContent(null);
        }
      } catch (error) {
        console.error('Failed to load chords:', error);
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
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        goToPrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && showSettings) {
        setShowSettings(false);
      } else if (e.key === 'c' || e.key === 'C') {
        setSettings(prev => ({ ...prev, showChords: !prev.showChords }));
      } else if (e.key === 't' || e.key === 'T') {
        setIsTimerRunning(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, toggleFullscreen, showSettings]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const themeClasses = settings.theme === 'dark'
    ? 'bg-black text-white'
    : 'bg-white text-gray-900';

  if (editingSongs.length === 0) {
    return (
      <div className={cn('h-full flex flex-col items-center justify-center', themeClasses)}>
        <Music className="w-20 h-20 text-gray-500 dark:text-gray-400 mb-6" />
        <h2 className="text-3xl font-bold mb-3">송리스트가 비어있습니다</h2>
        <p className="text-xl text-gray-500 dark:text-gray-400 mb-8">먼저 송리스트에 곡을 추가해주세요</p>
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-lg"
          >
            돌아가기
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col relative select-none', themeClasses)}>
      {/* Top bar - larger elements for visibility */}
      <div className={cn(
        'absolute top-0 left-0 right-0 z-20 transition-opacity duration-300',
        isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100',
        'bg-gradient-to-b from-black/70 to-transparent py-4 px-6'
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && !isFullscreen && (
              <button
                onClick={onBack}
                className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div>
              <p className="text-white/70 text-sm font-medium uppercase tracking-wider">스테이지 모니터</p>
              <p className="text-white text-lg">
                {currentIndex + 1} / {editingSongs.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            {settings.showTimer && (
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={cn(
                  'px-4 py-2 rounded-lg font-mono text-xl transition-colors',
                  isTimerRunning
                    ? 'bg-green-600 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
              >
                <Clock className="w-5 h-5 inline mr-2" />
                {formatTime(elapsedTime)}
              </button>
            )}

            <button
              onClick={() => setShowSettings(true)}
              className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <Settings className="w-6 h-6" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-3 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main content - optimized for stage visibility */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:px-8 sm:py-12 md:px-12 md:py-24 overflow-auto">
        {/* Current song - large display */}
        <div className="text-center mb-8">
          <h1 className={cn(FONT_SIZE_MAP[settings.fontSize], 'font-bold mb-4')}>
            {currentSong?.song?.title}
          </h1>
          <div className="flex items-center justify-center gap-6">
            <span className={cn(
              'font-mono font-bold px-6 py-3 rounded-xl',
              settings.theme === 'dark' ? 'bg-primary-600' : 'bg-primary-100 text-primary-700',
              settings.fontSize === 'xxlarge' ? 'text-5xl' :
              settings.fontSize === 'xlarge' ? 'text-4xl' :
              settings.fontSize === 'large' ? 'text-3xl' : 'text-2xl'
            )}>
              {currentSong?.key}
            </span>
            {currentSong?.song?.bpm && (
              <span className={cn(
                'opacity-70',
                settings.fontSize === 'xxlarge' ? 'text-4xl' :
                settings.fontSize === 'xlarge' ? 'text-3xl' :
                settings.fontSize === 'large' ? 'text-2xl' : 'text-xl'
              )}>
                {currentSong.song.bpm} BPM
              </span>
            )}
          </div>
        </div>

        {/* Chord display - simplified for stage */}
        {settings.showChords && !isLoading && parsedContent && parsedContent.lines.length > 0 && (
          <div className="w-full max-w-6xl mx-auto text-center mb-8 overflow-x-hidden">
            {parsedContent.lines.slice(0, 6).map((line, lineIndex) => (
              <div key={lineIndex} className="mb-3">
                {line.segments.map((segment, segIndex) => (
                  <span key={segIndex} className="inline-flex flex-col items-center mx-1">
                    {segment.chord && (
                      <span className={cn(
                        CHORD_FONT_SIZE_MAP[settings.fontSize],
                        'font-mono font-bold text-primary-400 mb-1'
                      )}>
                        {segment.chord}
                      </span>
                    )}
                    <span className={cn(
                      settings.fontSize === 'xxlarge' ? 'text-4xl' :
                      settings.fontSize === 'xlarge' ? 'text-3xl' :
                      settings.fontSize === 'large' ? 'text-2xl' : 'text-xl',
                      'leading-relaxed whitespace-pre opacity-80'
                    )}>
                      {segment.lyric}
                    </span>
                  </span>
                ))}
              </div>
            ))}
            {parsedContent.lines.length > 6 && (
              <p className="text-lg opacity-50 mt-4">
                ... ({parsedContent.lines.length - 6}줄 더 있음)
              </p>
            )}
          </div>
        )}

        {/* Next song preview */}
        {settings.showNextSong && nextSong && (
          <div className={cn(
            'mt-auto pt-6 px-8 py-4 rounded-2xl',
            settings.theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'
          )}>
            <p className="text-sm uppercase tracking-wider opacity-60 mb-2">다음 곡</p>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-semibold">{nextSong.song?.title}</span>
              <span className={cn(
                'font-mono text-xl px-3 py-1 rounded',
                settings.theme === 'dark' ? 'bg-white/20' : 'bg-gray-200'
              )}>
                {nextSong.key}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons - large touch targets */}
      <button
        onClick={goToPrevious}
        disabled={currentIndex === 0}
        className={cn(
          'absolute left-6 top-1/2 -translate-y-1/2 z-10',
          'p-6 rounded-full transition-all',
          currentIndex === 0
            ? 'opacity-20 cursor-not-allowed'
            : 'opacity-40 hover:opacity-100 hover:bg-white/20'
        )}
      >
        <ChevronLeft className="w-16 h-16" />
      </button>
      <button
        onClick={goToNext}
        disabled={currentIndex === editingSongs.length - 1}
        className={cn(
          'absolute right-6 top-1/2 -translate-y-1/2 z-10',
          'p-6 rounded-full transition-all',
          currentIndex === editingSongs.length - 1
            ? 'opacity-20 cursor-not-allowed'
            : 'opacity-40 hover:opacity-100 hover:bg-white/20'
        )}
      >
        <ChevronRight className="w-16 h-16" />
      </button>

      {/* Song progress indicator at bottom */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300',
        isFullscreen ? 'opacity-0 hover:opacity-100' : 'opacity-100',
        'bg-gradient-to-t from-black/50 to-transparent py-4 px-6'
      )}>
        <div className="flex justify-center gap-3">
          {editingSongs.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'w-4 h-4 rounded-full transition-all',
                index === currentIndex
                  ? 'bg-primary-500 scale-125'
                  : 'bg-white/40 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-lg">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">모니터 설정</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              {/* Font size */}
              <div>
                <label className="block text-lg font-medium text-gray-300 mb-3">
                  글꼴 크기
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['medium', 'large', 'xlarge', 'xxlarge'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setSettings(prev => ({ ...prev, fontSize: size }))}
                      className={cn(
                        'py-3 rounded-lg text-sm font-medium transition-colors',
                        settings.fontSize === size
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      )}
                    >
                      {size === 'medium' ? '중간' : size === 'large' ? '크게' : size === 'xlarge' ? '아주 크게' : '최대'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-lg font-medium text-gray-300 mb-3">
                  테마
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                    className={cn(
                      'py-3 rounded-lg font-medium transition-colors',
                      settings.theme === 'dark'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    )}
                  >
                    어두운 테마
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                    className={cn(
                      'py-3 rounded-lg font-medium transition-colors',
                      settings.theme === 'light'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    )}
                  >
                    밝은 테마
                  </button>
                </div>
              </div>

              {/* Toggle options */}
              <div className="space-y-3">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, showChords: !prev.showChords }))}
                  className="w-full flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-lg text-gray-300">코드 표시</span>
                  {settings.showChords ? (
                    <Eye className="w-6 h-6 text-primary-400" />
                  ) : (
                    <EyeOff className="w-6 h-6 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, showNextSong: !prev.showNextSong }))}
                  className="w-full flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-lg text-gray-300">다음 곡 미리보기</span>
                  {settings.showNextSong ? (
                    <Eye className="w-6 h-6 text-primary-400" />
                  ) : (
                    <EyeOff className="w-6 h-6 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, showTimer: !prev.showTimer }))}
                  className="w-full flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <span className="text-lg text-gray-300">타이머 표시</span>
                  {settings.showTimer ? (
                    <Eye className="w-6 h-6 text-primary-400" />
                  ) : (
                    <EyeOff className="w-6 h-6 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Keyboard shortcuts */}
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-lg font-medium text-gray-400 mb-3">키보드 단축키</h3>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-500">
                  <div>← / → : 이전/다음 곡</div>
                  <div>Space : 다음 곡</div>
                  <div>F : 전체 화면</div>
                  <div>C : 코드 표시 토글</div>
                  <div>T : 타이머 시작/정지</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full mt-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-lg font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StageMonitorPage;
