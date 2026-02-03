import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '../stores/playerStore';

interface KeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;

  const {
    isPlaying,
    currentTime,
    volume,
    playbackRate,
    play,
    pause,
    seekRelative,
    setVolume,
    setPlaybackRate,
    setLoopStart,
    setLoopEnd,
    toggleLoop,
  } = usePlayerStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.code) {
        // 재생/일시정지
        case 'Space':
          e.preventDefault();
          isPlaying ? pause() : play();
          break;

        // 5초 뒤로
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;

        // 5초 앞으로
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;

        // 볼륨 올리기
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(100, volume + 10));
          break;

        // 볼륨 내리기
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 10));
          break;

        // A점 설정
        case 'BracketLeft':
          e.preventDefault();
          setLoopStart(currentTime);
          break;

        // B점 설정
        case 'BracketRight':
          e.preventDefault();
          setLoopEnd(currentTime);
          break;

        // 루프 토글
        case 'KeyL':
          e.preventDefault();
          toggleLoop();
          break;

        // 속도 올리기
        case 'Equal':
        case 'NumpadAdd':
          e.preventDefault();
          setPlaybackRate(Math.min(2, playbackRate + 0.25));
          break;

        // 속도 내리기
        case 'Minus':
        case 'NumpadSubtract':
          e.preventDefault();
          setPlaybackRate(Math.max(0.25, playbackRate - 0.25));
          break;

        // 0-9: 퍼센트 이동
        case 'Digit0':
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
        case 'Digit5':
        case 'Digit6':
        case 'Digit7':
        case 'Digit8':
        case 'Digit9': {
          e.preventDefault();
          const percent = parseInt(e.code.replace('Digit', '')) * 10;
          const { duration, seek } = usePlayerStore.getState();
          seek((percent / 100) * duration);
          break;
        }

        default:
          break;
      }
    },
    [isPlaying, currentTime, volume, playbackRate, play, pause, seekRelative, setVolume, setPlaybackRate, setLoopStart, setLoopEnd, toggleLoop]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

// 단축키 목록
export const KEYBOARD_SHORTCUTS = [
  { key: 'Space', description: '재생/일시정지' },
  { key: '← / →', description: '5초 이동' },
  { key: '↑ / ↓', description: '볼륨 조절' },
  { key: '[', description: 'A점 설정' },
  { key: ']', description: 'B점 설정' },
  { key: 'L', description: '구간 반복 토글' },
  { key: '+ / -', description: '재생 속도 조절' },
  { key: '0-9', description: '해당 위치로 이동' },
];
