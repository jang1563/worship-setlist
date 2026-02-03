import React, { useState } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { MusicTermTooltip } from '@/components/common/MusicTermTooltip';

interface SpeedControlProps {
  className?: string;
  compact?: boolean;
}

// YouTube API에서 지원하는 재생 속도 값
const SUPPORTED_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

// 가장 가까운 지원 속도로 변환
const findNearestRate = (rate: number): number => {
  return SUPPORTED_RATES.reduce((prev, curr) =>
    Math.abs(curr - rate) < Math.abs(prev - rate) ? curr : prev
  );
};

export const SpeedControl: React.FC<SpeedControlProps> = ({ className = '', compact = false }) => {
  const { playbackRate, setPlaybackRate } = usePlayerStore();
  const [showSlider, setShowSlider] = useState(false);

  const presets = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // 안전하게 재생 속도 설정
  const handleSetRate = (rate: number) => {
    const nearestRate = findNearestRate(rate);
    setPlaybackRate(nearestRate);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    handleSetRate(value);
  };

  // Get speed label for display
  const getSpeedLabel = (rate: number) => {
    if (rate < 0.75) return '매우 느림';
    if (rate < 1) return '느림';
    if (rate === 1) return '보통';
    if (rate <= 1.25) return '조금 빠름';
    if (rate <= 1.5) return '빠름';
    return '매우 빠름';
  };

  // Color based on speed
  const getSpeedColor = (rate: number) => {
    if (rate < 1) return 'text-blue-600 dark:text-blue-400';
    if (rate === 1) return 'text-green-600 dark:text-green-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => {
            const currentIndex = SUPPORTED_RATES.indexOf(playbackRate);
            if (currentIndex > 0) {
              handleSetRate(SUPPORTED_RATES[currentIndex - 1]);
            }
          }}
          disabled={playbackRate === SUPPORTED_RATES[0]}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <span className={`font-mono text-sm font-bold min-w-[3rem] text-center ${getSpeedColor(playbackRate)}`}>
          {playbackRate}x
        </span>
        <button
          onClick={() => {
            const currentIndex = SUPPORTED_RATES.indexOf(playbackRate);
            if (currentIndex < SUPPORTED_RATES.length - 1) {
              handleSetRate(SUPPORTED_RATES[currentIndex + 1]);
            }
          }}
          disabled={playbackRate === SUPPORTED_RATES[SUPPORTED_RATES.length - 1]}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      <div className="flex items-center justify-between">
        <MusicTermTooltip term="playbackSpeed" position="right" showIndicator>
          <div className="flex items-center gap-2 cursor-help">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              재생 속도
            </span>
          </div>
        </MusicTermTooltip>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-mono font-bold ${getSpeedColor(playbackRate)}`}>
            {playbackRate}x
          </span>
          <span className="text-xs text-gray-500">
            {getSpeedLabel(playbackRate)}
          </span>
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-1">
        {presets.map((rate) => (
          <button
            key={rate}
            onClick={() => handleSetRate(rate)}
            className={`flex-1 py-2.5 px-1 text-xs font-medium rounded-lg transition-all ${
              playbackRate === rate
                ? 'bg-indigo-600 text-white shadow-md scale-105'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {rate}x
          </button>
        ))}
      </div>

      {/* Toggle for fine control slider */}
      <button
        onClick={() => setShowSlider(!showSlider)}
        className="flex items-center justify-center gap-1 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        <span>{showSlider ? '세부 조정 숨기기' : '세부 조정'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${showSlider ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Fine control slider */}
      {showSlider && (
        <div className="space-y-2">
          <input
            type="range"
            min="0.25"
            max="2"
            step="0.25"
            value={playbackRate}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0.25x</span>
            <span>1x</span>
            <span>2x</span>
          </div>
        </div>
      )}

      {/* Quick adjust buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const currentIndex = SUPPORTED_RATES.indexOf(playbackRate);
            if (currentIndex > 0) {
              handleSetRate(SUPPORTED_RATES[currentIndex - 1]);
            }
          }}
          disabled={playbackRate === SUPPORTED_RATES[0]}
          className="flex-1 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          느리게
        </button>
        <button
          onClick={() => handleSetRate(1)}
          className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
            playbackRate === 1
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          1x 원속도
        </button>
        <button
          onClick={() => {
            const currentIndex = SUPPORTED_RATES.indexOf(playbackRate);
            if (currentIndex < SUPPORTED_RATES.length - 1) {
              handleSetRate(SUPPORTED_RATES[currentIndex + 1]);
            }
          }}
          disabled={playbackRate === SUPPORTED_RATES[SUPPORTED_RATES.length - 1]}
          className="flex-1 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
        >
          빠르게
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-center">
        단축키: <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">-</kbd> 느리게 <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">+</kbd> 빠르게
      </div>
    </div>
  );
};

export default SpeedControl;
