import { ReactNode } from 'react';
import { Tooltip } from './Tooltip';

/**
 * Music terminology definitions in Korean
 * These explanations are designed for non-musicians (especially pastors)
 * to understand basic music concepts used in worship leading.
 */
export const MUSIC_TERMS = {
  key: {
    term: '키',
    termEn: 'Key',
    explanation: '음높이를 나타냅니다. 예: G키는 "솔"을 기준으로 합니다. 같은 곡도 키에 따라 높거나 낮게 부를 수 있습니다.',
  },
  transpose: {
    term: '트랜스포즈',
    termEn: 'Transpose',
    explanation: '곡의 음높이를 올리거나 내리는 것입니다. 가수의 음역대에 맞춰 조절할 때 사용합니다.',
  },
  tempo: {
    term: '템포',
    termEn: 'Tempo',
    explanation: '곡의 빠르기입니다. slow=느림, medium=보통, fast=빠름. 템포에 따라 곡의 분위기가 달라집니다.',
  },
  chord: {
    term: '코드',
    termEn: 'Chord',
    explanation: '여러 음을 동시에 연주하는 화음입니다. 기타나 피아노로 반주할 때 사용하는 기호입니다.',
  },
  bpm: {
    term: 'BPM',
    termEn: 'Beats Per Minute',
    explanation: '분당 박자 수로, 숫자가 클수록 빠릅니다. 60 BPM = 1초에 한 박자, 120 BPM = 1초에 두 박자.',
  },
  keyFlow: {
    term: '키 흐름',
    termEn: 'Key Flow',
    explanation: '연속된 곡들의 키 변화입니다. 자연스러운 키 흐름은 예배의 흐름을 부드럽게 합니다.',
  },
  transition: {
    term: '전환',
    termEn: 'Transition',
    explanation: '한 곡에서 다음 곡으로 넘어가는 부분입니다. 키와 템포가 비슷할수록 전환이 자연스럽습니다.',
  },
  flow: {
    term: '플로우 / 곡 구성',
    termEn: 'Song Flow',
    explanation: '곡의 진행 순서입니다. I=인트로, V=절, C=코러스, B=브릿지, O=아웃트로 등으로 표시합니다.',
  },
  intro: {
    term: '인트로',
    termEn: 'Intro',
    explanation: '곡의 시작 부분으로, 본격적인 가사가 시작되기 전 연주 구간입니다.',
  },
  verse: {
    term: '절 (Verse)',
    termEn: 'Verse',
    explanation: '곡의 이야기를 전개하는 부분입니다. 보통 1절, 2절로 나뉘며 가사가 다릅니다.',
  },
  chorus: {
    term: '코러스 (후렴)',
    termEn: 'Chorus',
    explanation: '곡에서 반복되는 핵심 부분으로, 가장 기억에 남는 멜로디가 나오는 부분입니다.',
  },
  bridge: {
    term: '브릿지',
    termEn: 'Bridge',
    explanation: '절과 코러스와 다른 새로운 멜로디 구간입니다. 곡에 변화를 주고 클라이맥스를 만듭니다.',
  },
  outro: {
    term: '아웃트로',
    termEn: 'Outro',
    explanation: '곡의 마무리 부분입니다. 반복하며 서서히 끝내거나 다음 곡으로 자연스럽게 연결합니다.',
  },
  preChorus: {
    term: '프리코러스',
    termEn: 'Pre-Chorus',
    explanation: '절과 코러스 사이의 연결 구간입니다. 코러스로 가기 전 기대감을 높이는 역할을 합니다.',
  },
  mr: {
    term: 'MR',
    termEn: 'Music Recorded',
    explanation: '반주 음악입니다. 보컬 없이 악기 연주만 있는 음원으로, 노래 연습이나 실제 찬양에 사용합니다.',
  },
  playbackSpeed: {
    term: '재생 속도',
    termEn: 'Playback Speed',
    explanation: '음악 재생 빠르기입니다. 0.75x는 느리게, 1x는 원래 속도, 1.5x는 빠르게 재생합니다.',
  },
} as const;

export type MusicTermKey = keyof typeof MUSIC_TERMS;

interface MusicTermTooltipProps {
  /** The music term key to display */
  term: MusicTermKey;
  /** Custom children to wrap, if not provided will use the term name */
  children?: ReactNode;
  /** Show the (?) indicator */
  showIndicator?: boolean;
  /** Position of tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional className for the wrapper */
  className?: string;
}

/**
 * A specialized tooltip component for music terminology.
 * Wraps content with helpful explanations for non-musicians.
 */
export function MusicTermTooltip({
  term,
  children,
  showIndicator = false,
  position = 'top',
  className,
}: MusicTermTooltipProps) {
  const termData = MUSIC_TERMS[term];

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold">
        {termData.term}
        {termData.termEn && (termData.term as string) !== (termData.termEn as string) && (
          <span className="font-normal text-gray-400 dark:text-gray-500 ml-1">
            ({termData.termEn})
          </span>
        )}
      </div>
      <div className="text-xs leading-relaxed">{termData.explanation}</div>
    </div>
  );

  return (
    <Tooltip
      content={tooltipContent}
      position={position}
      showIndicator={showIndicator}
      className={className}
    >
      {children || termData.term}
    </Tooltip>
  );
}

/**
 * A simpler version that just renders the term with its definition
 * without requiring children - useful for labels
 */
interface MusicTermLabelProps {
  term: MusicTermKey;
  showEnglish?: boolean;
  showIndicator?: boolean;
  className?: string;
}

export function MusicTermLabel({
  term,
  showEnglish = false,
  showIndicator = true,
  className,
}: MusicTermLabelProps) {
  const termData = MUSIC_TERMS[term];

  return (
    <MusicTermTooltip term={term} showIndicator={showIndicator} className={className}>
      <span>
        {termData.term}
        {showEnglish && termData.termEn && (termData.term as string) !== (termData.termEn as string) && (
          <span className="text-gray-400 dark:text-gray-500 ml-1">({termData.termEn})</span>
        )}
      </span>
    </MusicTermTooltip>
  );
}

export default MusicTermTooltip;
