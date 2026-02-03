import React, { useRef, useEffect, useMemo } from 'react';
import { usePlayerStore } from '../../stores/playerStore';
import { usePracticeStore } from '../../stores/practiceStore';
import {
  SyncedSection,
  findCurrentChord,
  findNextChord,
} from '../../types/sync';

interface SyncedChordSheetProps {
  sections: SyncedSection[];
  className?: string;
  onChordClick?: (sectionIndex: number, chordIndex: number, time: number) => void;
}

export const SyncedChordSheet: React.FC<SyncedChordSheetProps> = ({
  sections,
  className = '',
  onChordClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const { currentTime } = usePlayerStore();
  const { autoScroll, showNextChord, highlightCurrentChord, scrollOffset } =
    usePracticeStore();

  // 현재 재생 위치 찾기
  const currentPosition = useMemo(
    () => findCurrentChord(sections, currentTime),
    [sections, currentTime]
  );

  // 다음 코드 찾기
  const nextChord = useMemo(() => {
    if (!currentPosition) return null;
    return findNextChord(
      sections,
      currentPosition.sectionIndex,
      currentPosition.chordIndex
    );
  }, [sections, currentPosition]);

  // 자동 스크롤
  useEffect(() => {
    if (!autoScroll || !activeRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const active = activeRef.current;

    const scrollTop = active.offsetTop - scrollOffset;

    container.scrollTo({
      top: Math.max(0, scrollTop),
      behavior: 'smooth',
    });
  }, [currentPosition, autoScroll, scrollOffset]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
    >
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-6">
          {/* Section Header */}
          <h3 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2 sticky top-0 bg-white dark:bg-gray-900 py-1">
            {section.name}
          </h3>

          {/* Chords */}
          <div className="space-y-2">
            {section.chords.map((chord, chordIndex) => {
              const isActive =
                currentPosition?.sectionIndex === sectionIndex &&
                currentPosition?.chordIndex === chordIndex;

              const isNext =
                showNextChord &&
                nextChord &&
                section.chords[chordIndex + 1] === nextChord;

              return (
                <div
                  key={chordIndex}
                  ref={isActive ? activeRef : undefined}
                  onClick={() =>
                    onChordClick?.(sectionIndex, chordIndex, chord.timestamp)
                  }
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-300 ${
                    isActive && highlightCurrentChord
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500 scale-[1.02]'
                      : isNext
                      ? 'bg-gray-50 dark:bg-gray-800/50 opacity-70'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {/* Chord */}
                  <span
                    className={`inline-block font-mono font-bold text-lg mb-1 ${
                      isActive
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {chord.chord}
                  </span>

                  {/* Lyrics */}
                  <p
                    className={`text-base ${
                      isActive
                        ? 'text-gray-800 dark:text-gray-100'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {chord.lyrics}
                  </p>

                  {/* Timestamp */}
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    {formatTimestamp(chord.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {sections.length === 0 && (
        <div className="text-center text-gray-400 dark:text-gray-500 py-12">
          <p>동기화된 코드가 없습니다.</p>
          <p className="text-sm mt-2">코드를 클릭하여 타임스탬프를 설정하세요.</p>
        </div>
      )}
    </div>
  );
};

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default SyncedChordSheet;
