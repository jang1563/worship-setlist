/**
 * Utility for converting chord names to MIDI notes
 */

// Note name to MIDI number (C4 = 60)
const NOTE_TO_MIDI: Record<string, number> = {
  'C': 60, 'C#': 61, 'Db': 61,
  'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64, 'Fb': 64,
  'F': 65, 'F#': 66, 'Gb': 66,
  'G': 67, 'G#': 68, 'Ab': 68,
  'A': 69, 'A#': 70, 'Bb': 70,
  'B': 71, 'Cb': 71,
};

// Chord intervals (semitones from root)
const CHORD_INTERVALS: Record<string, number[]> = {
  // Major chords
  '': [0, 4, 7],           // Major
  'maj': [0, 4, 7],
  'M': [0, 4, 7],

  // Minor chords
  'm': [0, 3, 7],
  'min': [0, 3, 7],

  // Seventh chords
  '7': [0, 4, 7, 10],      // Dominant 7th
  'maj7': [0, 4, 7, 11],   // Major 7th
  'M7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],     // Minor 7th
  'min7': [0, 3, 7, 10],
  'dim7': [0, 3, 6, 9],    // Diminished 7th

  // Other chords
  'dim': [0, 3, 6],        // Diminished
  'aug': [0, 4, 8],        // Augmented
  'sus2': [0, 2, 7],       // Suspended 2nd
  'sus4': [0, 5, 7],       // Suspended 4th
  'sus': [0, 5, 7],
  'add9': [0, 4, 7, 14],   // Add 9
  '9': [0, 4, 7, 10, 14],  // Dominant 9th
  '6': [0, 4, 7, 9],       // 6th
  'm6': [0, 3, 7, 9],      // Minor 6th

  // Extended chords
  '11': [0, 4, 7, 10, 14, 17],
  '13': [0, 4, 7, 10, 14, 21],
  'maj9': [0, 4, 7, 11, 14],
  'm9': [0, 3, 7, 10, 14],
};

export interface ChordNotes {
  root: string;
  quality: string;
  bass?: string;
  midiNotes: number[];
  noteNames: string[];
}

/**
 * Parse a chord name and return its components
 * Examples: "Am7" -> { root: "A", quality: "m7" }
 *           "C#dim" -> { root: "C#", quality: "dim" }
 *           "G/B" -> { root: "G", quality: "", bass: "B" }
 */
export function parseChord(chord: string): { root: string; quality: string; bass?: string } {
  // Handle slash chords (e.g., "G/B")
  const [mainChord, bass] = chord.split('/');

  // Extract root note (with optional sharp/flat)
  const rootMatch = mainChord.match(/^([A-Ga-g][#b]?)/);
  if (!rootMatch) {
    return { root: 'C', quality: '' };
  }

  const root = rootMatch[1].charAt(0).toUpperCase() + rootMatch[1].slice(1);
  const quality = mainChord.slice(rootMatch[0].length);

  return { root, quality, bass };
}

/**
 * Convert a chord name to MIDI note numbers
 * @param chord - Chord name (e.g., "Am7", "C#dim", "G/B")
 * @param octave - Base octave (default: 4)
 * @returns Array of MIDI note numbers
 */
export function chordToMidiNotes(chord: string, octave: number = 4): ChordNotes {
  const { root, quality, bass } = parseChord(chord);

  // Get root note MIDI number
  const rootMidi = NOTE_TO_MIDI[root];
  if (rootMidi === undefined) {
    return { root, quality, midiNotes: [60, 64, 67], noteNames: ['C4', 'E4', 'G4'] };
  }

  // Adjust for octave (MIDI 60 = C4)
  const octaveAdjust = (octave - 4) * 12;
  const baseMidi = rootMidi + octaveAdjust;

  // Get intervals for this chord quality
  const intervals = CHORD_INTERVALS[quality] || CHORD_INTERVALS[''];

  // Calculate MIDI notes
  let midiNotes = intervals.map(interval => baseMidi + interval);

  // Handle bass note for slash chords
  if (bass) {
    const bassMidi = NOTE_TO_MIDI[bass.charAt(0).toUpperCase() + bass.slice(1)];
    if (bassMidi !== undefined) {
      // Add bass note one octave below
      const bassNote = bassMidi + octaveAdjust - 12;
      midiNotes = [bassNote, ...midiNotes];
    }
  }

  // Convert MIDI numbers back to note names for display
  const noteNames = midiNotes.map(midi => {
    const noteIndex = midi % 12;
    const noteOctave = Math.floor(midi / 12) - 1;
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return `${notes[noteIndex]}${noteOctave}`;
  });

  return { root, quality, bass, midiNotes, noteNames };
}

/**
 * Convert MIDI note number to frequency (Hz)
 * A4 = 440Hz = MIDI 69
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Convert MIDI note number to note name
 */
export function midiToNoteName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${notes[noteIndex]}${octave}`;
}

/**
 * Get all notes for a chord progression
 */
export function progressionToNotes(chords: string[], octave: number = 3): ChordNotes[] {
  return chords.map(chord => chordToMidiNotes(chord, octave));
}
