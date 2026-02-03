import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Monitor, Music, Clock, ChevronUp, ChevronDown, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useSetlistStore } from '@/stores/setlistStore';
import { cn } from '@/utils/cn';
import type { SetlistSong } from '@/types';

interface LeaderDashboardProps {
  onOpenPresenter?: () => void;
}

export function LeaderDashboard({ onOpenPresenter }: LeaderDashboardProps) {
  const { editingSongs, currentSetlist } = useSetlistStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showChords, setShowChords] = useState(true);
  const [presenterWindow, setPresenterWindow] = useState<Window | null>(null);

  const currentSong: SetlistSong | undefined = editingSongs[currentIndex];
  const nextSong: SetlistSong | undefined = editingSongs[currentIndex + 1];

  // Timer for elapsed time
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Reset timer when song changes
  useEffect(() => {
    setElapsedTime(0);
    setIsPlaying(false);
  }, [currentIndex]);

  // Communicate with presenter window
  const sendToPresenter = useCallback((action: string, data?: unknown) => {
    if (presenterWindow && !presenterWindow.closed) {
      presenterWindow.postMessage({ type: 'LEADER_COMMAND', action, data }, '*');
    }
  }, [presenterWindow]);

  // Navigation
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      sendToPresenter('GO_TO_SONG', currentIndex - 1);
    }
  }, [currentIndex, sendToPresenter]);

  const goToNext = useCallback(() => {
    if (currentIndex < editingSongs.length - 1) {
      setCurrentIndex(prev => prev + 1);
      sendToPresenter('GO_TO_SONG', currentIndex + 1);
    }
  }, [currentIndex, editingSongs.length, sendToPresenter]);

  const goToSong = useCallback((index: number) => {
    setCurrentIndex(index);
    sendToPresenter('GO_TO_SONG', index);
  }, [sendToPresenter]);

  // Open presenter in new window
  const handleOpenPresenter = useCallback(() => {
    // Open presenter in a new popup window for second screen
    const width = window.screen.width;
    const height = window.screen.height;
    const newWindow = window.open(
      `${window.location.origin}?view=presenter`,
      'presenter',
      `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
    );
    setPresenterWindow(newWindow);
    onOpenPresenter?.();
  }, [onOpenPresenter]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate total duration and progress
  const totalDuration = editingSongs.reduce((acc, s) => acc + (s.song?.duration_sec || 0), 0);
  const completedDuration = editingSongs.slice(0, currentIndex).reduce((acc, s) => acc + (s.song?.duration_sec || 0), 0);
  const progressPercent = totalDuration > 0 ? ((completedDuration + elapsedTime) / totalDuration) * 100 : 0;

  if (editingSongs.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Music className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">송리스트가 비어있습니다</h2>
        <p className="text-gray-500 dark:text-gray-400">먼저 송리스트에 곡을 추가해주세요</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {currentSetlist?.title || '인도자 대시보드'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentSetlist?.service_type} {currentSetlist?.date && `· ${currentSetlist.date}`}
            </p>
          </div>
          <button
            onClick={handleOpenPresenter}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Monitor className="w-4 h-4" />
            프레젠터 열기
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{formatTime(completedDuration + elapsedTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Song list - hidden on mobile */}
        <div className="hidden md:block w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-white dark:bg-gray-800 flex-shrink-0">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">곡 목록</h2>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {editingSongs.map((song, index) => (
              <button
                key={song.id}
                onClick={() => goToSong(index)}
                className={cn(
                  'w-full p-3 text-left transition-colors',
                  index === currentIndex
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-l-4 border-primary-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    index < currentIndex
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : index === currentIndex
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                  )}>
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-sm truncate',
                      index === currentIndex
                        ? 'font-semibold text-primary-700 dark:text-primary-300'
                        : 'text-gray-900 dark:text-white'
                    )}>
                      {song.song?.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span className="font-mono">{song.key}</span>
                      {song.song?.duration_sec && (
                        <>
                          <span>·</span>
                          <span>{formatTime(song.song.duration_sec)}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Current song display */}
        <div className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          {/* Current song info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                  현재 곡 ({currentIndex + 1}/{editingSongs.length})
                </p>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 truncate">
                  {currentSong?.song?.title}
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 truncate">
                  {currentSong?.song?.artist}
                </p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <div className="text-2xl sm:text-3xl md:text-4xl font-mono font-bold text-primary-600 dark:text-primary-400">
                  {currentSong?.key}
                </div>
                {currentSong?.song?.bpm && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {currentSong.song.bpm} BPM
                  </p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className={cn(
                  'p-3 rounded-full transition-colors',
                  currentIndex === 0
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <SkipBack className="w-8 h-8" />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-4 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              >
                {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />}
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex === editingSongs.length - 1}
                className={cn(
                  'p-3 rounded-full transition-colors',
                  currentIndex === editingSongs.length - 1
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <SkipForward className="w-8 h-8" />
              </button>
            </div>

            {/* Timer */}
            <div className="text-center pt-2">
              <span className="text-2xl font-mono text-gray-600 dark:text-gray-300">
                {formatTime(elapsedTime)}
              </span>
              {currentSong?.song?.duration_sec && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' / '}{formatTime(currentSong.song.duration_sec)}
                </span>
              )}
            </div>
          </div>

          {/* Transition info */}
          {currentSong?.transition_notes && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">전환 가이드</h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">{currentSong.transition_notes}</p>
              {currentSong.transition_chord_progression && (
                <p className="mt-2 font-mono text-yellow-800 dark:text-yellow-200">
                  {currentSong.transition_chord_progression}
                </p>
              )}
            </div>
          )}

          {/* Next song preview */}
          {nextSong && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">다음 곡</p>
                  <p className="font-medium text-gray-900 dark:text-white">{nextSong.song?.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{nextSong.song?.artist}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-bold text-gray-700 dark:text-gray-300">
                    {nextSong.key}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick controls - hidden on mobile */}
        <div className="hidden lg:block w-48 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">빠른 설정</h3>

          <div className="space-y-4">
            {/* Show chords toggle */}
            <button
              onClick={() => {
                setShowChords(!showChords);
                sendToPresenter('TOGGLE_CHORDS', !showChords);
              }}
              className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span className="text-sm text-gray-700 dark:text-gray-300">코드 표시</span>
              {showChords ? (
                <Eye className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* Font size */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">글꼴 크기</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => sendToPresenter('FONT_SIZE', 'decrease')}
                  className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <ChevronDown className="w-4 h-4 mx-auto text-gray-600 dark:text-gray-300" />
                </button>
                <button
                  onClick={() => sendToPresenter('FONT_SIZE', 'increase')}
                  className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <ChevronUp className="w-4 h-4 mx-auto text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>

            {/* Time info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">예배 시간</span>
              </div>
              <p className="text-lg font-mono text-gray-900 dark:text-white">
                {formatTime(completedDuration + elapsedTime)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                / {formatTime(totalDuration)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
