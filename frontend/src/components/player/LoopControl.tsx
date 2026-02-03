import React, { useState, useEffect } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { formatTime } from '../../utils/youtube';

interface LoopControlProps {
  className?: string;
  compact?: boolean;
}

interface SavedLoop {
  id: string;
  name: string;
  start: number;
  end: number;
}

export const LoopControl: React.FC<LoopControlProps> = ({ className = '', compact = false }) => {
  const {
    currentTime,
    duration,
    loopStart,
    loopEnd,
    isLooping,
    currentSongId,
    setLoopStart,
    setLoopEnd,
    toggleLoop,
    clearLoop,
    seek,
  } = usePlayerStore();

  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [loopName, setLoopName] = useState('');

  // Load saved loops for current song
  useEffect(() => {
    if (currentSongId) {
      const saved = localStorage.getItem(`loops_${currentSongId}`);
      if (saved) {
        setSavedLoops(JSON.parse(saved));
      } else {
        setSavedLoops([]);
      }
    }
  }, [currentSongId]);

  // Save loop to localStorage
  const saveLoop = () => {
    if (loopStart === null || loopEnd === null || !loopName.trim()) return;

    const newLoop: SavedLoop = {
      id: Date.now().toString(),
      name: loopName.trim(),
      start: loopStart,
      end: loopEnd,
    };

    const updated = [...savedLoops, newLoop];
    setSavedLoops(updated);
    if (currentSongId) {
      localStorage.setItem(`loops_${currentSongId}`, JSON.stringify(updated));
    }
    setLoopName('');
    setShowSaveDialog(false);
  };

  // Load a saved loop
  const loadLoop = (loop: SavedLoop) => {
    setLoopStart(loop.start);
    setLoopEnd(loop.end);
    seek(loop.start);
  };

  // Delete a saved loop
  const deleteLoop = (id: string) => {
    const updated = savedLoops.filter(l => l.id !== id);
    setSavedLoops(updated);
    if (currentSongId) {
      localStorage.setItem(`loops_${currentSongId}`, JSON.stringify(updated));
    }
  };

  // Quick loop presets
  const quickLoopPresets = [
    { label: '10초', duration: 10 },
    { label: '30초', duration: 30 },
    { label: '1분', duration: 60 },
  ];

  const setQuickLoop = (loopDuration: number) => {
    const start = Math.max(0, currentTime);
    const end = Math.min(duration, currentTime + loopDuration);
    setLoopStart(start);
    setLoopEnd(end);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setLoopStart(currentTime)}
          className={`p-1.5 rounded text-xs font-bold ${
            loopStart !== null
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          A
        </button>
        <button
          onClick={() => setLoopEnd(currentTime)}
          className={`p-1.5 rounded text-xs font-bold ${
            loopEnd !== null
              ? 'bg-red-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          B
        </button>
        <button
          onClick={toggleLoop}
          disabled={loopStart === null || loopEnd === null}
          className={`px-2 py-1 rounded text-xs font-medium ${
            isLooping
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          } disabled:opacity-50`}
        >
          {isLooping ? '🔁' : '반복'}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            구간 반복
          </span>
        </div>
        <button
          onClick={toggleLoop}
          disabled={loopStart === null || loopEnd === null}
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all ${
            isLooping
              ? 'bg-purple-600 text-white shadow-md animate-pulse'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          } ${
            loopStart === null || loopEnd === null
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:opacity-80'
          }`}
        >
          {isLooping ? '🔁 반복 중' : '반복 OFF'}
        </button>
      </div>

      {/* Quick Loop Presets */}
      <div className="flex gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">빠른 설정:</span>
        {quickLoopPresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setQuickLoop(preset.duration)}
            className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* A-B Points */}
      <div className="grid grid-cols-2 gap-3">
        {/* A Point */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setLoopStart(currentTime)}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
              loopStart !== null
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
            }`}
          >
            <span className={`w-6 h-6 flex items-center justify-center text-sm font-bold rounded ${
              loopStart !== null ? 'bg-white/20' : 'bg-green-500 text-white'
            }`}>
              A
            </span>
            <span className="text-sm font-medium">시작점</span>
          </button>
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
              {loopStart !== null ? formatTime(loopStart) : '--:--'}
            </span>
            {loopStart !== null && (
              <button
                onClick={() => seek(loopStart)}
                className="text-xs text-green-600 hover:text-green-700"
                title="이 위치로 이동"
              >
                ▶
              </button>
            )}
          </div>
        </div>

        {/* B Point */}
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setLoopEnd(currentTime)}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
              loopEnd !== null
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
            }`}
          >
            <span className={`w-6 h-6 flex items-center justify-center text-sm font-bold rounded ${
              loopEnd !== null ? 'bg-white/20' : 'bg-red-500 text-white'
            }`}>
              B
            </span>
            <span className="text-sm font-medium">끝점</span>
          </button>
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300">
              {loopEnd !== null ? formatTime(loopEnd) : '--:--'}
            </span>
            {loopEnd !== null && (
              <button
                onClick={() => seek(loopEnd)}
                className="text-xs text-red-600 hover:text-red-700"
                title="이 위치로 이동"
              >
                ▶
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loop Info & Actions */}
      {(loopStart !== null || loopEnd !== null) && (
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            {loopStart !== null && loopEnd !== null ? (
              <>
                <span className="text-sm font-mono font-medium text-purple-600 dark:text-purple-400">
                  {formatTime(loopEnd - loopStart)}
                </span>
                <span className="text-xs text-gray-500">구간 길이</span>
              </>
            ) : (
              <span className="text-xs text-gray-500">A점과 B점을 설정하세요</span>
            )}
          </div>
          <div className="flex gap-2">
            {loopStart !== null && loopEnd !== null && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                저장
              </button>
            )}
            <button
              onClick={clearLoop}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400"
            >
              초기화
            </button>
          </div>
        </div>
      )}

      {/* Save Loop Dialog */}
      {showSaveDialog && (
        <div className="flex gap-2 items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2">
          <input
            type="text"
            value={loopName}
            onChange={(e) => setLoopName(e.target.value)}
            placeholder="구간 이름 (예: 1절 코러스)"
            className="flex-1 px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-600"
            autoFocus
          />
          <button
            onClick={saveLoop}
            disabled={!loopName.trim()}
            className="px-3 py-1 text-xs bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            저장
          </button>
          <button
            onClick={() => setShowSaveDialog(false)}
            className="px-2 py-1 text-xs text-gray-500"
          >
            취소
          </button>
        </div>
      )}

      {/* Saved Loops */}
      {savedLoops.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">저장된 구간:</span>
          <div className="flex flex-wrap gap-2">
            {savedLoops.map((loop) => (
              <div
                key={loop.id}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
              >
                <button
                  onClick={() => loadLoop(loop)}
                  className="text-gray-700 dark:text-gray-300 hover:text-indigo-600"
                >
                  {loop.name}
                </button>
                <span className="text-gray-400">
                  ({formatTime(loop.end - loop.start)})
                </span>
                <button
                  onClick={() => deleteLoop(loop.id)}
                  className="text-red-400 hover:text-red-500 ml-1"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center space-x-2">
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">[</kbd>
        <span>A점</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">]</kbd>
        <span>B점</span>
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">L</kbd>
        <span>반복</span>
      </div>
    </div>
  );
};

export default LoopControl;
