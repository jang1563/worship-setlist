/**
 * 코드 동기화 관련 타입 정의
 */

// 타임스탬프가 있는 개별 코드
export interface TimedChord {
  chord: string;
  lyrics: string;
  timestamp: number; // 초 단위
}

// 동기화된 섹션 (절, 후렴 등)
export interface SyncedSection {
  name: string; // "Verse 1", "Chorus", etc.
  startTime: number;
  chords: TimedChord[];
}

// 곡 전체 동기화 데이터
export interface SyncData {
  songId: number;
  videoId?: string;
  sections: SyncedSection[];
  createdAt?: string;
  updatedAt?: string;
}

// ChordPro 확장 포맷 (타임스탬프 포함)
// 예: {t:0:15}[G]가사
export interface ExtendedChordProLine {
  timestamp?: number;
  chords: Array<{
    chord: string;
    position: number;
  }>;
  lyrics: string;
}

// 현재 재생 상태
export interface PlaybackState {
  currentTime: number;
  currentSectionIndex: number;
  currentChordIndex: number;
  nextChord?: TimedChord;
}

// 동기화 편집 상태
export interface SyncEditorState {
  isEditing: boolean;
  selectedChordIndex: number | null;
  pendingTimestamp: number | null;
}

/**
 * 유틸리티 함수
 */

// 현재 시간에 해당하는 코드 찾기
export function findCurrentChord(
  sections: SyncedSection[],
  currentTime: number
): { sectionIndex: number; chordIndex: number } | null {
  for (let si = sections.length - 1; si >= 0; si--) {
    const section = sections[si];
    for (let ci = section.chords.length - 1; ci >= 0; ci--) {
      if (section.chords[ci].timestamp <= currentTime) {
        return { sectionIndex: si, chordIndex: ci };
      }
    }
    if (section.startTime <= currentTime) {
      return { sectionIndex: si, chordIndex: 0 };
    }
  }
  return null;
}

// 다음 코드 찾기
export function findNextChord(
  sections: SyncedSection[],
  currentSectionIndex: number,
  currentChordIndex: number
): TimedChord | null {
  const section = sections[currentSectionIndex];
  if (!section) return null;

  // 같은 섹션의 다음 코드
  if (currentChordIndex < section.chords.length - 1) {
    return section.chords[currentChordIndex + 1];
  }

  // 다음 섹션의 첫 코드
  if (currentSectionIndex < sections.length - 1) {
    const nextSection = sections[currentSectionIndex + 1];
    if (nextSection.chords.length > 0) {
      return nextSection.chords[0];
    }
  }

  return null;
}

// 모든 코드를 플랫하게 펼치기
export function flattenChords(sections: SyncedSection[]): TimedChord[] {
  return sections.flatMap((section) => section.chords);
}

// 타임스탬프로 정렬
export function sortByTimestamp(chords: TimedChord[]): TimedChord[] {
  return [...chords].sort((a, b) => a.timestamp - b.timestamp);
}
