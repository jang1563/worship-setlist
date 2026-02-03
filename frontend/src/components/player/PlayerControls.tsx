import { useState, useRef } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { formatTime } from '../../utils/youtube';

interface PlayerControlsProps {
  className?: string;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({ className = '' }) => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    loopStart,
    loopEnd,
    isLooping,
    playbackRate,
    play,
    pause,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
  } = usePlayerStore();

  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = percent * duration;
    seek(newTime);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(percent * duration);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loopStartPercent = loopStart !== null && duration > 0 ? (loopStart / duration) * 100 : null;
  const loopEndPercent = loopEnd !== null && duration > 0 ? (loopEnd / duration) * 100 : null;

  return (
    <div className={`bg-gray-900 dark:bg-gray-950 text-white p-4 rounded-lg ${className}`}>
      {/* Progress Bar */}
      <div
        ref={progressRef}
        className="relative h-3 bg-gray-700 rounded-full cursor-pointer mb-4 group"
        onClick={handleSeek}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTime(null)}
      >
        {/* Loop Region */}
        {loopStartPercent !== null && loopEndPercent !== null && (
          <div
            className={`absolute h-full rounded-full transition-colors ${
              isLooping ? 'bg-purple-500/40' : 'bg-purple-500/20'
            }`}
            style={{
              left: `${loopStartPercent}%`,
              width: `${loopEndPercent - loopStartPercent}%`,
            }}
          />
        )}

        {/* Buffer/Background */}
        <div className="absolute h-full w-full bg-gray-700 rounded-full" />

        {/* Progress */}
        <div
          className="absolute h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />

        {/* Loop Markers */}
        {loopStart !== null && loopStartPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 bg-green-500 rounded shadow-lg"
            style={{ left: `${loopStartPercent}%`, marginLeft: '-3px' }}
            title={`A: ${formatTime(loopStart)}`}
          />
        )}
        {loopEnd !== null && loopEndPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 bg-red-500 rounded shadow-lg"
            style={{ left: `${loopEndPercent}%`, marginLeft: '-3px' }}
            title={`B: ${formatTime(loopEnd)}`}
          />
        )}

        {/* Current position handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, marginLeft: '-8px' }}
        />

        {/* Hover time tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 transform -translate-x-1/2 px-2 py-1 bg-black/80 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${(hoverTime / duration) * 100}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {/* Left: Play controls */}
        <div className="flex items-center gap-2">
          {/* Skip backward */}
          <button
            onClick={() => seekRelative(-10)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors group"
            title="10초 뒤로"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100">-10s</span>
          </button>

          {/* Skip -5 */}
          <button
            onClick={() => seekRelative(-5)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="5초 뒤로"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => (isPlaying ? pause() : play())}
            className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors shadow-lg"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip +5 */}
          <button
            onClick={() => seekRelative(5)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="5초 앞으로"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Skip forward */}
          <button
            onClick={() => seekRelative(10)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="10초 앞으로"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>

          {/* Time Display */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-sm font-mono text-indigo-400">
              {formatTime(currentTime)}
            </span>
            <span className="text-gray-500">/</span>
            <span className="text-sm font-mono text-gray-400">
              {formatTime(duration)}
            </span>
          </div>

          {/* Speed indicator */}
          {playbackRate !== 1 && (
            <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
              playbackRate < 1
                ? 'bg-blue-600/50 text-blue-200'
                : 'bg-orange-600/50 text-orange-200'
            }`}>
              {playbackRate}x
            </span>
          )}
        </div>

        {/* Right: Volume & Loop indicator */}
        <div className="flex items-center gap-3">
          {/* Loop indicator */}
          {isLooping && (
            <div className="flex items-center gap-1 text-purple-400 text-xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{formatTime((loopEnd || 0) - (loopStart || 0))}</span>
            </div>
          )}

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 50 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-xs text-gray-500 w-8">{volume}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
