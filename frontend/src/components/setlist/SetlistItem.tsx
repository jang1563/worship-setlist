import { useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical, X, AlertTriangle, CheckCircle, AlertCircle, Youtube, Music, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { MusicTermTooltip } from '@/components/common/MusicTermTooltip';
import type { SetlistSong } from '@/types';

// Song flow/structure options
const FLOW_SECTIONS = ['I', 'V', 'V2', 'PC', 'C', 'C2', 'B', 'O'] as const;
const FLOW_LABELS: Record<string, string> = {
  'I': '인트로',
  'V': '절',
  'V2': '2절',
  'PC': '프리코러스',
  'C': '코러스',
  'C2': '코러스2',
  'B': '브릿지',
  'O': '아웃트로',
};

interface SetlistItemProps {
  item: SetlistSong;
  index: number;
  onRemove: () => void;
  onKeyChange: (key: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onFlowChange?: (flow: string) => void;
  keyCompatibility?: '자연스러움' | '괜찮음' | '어색함';
}

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Generate MR search URL
const generateMRSearchUrl = (title: string, artist?: string): string => {
  const query = artist ? `${title} ${artist} MR` : `${title} MR 반주`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
};

// Generate sheet music search URL
const generateSheetSearchUrl = (title: string): string => {
  return `https://www.google.com/search?q=${encodeURIComponent(title + ' 악보')}`;
};

export function SetlistItem({
  item,
  index,
  onRemove,
  onKeyChange,
  onReorder,
  onFlowChange,
  keyCompatibility,
}: SetlistItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [flow, setFlow] = useState(item.flow || '');
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'SETLIST_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'SETLIST_ITEM',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        onReorder(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const compatibilityIcon = {
    '자연스러움': <CheckCircle className="w-4 h-4 text-green-500" />,
    '괜찮음': <AlertCircle className="w-4 h-4 text-yellow-500" />,
    '어색함': <AlertTriangle className="w-4 h-4 text-red-500" />,
  };

  const handleFlowChange = (newFlow: string) => {
    setFlow(newFlow);
    onFlowChange?.(newFlow);
  };

  // Add section to flow (allows duplicates like V-V-C)
  const handleAddSection = (section: string) => {
    const sections = flow ? flow.split('-') : [];
    sections.push(section);
    handleFlowChange(sections.join('-'));
  };

  // Remove last occurrence of a section from flow
  const handleRemoveLastSection = () => {
    const sections = flow ? flow.split('-') : [];
    if (sections.length > 0) {
      sections.pop();
      handleFlowChange(sections.join('-'));
    }
  };

  // Clear entire flow
  const handleClearFlow = () => {
    handleFlowChange('');
  };

  return (
    <div
      ref={(node) => {
        preview(drop(node));
      }}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-3',
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-95',
        isOver && 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Drag handle - touch-friendly size */}
        <div
          ref={drag}
          className="cursor-grab active:cursor-grabbing p-2 sm:p-1 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
        >
          <GripVertical className="w-5 h-5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Order number */}
        <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-sm font-medium flex items-center justify-center flex-shrink-0">
          {item.order}
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">
              {item.song?.title || `Song #${item.song_id}`}
            </p>
            {item.song?.youtube_url && (
              <span title="YouTube 재생 가능">
                <Youtube className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
            {item.song?.artist}
            {item.role && ` · ${item.role}`}
          </p>
        </div>

        {/* Key selector and controls - stacked on mobile */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {keyCompatibility && index > 0 && (
            <MusicTermTooltip term="transition" position="bottom">
              <div title={`이전 곡과의 전환: ${keyCompatibility}`} className="hidden sm:block cursor-help">
                {compatibilityIcon[keyCompatibility]}
              </div>
            </MusicTermTooltip>
          )}
          <MusicTermTooltip term="key" position="bottom">
            <select
              value={item.key}
              onChange={(e) => onKeyChange(e.target.value)}
              className="px-2 py-2 sm:py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] sm:min-h-0"
            >
              {KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </MusicTermTooltip>

          {/* Duration - hidden on very small screens */}
          {item.song?.duration_sec && (
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 tabular-nums hidden xs:inline">
              {Math.floor(item.song.duration_sec / 60)}:{(item.song.duration_sec % 60).toString().padStart(2, '0')}
            </span>
          )}

          {/* Expand/collapse button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 sm:p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 dark:text-gray-500 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label={expanded ? "접기" : "펼치기"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Remove button - touch-friendly */}
          <button
            onClick={onRemove}
            className="p-2 sm:p-1 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            aria-label="곡 삭제"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Key compatibility indicator on mobile */}
      {keyCompatibility && index > 0 && (
        <MusicTermTooltip term="transition" position="right">
          <div className="mt-2 ml-12 sm:hidden flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 cursor-help">
            {compatibilityIcon[keyCompatibility]}
            <span>이전 곡과의 전환: {keyCompatibility}</span>
          </div>
        </MusicTermTooltip>
      )}

      {/* Transition info */}
      {item.transition_chord_progression && (
        <MusicTermTooltip term="chord" position="right">
          <div className="mt-2 ml-12 sm:ml-14 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 cursor-help">
            전환: {item.transition_chord_progression}
          </div>
        </MusicTermTooltip>
      )}

      {/* Expanded section with links and flow settings */}
      {expanded && (
        <div className="mt-3 ml-12 sm:ml-14 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          {/* Quick action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* YouTube link */}
            {item.song?.youtube_url && (
              <a
                href={item.song.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                <Youtube className="w-4 h-4" />
                원곡 보기
              </a>
            )}

            {/* MR search */}
            <MusicTermTooltip term="mr" position="bottom">
              <a
                href={generateMRSearchUrl(item.song?.title || '', item.song?.artist)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-xs hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
              >
                <Music className="w-4 h-4" />
                MR 검색
              </a>
            </MusicTermTooltip>

            {/* Sheet music search */}
            <a
              href={generateSheetSearchUrl(item.song?.title || '')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              악보 검색
            </a>
          </div>

          {/* Song flow/structure settings */}
          <div>
            <MusicTermTooltip term="flow" position="right" showIndicator>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block cursor-help">
                곡 구성 (플로우) - 버튼을 클릭하여 순서대로 추가
              </label>
            </MusicTermTooltip>
            <div className="flex flex-wrap gap-1.5">
              {FLOW_SECTIONS.map((section) => (
                <button
                  key={section}
                  onClick={() => handleAddSection(section)}
                  className="px-2.5 py-1 rounded text-xs font-medium transition-colors bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:text-primary-600 dark:hover:text-primary-400 active:bg-primary-200 dark:active:bg-primary-900"
                  title={`${FLOW_LABELS[section]} 추가`}
                >
                  + {section}
                </button>
              ))}
            </div>
            {flow && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">현재:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {flow.split('-').map((section, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded text-xs font-mono"
                    >
                      {section}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleRemoveLastSection}
                  className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  title="마지막 섹션 삭제"
                >
                  ← 되돌리기
                </button>
                <button
                  onClick={handleClearFlow}
                  className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/50"
                  title="전체 삭제"
                >
                  초기화
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
