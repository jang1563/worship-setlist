/**
 * Guitar Chord Diagram Component
 *
 * Displays visual guitar chord diagrams with fret positions and finger placements.
 * Supports common chords used in worship music.
 */
import { useMemo } from 'react';

// Chord finger position data
// Format: [string1 (high E), string2 (B), string3 (G), string4 (D), string5 (A), string6 (low E)]
// Values: -1 = muted (X), 0 = open, 1-5 = fret number
// Finger: 0 = none, 1 = index, 2 = middle, 3 = ring, 4 = pinky

interface ChordData {
  positions: number[];
  fingers: number[];
  barreStart?: number;  // Barre chord start fret
  barreEnd?: number;    // Barre chord end string (1-6)
}

const CHORD_DATABASE: Record<string, ChordData> = {
  // Major chords
  'C': { positions: [0, 1, 0, 2, 3, -1], fingers: [0, 1, 0, 2, 3, 0] },
  'D': { positions: [2, 3, 2, 0, -1, -1], fingers: [1, 3, 2, 0, 0, 0] },
  'E': { positions: [0, 0, 1, 2, 2, 0], fingers: [0, 0, 1, 3, 2, 0] },
  'F': { positions: [1, 1, 2, 3, 3, 1], fingers: [1, 1, 2, 4, 3, 1], barreStart: 1, barreEnd: 6 },
  'G': { positions: [3, 0, 0, 0, 2, 3], fingers: [4, 0, 0, 0, 2, 3] },
  'A': { positions: [0, 2, 2, 2, 0, -1], fingers: [0, 2, 3, 4, 0, 0] },
  'B': { positions: [2, 4, 4, 4, 2, -1], fingers: [1, 3, 3, 3, 1, 0], barreStart: 2, barreEnd: 5 },

  // Minor chords
  'Cm': { positions: [3, 4, 5, 5, 3, -1], fingers: [1, 2, 4, 3, 1, 0], barreStart: 3, barreEnd: 5 },
  'Dm': { positions: [1, 3, 2, 0, -1, -1], fingers: [1, 3, 2, 0, 0, 0] },
  'Em': { positions: [0, 0, 0, 2, 2, 0], fingers: [0, 0, 0, 3, 2, 0] },
  'Fm': { positions: [1, 1, 1, 3, 3, 1], fingers: [1, 1, 1, 4, 3, 1], barreStart: 1, barreEnd: 6 },
  'Gm': { positions: [3, 3, 3, 5, 5, 3], fingers: [1, 1, 1, 4, 3, 1], barreStart: 3, barreEnd: 6 },
  'Am': { positions: [0, 1, 2, 2, 0, -1], fingers: [0, 1, 3, 2, 0, 0] },
  'Bm': { positions: [2, 3, 4, 4, 2, -1], fingers: [1, 2, 4, 3, 1, 0], barreStart: 2, barreEnd: 5 },

  // 7th chords
  'C7': { positions: [0, 1, 3, 2, 3, -1], fingers: [0, 1, 4, 2, 3, 0] },
  'D7': { positions: [2, 1, 2, 0, -1, -1], fingers: [3, 1, 2, 0, 0, 0] },
  'E7': { positions: [0, 0, 1, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0] },
  'G7': { positions: [1, 0, 0, 0, 2, 3], fingers: [1, 0, 0, 0, 2, 3] },
  'A7': { positions: [0, 2, 0, 2, 0, -1], fingers: [0, 2, 0, 3, 0, 0] },

  // Minor 7th chords
  'Am7': { positions: [0, 1, 0, 2, 0, -1], fingers: [0, 1, 0, 2, 0, 0] },
  'Dm7': { positions: [1, 1, 2, 0, -1, -1], fingers: [1, 1, 2, 0, 0, 0] },
  'Em7': { positions: [0, 0, 0, 0, 2, 0], fingers: [0, 0, 0, 0, 2, 0] },

  // Major 7th chords
  'Cmaj7': { positions: [0, 0, 0, 2, 3, -1], fingers: [0, 0, 0, 2, 3, 0] },
  'Dmaj7': { positions: [2, 2, 2, 0, -1, -1], fingers: [1, 2, 3, 0, 0, 0] },
  'Gmaj7': { positions: [2, 0, 0, 0, 2, 3], fingers: [2, 0, 0, 0, 1, 3] },
  'Amaj7': { positions: [0, 2, 1, 2, 0, -1], fingers: [0, 3, 1, 2, 0, 0] },

  // Sus chords
  'Dsus4': { positions: [3, 3, 2, 0, -1, -1], fingers: [3, 4, 1, 0, 0, 0] },
  'Dsus2': { positions: [0, 3, 2, 0, -1, -1], fingers: [0, 3, 2, 0, 0, 0] },
  'Asus4': { positions: [0, 3, 2, 2, 0, -1], fingers: [0, 4, 2, 3, 0, 0] },
  'Asus2': { positions: [0, 0, 2, 2, 0, -1], fingers: [0, 0, 2, 3, 0, 0] },
  'Esus4': { positions: [0, 0, 2, 2, 2, 0], fingers: [0, 0, 2, 3, 4, 0] },

  // Add chords
  'Cadd9': { positions: [0, 3, 0, 2, 3, -1], fingers: [0, 4, 0, 2, 3, 0] },
  'Gadd9': { positions: [3, 0, 2, 0, 0, 3], fingers: [3, 0, 2, 0, 0, 4] },

  // Sharp/Flat variations (mapped to enharmonic equivalents or shifted positions)
  'C#': { positions: [4, 6, 6, 6, 4, -1], fingers: [1, 3, 3, 3, 1, 0], barreStart: 4, barreEnd: 5 },
  'Db': { positions: [4, 6, 6, 6, 4, -1], fingers: [1, 3, 3, 3, 1, 0], barreStart: 4, barreEnd: 5 },
  'D#': { positions: [3, 4, 3, 1, -1, -1], fingers: [3, 4, 2, 1, 0, 0] },
  'Eb': { positions: [3, 4, 3, 1, -1, -1], fingers: [3, 4, 2, 1, 0, 0] },
  'F#': { positions: [2, 2, 3, 4, 4, 2], fingers: [1, 1, 2, 4, 3, 1], barreStart: 2, barreEnd: 6 },
  'Gb': { positions: [2, 2, 3, 4, 4, 2], fingers: [1, 1, 2, 4, 3, 1], barreStart: 2, barreEnd: 6 },
  'G#': { positions: [4, 4, 5, 6, 6, 4], fingers: [1, 1, 2, 4, 3, 1], barreStart: 4, barreEnd: 6 },
  'Ab': { positions: [4, 4, 5, 6, 6, 4], fingers: [1, 1, 2, 4, 3, 1], barreStart: 4, barreEnd: 6 },
  'A#': { positions: [1, 3, 3, 3, 1, -1], fingers: [1, 3, 3, 3, 1, 0], barreStart: 1, barreEnd: 5 },
  'Bb': { positions: [1, 3, 3, 3, 1, -1], fingers: [1, 3, 3, 3, 1, 0], barreStart: 1, barreEnd: 5 },

  // Minor sharps/flats
  'C#m': { positions: [4, 5, 6, 6, 4, -1], fingers: [1, 2, 4, 3, 1, 0], barreStart: 4, barreEnd: 5 },
  'Dbm': { positions: [4, 5, 6, 6, 4, -1], fingers: [1, 2, 4, 3, 1, 0], barreStart: 4, barreEnd: 5 },
  'Ebm': { positions: [6, 7, 8, 8, 6, -1], fingers: [1, 2, 4, 3, 1, 0], barreStart: 6, barreEnd: 5 },
  'F#m': { positions: [2, 2, 2, 4, 4, 2], fingers: [1, 1, 1, 4, 3, 1], barreStart: 2, barreEnd: 6 },
  'G#m': { positions: [4, 4, 4, 6, 6, 4], fingers: [1, 1, 1, 4, 3, 1], barreStart: 4, barreEnd: 6 },
  'Bbm': { positions: [1, 2, 3, 3, 1, -1], fingers: [1, 2, 4, 3, 1, 0], barreStart: 1, barreEnd: 5 },
};

// Get chord data, with fallback for unknown chords
function getChordData(chord: string): ChordData | null {
  // Direct match
  if (CHORD_DATABASE[chord]) {
    return CHORD_DATABASE[chord];
  }

  // Try without numbers (e.g., "C2" -> "C")
  const baseChord = chord.replace(/[0-9]/g, '');
  if (CHORD_DATABASE[baseChord]) {
    return CHORD_DATABASE[baseChord];
  }

  // Try root only
  const root = chord.match(/^([A-G][#b]?)/)?.[1];
  if (root && CHORD_DATABASE[root]) {
    return CHORD_DATABASE[root];
  }

  return null;
}

interface GuitarChordDiagramProps {
  chord: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showFingers?: boolean;
}

export function GuitarChordDiagram({
  chord,
  size = 'md',
  showName = true,
  showFingers = false
}: GuitarChordDiagramProps) {
  const chordData = useMemo(() => getChordData(chord), [chord]);

  // Size configurations
  const sizeConfig = {
    sm: { width: 60, height: 72, fretHeight: 12, stringSpacing: 10, dotSize: 6, fontSize: 10 },
    md: { width: 80, height: 96, fretHeight: 16, stringSpacing: 13, dotSize: 8, fontSize: 12 },
    lg: { width: 100, height: 120, fretHeight: 20, stringSpacing: 16, dotSize: 10, fontSize: 14 }
  };
  const cfg = sizeConfig[size];

  // If no chord data, show placeholder
  if (!chordData) {
    return (
      <div className="inline-flex flex-col items-center p-2">
        {showName && (
          <span className="font-mono font-semibold text-gray-600 dark:text-gray-300 mb-1" style={{ fontSize: cfg.fontSize }}>
            {chord}
          </span>
        )}
        <div
          className="border-2 border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-center"
          style={{ width: cfg.width, height: cfg.height }}
        >
          <span className="text-xs text-gray-400 dark:text-gray-500">?</span>
        </div>
      </div>
    );
  }

  const { positions, fingers, barreStart, barreEnd } = chordData;

  // Calculate fret range to display
  const nonZeroFrets = positions.filter(p => p > 0);
  const minFret = Math.min(...(nonZeroFrets.length ? nonZeroFrets : [1]));
  const startFret = minFret > 3 ? minFret : 1;

  // SVG dimensions
  const padding = 10;
  const nutHeight = startFret === 1 ? 4 : 0;
  const numFrets = 4;
  const totalWidth = cfg.width;
  const fretboardWidth = cfg.stringSpacing * 5;
  const xOffset = (totalWidth - fretboardWidth) / 2;

  return (
    <div className="inline-flex flex-col items-center p-1">
      {showName && (
        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200 mb-1" style={{ fontSize: cfg.fontSize }}>
          {chord}
        </span>
      )}

      <svg width={totalWidth} height={cfg.height} className="chord-diagram">
        {/* Nut (thick bar at top for open chords) */}
        {startFret === 1 && (
          <rect
            x={xOffset}
            y={padding}
            width={fretboardWidth}
            height={nutHeight}
            fill="#333"
          />
        )}

        {/* Fret number indicator for barre chords */}
        {startFret > 1 && (
          <text
            x={xOffset - 8}
            y={padding + cfg.fretHeight / 2 + 4}
            fontSize={10}
            fill="#666"
          >
            {startFret}
          </text>
        )}

        {/* Frets (horizontal lines) */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1={xOffset}
            y1={padding + nutHeight + i * cfg.fretHeight}
            x2={xOffset + fretboardWidth}
            y2={padding + nutHeight + i * cfg.fretHeight}
            stroke="#888"
            strokeWidth={i === 0 && startFret > 1 ? 2 : 1}
          />
        ))}

        {/* Strings (vertical lines) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`string-${i}`}
            x1={xOffset + i * cfg.stringSpacing}
            y1={padding}
            x2={xOffset + i * cfg.stringSpacing}
            y2={padding + nutHeight + numFrets * cfg.fretHeight}
            stroke="#333"
            strokeWidth={1 + (5 - i) * 0.15}
          />
        ))}

        {/* Barre indicator */}
        {barreStart !== undefined && barreEnd !== undefined && barreStart === startFret && (
          <rect
            x={xOffset - 2}
            y={padding + nutHeight + cfg.fretHeight / 2 - cfg.dotSize / 2}
            width={(6 - barreEnd + 1) * cfg.stringSpacing + 4}
            height={cfg.dotSize}
            rx={cfg.dotSize / 2}
            fill="#333"
          />
        )}

        {/* Finger positions */}
        {positions.map((fret, stringIndex) => {
          const x = xOffset + stringIndex * cfg.stringSpacing;

          if (fret === -1) {
            // Muted string (X)
            return (
              <text
                key={`mute-${stringIndex}`}
                x={x}
                y={padding - 2}
                fontSize={10}
                textAnchor="middle"
                fill="#666"
              >
                ×
              </text>
            );
          }

          if (fret === 0) {
            // Open string (O)
            return (
              <circle
                key={`open-${stringIndex}`}
                cx={x}
                cy={padding - 4}
                r={3}
                fill="none"
                stroke="#666"
                strokeWidth={1.5}
              />
            );
          }

          // Fretted note
          const displayFret = fret - startFret + 1;
          if (displayFret >= 1 && displayFret <= numFrets) {
            const y = padding + nutHeight + (displayFret - 0.5) * cfg.fretHeight;

            return (
              <g key={`finger-${stringIndex}`}>
                <circle
                  cx={x}
                  cy={y}
                  r={cfg.dotSize / 2}
                  fill="#333"
                />
                {showFingers && fingers[stringIndex] > 0 && (
                  <text
                    x={x}
                    y={y + 3}
                    fontSize={cfg.dotSize - 2}
                    textAnchor="middle"
                    fill="white"
                    fontWeight="bold"
                  >
                    {fingers[stringIndex]}
                  </text>
                )}
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
}

interface ChordDiagramGridProps {
  chords: string[];
  size?: 'sm' | 'md' | 'lg';
  showFingers?: boolean;
  columns?: number;
}

export function ChordDiagramGrid({
  chords,
  size = 'md',
  showFingers = false,
  columns = 4
}: ChordDiagramGridProps) {
  // Remove duplicates while preserving order
  const uniqueChords = useMemo(() => {
    const seen = new Set<string>();
    return chords.filter(chord => {
      if (seen.has(chord)) return false;
      seen.add(chord);
      return true;
    });
  }, [chords]);

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {uniqueChords.map((chord, index) => (
        <GuitarChordDiagram
          key={`${chord}-${index}`}
          chord={chord}
          size={size}
          showFingers={showFingers}
        />
      ))}
    </div>
  );
}

// Simple piano chord diagram
interface PianoChordDiagramProps {
  chord: string;
  showName?: boolean;
}

// Piano key patterns for common chords (MIDI note offsets from C)
const PIANO_CHORD_PATTERNS: Record<string, number[]> = {
  'C': [0, 4, 7],       // C E G
  'Cm': [0, 3, 7],      // C Eb G
  'C7': [0, 4, 7, 10],  // C E G Bb
  'Cmaj7': [0, 4, 7, 11], // C E G B
  'Cm7': [0, 3, 7, 10], // C Eb G Bb
  'D': [2, 6, 9],       // D F# A
  'Dm': [2, 5, 9],      // D F A
  'E': [4, 8, 11],      // E G# B
  'Em': [4, 7, 11],     // E G B
  'F': [5, 9, 12],      // F A C
  'Fm': [5, 8, 12],     // F Ab C
  'G': [7, 11, 14],     // G B D
  'Gm': [7, 10, 14],    // G Bb D
  'A': [9, 13, 16],     // A C# E
  'Am': [9, 12, 16],    // A C E
  'B': [11, 15, 18],    // B D# F#
  'Bm': [11, 14, 18],   // B D F#
};

export function PianoChordDiagram({ chord, showName = true }: PianoChordDiagramProps) {
  const whiteKeyWidth = 14;
  const whiteKeyHeight = 48;
  const blackKeyWidth = 10;
  const blackKeyHeight = 30;
  const numOctaves = 2;
  const totalWhiteKeys = 7 * numOctaves;

  // Get chord notes
  const baseChord = chord.replace(/[0-9]/g, '');
  const pattern = PIANO_CHORD_PATTERNS[baseChord] || PIANO_CHORD_PATTERNS['C'];

  // Map note to white/black key
  const isBlackKey = (note: number) => [1, 3, 6, 8, 10].includes(note % 12);

  // Calculate key positions
  const getKeyX = (note: number) => {
    const octave = Math.floor(note / 12);
    const noteInOctave = note % 12;
    const whiteKeyIndex = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6][noteInOctave];
    const isBlack = isBlackKey(note);

    if (isBlack) {
      const blackOffsets = [0, 1, 0, 3, 0, 0, 4, 0, 5, 0, 6, 0];
      return octave * 7 * whiteKeyWidth + blackOffsets[noteInOctave] * whiteKeyWidth + whiteKeyWidth - blackKeyWidth / 2;
    }

    return octave * 7 * whiteKeyWidth + whiteKeyIndex * whiteKeyWidth;
  };

  return (
    <div className="inline-flex flex-col items-center p-2">
      {showName && (
        <span className="font-mono font-semibold text-gray-800 dark:text-gray-200 mb-1 text-sm">
          {chord}
        </span>
      )}
      <svg
        width={totalWhiteKeys * whiteKeyWidth}
        height={whiteKeyHeight + 4}
        className="piano-diagram"
      >
        {/* White keys */}
        {Array.from({ length: totalWhiteKeys }).map((_, i) => (
          <rect
            key={`white-${i}`}
            x={i * whiteKeyWidth}
            y={0}
            width={whiteKeyWidth - 1}
            height={whiteKeyHeight}
            fill={pattern.some(n => !isBlackKey(n) && getKeyX(n) === i * whiteKeyWidth) ? '#3b82f6' : 'white'}
            stroke="#333"
            strokeWidth={0.5}
          />
        ))}

        {/* Black keys */}
        {Array.from({ length: numOctaves }).map((_, octave) =>
          [1, 3, 6, 8, 10].map(noteOffset => {
            const note = octave * 12 + noteOffset;
            const x = getKeyX(note);
            const isPressed = pattern.includes(note);

            return (
              <rect
                key={`black-${octave}-${noteOffset}`}
                x={x}
                y={0}
                width={blackKeyWidth}
                height={blackKeyHeight}
                fill={isPressed ? '#1d4ed8' : '#333'}
                stroke="#000"
                strokeWidth={0.5}
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
