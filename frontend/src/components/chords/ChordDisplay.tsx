import { useMemo } from 'react';

interface ChordDisplayProps {
  html?: string;
  chordpro?: string;
  chords?: string[];
  showChordColors?: boolean;
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
}

// Color mapping for chord roots
const CHORD_COLORS: Record<string, string> = {
  'C': 'text-red-600',
  'D': 'text-orange-600',
  'E': 'text-yellow-600',
  'F': 'text-green-600',
  'G': 'text-teal-600',
  'A': 'text-blue-600',
  'B': 'text-purple-600',
};

const FONT_SIZE_MAP = {
  'sm': 'text-sm',
  'base': 'text-base',
  'lg': 'text-lg',
  'xl': 'text-xl'
};

/**
 * Extract the root note from a chord (e.g., "Am7" -> "A", "C#m" -> "C")
 */
function getChordRoot(chord: string): string {
  const match = chord.match(/^([A-Ga-g])/);
  return match ? match[1].toUpperCase() : 'C';
}

/**
 * Get the color class for a chord based on its root
 */
function getChordColor(chord: string): string {
  const root = getChordRoot(chord);
  return CHORD_COLORS[root] || 'text-primary-600';
}

/**
 * Parse ChordPro content into renderable segments
 */
interface ChordSegment {
  chord?: string;
  lyric: string;
}

interface ParsedLine {
  segments: ChordSegment[];
  isEmpty: boolean;
}

function parseChordPro(content: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  const chordPattern = /\[([^\]]+)\]/g;

  for (const line of content.split('\n')) {
    // Skip directive lines
    if (line.trim().startsWith('{')) {
      continue;
    }

    const segments: ChordSegment[] = [];
    let lastIndex = 0;
    let match;

    while ((match = chordPattern.exec(line)) !== null) {
      // Text before this chord
      const textBefore = line.slice(lastIndex, match.index);
      if (textBefore || segments.length > 0) {
        if (segments.length > 0 && !segments[segments.length - 1].chord) {
          // Append to previous lyric-only segment
          segments[segments.length - 1].lyric += textBefore;
        } else if (textBefore) {
          segments.push({ lyric: textBefore });
        }
      }

      // Add chord segment
      segments.push({ chord: match[1], lyric: '' });
      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last chord
    const remaining = line.slice(lastIndex);
    if (segments.length > 0) {
      segments[segments.length - 1].lyric += remaining;
    } else if (remaining) {
      segments.push({ lyric: remaining });
    }

    lines.push({
      segments,
      isEmpty: segments.length === 0 || (segments.length === 1 && !segments[0].chord && !segments[0].lyric.trim())
    });
  }

  return lines;
}

export function ChordDisplay({
  html,
  chordpro,
  chords = [],
  showChordColors = true,
  fontSize = 'base'
}: ChordDisplayProps) {
  // Parse ChordPro content if HTML is not provided
  const parsedLines = useMemo(() => {
    if (chordpro) {
      return parseChordPro(chordpro);
    }
    return null;
  }, [chordpro]);

  const fontSizeClass = FONT_SIZE_MAP[fontSize];

  // Render from HTML
  if (html) {
    return (
      <div className={`chord-display ${fontSizeClass}`}>
        <style>{`
          .chord-display .chord-line {
            margin-bottom: 0.75rem;
            line-height: 2;
            display: flex;
            flex-wrap: wrap;
          }
          .chord-display .chord-line.empty {
            height: 1.5rem;
          }
          .chord-display .chord-segment {
            display: inline-flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .chord-display .chord {
            font-weight: 600;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
            margin-bottom: -0.25rem;
            min-height: 1.25em;
          }
          .chord-display .lyric {
            white-space: pre;
          }
        `}</style>
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className="font-korean"
        />

        {/* Chord legend */}
        {chords.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Chords in this song:</div>
            <div className="flex flex-wrap gap-2">
              {chords.map((chord, index) => (
                <span
                  key={index}
                  className={`
                    px-3 py-1 rounded-full text-sm font-mono font-semibold
                    ${showChordColors ? getChordColor(chord) : 'text-primary-700'}
                    bg-gray-100
                  `}
                >
                  {chord}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render from parsed ChordPro
  if (parsedLines) {
    return (
      <div className={`chord-display ${fontSizeClass}`}>
        {parsedLines.map((line, lineIndex) => (
          <div
            key={lineIndex}
            className={`mb-3 ${line.isEmpty ? 'h-4' : ''}`}
          >
            {line.segments.map((segment, segIndex) => (
              <span
                key={segIndex}
                className="inline-flex flex-col items-start"
              >
                {segment.chord && (
                  <span
                    className={`
                      font-semibold font-mono text-sm
                      ${showChordColors ? getChordColor(segment.chord) : 'text-primary-700'}
                    `}
                  >
                    {segment.chord}
                  </span>
                )}
                <span className="whitespace-pre">{segment.lyric}</span>
              </span>
            ))}
          </div>
        ))}

        {/* Chord legend */}
        {chords.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600 mb-2">Chords in this song:</div>
            <div className="flex flex-wrap gap-2">
              {chords.map((chord, index) => (
                <span
                  key={index}
                  className={`
                    px-3 py-1 rounded-full text-sm font-mono font-semibold
                    ${showChordColors ? getChordColor(chord) : 'text-primary-700'}
                    bg-gray-100
                  `}
                >
                  {chord}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Empty state
  return (
    <div className="text-gray-400 text-center py-8">
      No chord content to display
    </div>
  );
}

/**
 * Chord diagram component for showing finger positions
 * (Can be expanded later with actual diagrams)
 */
interface ChordDiagramProps {
  chord: string;
  showName?: boolean;
}

export function ChordDiagram({ chord, showName = true }: ChordDiagramProps) {
  const color = getChordColor(chord);

  return (
    <div className="inline-flex flex-col items-center p-2">
      {showName && (
        <span className={`font-mono font-semibold ${color} mb-1`}>
          {chord}
        </span>
      )}
      <div className="w-12 h-14 border-2 border-gray-400 rounded bg-gray-50 flex items-center justify-center">
        <span className="text-xs text-gray-400">Diagram</span>
      </div>
    </div>
  );
}

/**
 * Inline chord badge component
 */
interface ChordBadgeProps {
  chord: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function ChordBadge({ chord, onClick, isActive = false }: ChordBadgeProps) {
  const color = getChordColor(chord);

  return (
    <button
      onClick={onClick}
      className={`
        px-2 py-0.5 rounded font-mono text-sm font-semibold
        transition-colors
        ${isActive ? 'ring-2 ring-primary-500' : ''}
        ${onClick ? 'cursor-pointer hover:bg-gray-200' : 'cursor-default'}
        ${color} bg-gray-100
      `}
    >
      {chord}
    </button>
  );
}
