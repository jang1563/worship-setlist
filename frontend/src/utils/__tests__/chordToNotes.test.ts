import { describe, it, expect } from 'vitest'
import {
  parseChord,
  chordToMidiNotes,
  midiToFrequency,
  midiToNoteName,
  progressionToNotes,
} from '../chordToNotes'

describe('parseChord', () => {
  it('should parse major chords', () => {
    expect(parseChord('C')).toEqual({ root: 'C', quality: '', bass: undefined })
    expect(parseChord('G')).toEqual({ root: 'G', quality: '', bass: undefined })
    expect(parseChord('D')).toEqual({ root: 'D', quality: '', bass: undefined })
  })

  it('should parse minor chords', () => {
    expect(parseChord('Am')).toEqual({ root: 'A', quality: 'm', bass: undefined })
    expect(parseChord('Em')).toEqual({ root: 'E', quality: 'm', bass: undefined })
    expect(parseChord('Dm')).toEqual({ root: 'D', quality: 'm', bass: undefined })
  })

  it('should parse seventh chords', () => {
    expect(parseChord('G7')).toEqual({ root: 'G', quality: '7', bass: undefined })
    expect(parseChord('Cmaj7')).toEqual({ root: 'C', quality: 'maj7', bass: undefined })
    expect(parseChord('Am7')).toEqual({ root: 'A', quality: 'm7', bass: undefined })
    expect(parseChord('Dm7')).toEqual({ root: 'D', quality: 'm7', bass: undefined })
  })

  it('should parse chords with sharps', () => {
    expect(parseChord('C#')).toEqual({ root: 'C#', quality: '', bass: undefined })
    expect(parseChord('F#m')).toEqual({ root: 'F#', quality: 'm', bass: undefined })
    expect(parseChord('G#m7')).toEqual({ root: 'G#', quality: 'm7', bass: undefined })
  })

  it('should parse chords with flats', () => {
    expect(parseChord('Bb')).toEqual({ root: 'Bb', quality: '', bass: undefined })
    expect(parseChord('Ebm')).toEqual({ root: 'Eb', quality: 'm', bass: undefined })
    expect(parseChord('Abmaj7')).toEqual({ root: 'Ab', quality: 'maj7', bass: undefined })
  })

  it('should parse slash chords', () => {
    expect(parseChord('C/E')).toEqual({ root: 'C', quality: '', bass: 'E' })
    expect(parseChord('G/B')).toEqual({ root: 'G', quality: '', bass: 'B' })
    expect(parseChord('Am/G')).toEqual({ root: 'A', quality: 'm', bass: 'G' })
    expect(parseChord('D/F#')).toEqual({ root: 'D', quality: '', bass: 'F#' })
  })

  it('should parse suspended chords', () => {
    expect(parseChord('Dsus4')).toEqual({ root: 'D', quality: 'sus4', bass: undefined })
    expect(parseChord('Asus2')).toEqual({ root: 'A', quality: 'sus2', bass: undefined })
    expect(parseChord('Gsus')).toEqual({ root: 'G', quality: 'sus', bass: undefined })
  })

  it('should parse diminished and augmented chords', () => {
    expect(parseChord('Bdim')).toEqual({ root: 'B', quality: 'dim', bass: undefined })
    expect(parseChord('Caug')).toEqual({ root: 'C', quality: 'aug', bass: undefined })
    expect(parseChord('F#dim7')).toEqual({ root: 'F#', quality: 'dim7', bass: undefined })
  })

  it('should handle lowercase root notes', () => {
    expect(parseChord('c')).toEqual({ root: 'C', quality: '', bass: undefined })
    expect(parseChord('am')).toEqual({ root: 'A', quality: 'm', bass: undefined })
  })

  it('should return default for invalid input', () => {
    expect(parseChord('')).toEqual({ root: 'C', quality: '' })
    expect(parseChord('123')).toEqual({ root: 'C', quality: '' })
  })
})

describe('chordToMidiNotes', () => {
  describe('major chords', () => {
    it('should return correct MIDI notes for C major at octave 4', () => {
      const result = chordToMidiNotes('C', 4)
      expect(result.midiNotes).toEqual([60, 64, 67]) // C4, E4, G4
      expect(result.noteNames).toEqual(['C4', 'E4', 'G4'])
      expect(result.root).toBe('C')
      expect(result.quality).toBe('')
    })

    it('should return correct MIDI notes for G major', () => {
      const result = chordToMidiNotes('G', 4)
      expect(result.midiNotes).toEqual([67, 71, 74]) // G4, B4, D5
      expect(result.noteNames).toEqual(['G4', 'B4', 'D5'])
    })

    it('should return correct MIDI notes for D major', () => {
      const result = chordToMidiNotes('D', 4)
      expect(result.midiNotes).toEqual([62, 66, 69]) // D4, F#4, A4
    })
  })

  describe('minor chords', () => {
    it('should return correct MIDI notes for Am', () => {
      const result = chordToMidiNotes('Am', 4)
      expect(result.midiNotes).toEqual([69, 72, 76]) // A4, C5, E5
      expect(result.quality).toBe('m')
    })

    it('should return correct MIDI notes for Em', () => {
      const result = chordToMidiNotes('Em', 4)
      expect(result.midiNotes).toEqual([64, 67, 71]) // E4, G4, B4
    })
  })

  describe('seventh chords', () => {
    it('should return correct MIDI notes for G7 (dominant 7th)', () => {
      const result = chordToMidiNotes('G7', 4)
      expect(result.midiNotes).toEqual([67, 71, 74, 77]) // G4, B4, D5, F5
      expect(result.midiNotes.length).toBe(4)
    })

    it('should return correct MIDI notes for Cmaj7', () => {
      const result = chordToMidiNotes('Cmaj7', 4)
      expect(result.midiNotes).toEqual([60, 64, 67, 71]) // C4, E4, G4, B4
    })

    it('should return correct MIDI notes for Am7', () => {
      const result = chordToMidiNotes('Am7', 4)
      expect(result.midiNotes).toEqual([69, 72, 76, 79]) // A4, C5, E5, G5
    })
  })

  describe('slash chords', () => {
    it('should include bass note one octave below for C/E', () => {
      const result = chordToMidiNotes('C/E', 4)
      // E3 (52), then C4 (60), E4 (64), G4 (67)
      expect(result.midiNotes).toEqual([52, 60, 64, 67])
      expect(result.noteNames[0]).toBe('E3')
      expect(result.bass).toBe('E')
    })

    it('should include bass note for G/B', () => {
      const result = chordToMidiNotes('G/B', 4)
      // B3 (59), then G4 (67), B4 (71), D5 (74)
      expect(result.midiNotes).toEqual([59, 67, 71, 74])
    })
  })

  describe('octave adjustment', () => {
    it('should adjust notes for octave 3', () => {
      const result = chordToMidiNotes('C', 3)
      expect(result.midiNotes).toEqual([48, 52, 55]) // C3, E3, G3
      expect(result.noteNames).toEqual(['C3', 'E3', 'G3'])
    })

    it('should adjust notes for octave 5', () => {
      const result = chordToMidiNotes('C', 5)
      expect(result.midiNotes).toEqual([72, 76, 79]) // C5, E5, G5
    })
  })

  describe('other chord types', () => {
    it('should return correct notes for sus4', () => {
      const result = chordToMidiNotes('Dsus4', 4)
      expect(result.midiNotes).toEqual([62, 67, 69]) // D4, G4, A4
    })

    it('should return correct notes for sus2', () => {
      const result = chordToMidiNotes('Asus2', 4)
      expect(result.midiNotes).toEqual([69, 71, 76]) // A4, B4, E5
    })

    it('should return correct notes for dim', () => {
      const result = chordToMidiNotes('Bdim', 4)
      expect(result.midiNotes).toEqual([71, 74, 77]) // B4, D5, F5
    })

    it('should return correct notes for aug', () => {
      const result = chordToMidiNotes('Caug', 4)
      expect(result.midiNotes).toEqual([60, 64, 68]) // C4, E4, G#4
    })
  })

  it('should fallback to C major for unknown chord', () => {
    const result = chordToMidiNotes('XYZ', 4)
    expect(result.midiNotes).toEqual([60, 64, 67])
    expect(result.noteNames).toEqual(['C4', 'E4', 'G4'])
  })
})

describe('midiToFrequency', () => {
  it('should return 440Hz for A4 (MIDI 69)', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 2)
  })

  it('should return correct frequency for middle C (MIDI 60)', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1)
  })

  it('should double frequency for octave increase', () => {
    const a4 = midiToFrequency(69)
    const a5 = midiToFrequency(81)
    expect(a5 / a4).toBeCloseTo(2, 5)
  })

  it('should halve frequency for octave decrease', () => {
    const a4 = midiToFrequency(69)
    const a3 = midiToFrequency(57)
    expect(a4 / a3).toBeCloseTo(2, 5)
  })
})

describe('midiToNoteName', () => {
  it('should return correct note names', () => {
    expect(midiToNoteName(60)).toBe('C4')
    expect(midiToNoteName(69)).toBe('A4')
    expect(midiToNoteName(72)).toBe('C5')
    expect(midiToNoteName(48)).toBe('C3')
  })

  it('should handle sharp notes', () => {
    expect(midiToNoteName(61)).toBe('C#4')
    expect(midiToNoteName(63)).toBe('D#4')
    expect(midiToNoteName(66)).toBe('F#4')
  })

  it('should handle notes across octaves', () => {
    expect(midiToNoteName(0)).toBe('C-1')
    expect(midiToNoteName(12)).toBe('C0')
    expect(midiToNoteName(24)).toBe('C1')
    expect(midiToNoteName(127)).toBe('G9')
  })
})

describe('progressionToNotes', () => {
  it('should convert a chord progression to notes', () => {
    const progression = ['C', 'G', 'Am', 'F']
    const result = progressionToNotes(progression, 3)

    expect(result.length).toBe(4)
    expect(result[0].root).toBe('C')
    expect(result[1].root).toBe('G')
    expect(result[2].root).toBe('A')
    expect(result[3].root).toBe('F')
  })

  it('should use default octave 3', () => {
    const progression = ['C']
    const result = progressionToNotes(progression)

    expect(result[0].midiNotes).toEqual([48, 52, 55]) // C3, E3, G3
  })

  it('should handle complex progressions', () => {
    const progression = ['Am7', 'Dm7', 'G7', 'Cmaj7']
    const result = progressionToNotes(progression, 4)

    expect(result.every(chord => chord.midiNotes.length === 4)).toBe(true)
  })

  it('should handle empty progression', () => {
    const result = progressionToNotes([])
    expect(result).toEqual([])
  })
})

describe('Korean CCM common chord progressions', () => {
  it('should handle typical worship key of G', () => {
    const progression = ['G', 'D/F#', 'Em', 'C', 'G/B', 'Am7', 'D']
    const result = progressionToNotes(progression, 4)

    expect(result[0].root).toBe('G')
    expect(result[1].bass).toBe('F#')
    expect(result[2].quality).toBe('m')
    expect(result[4].bass).toBe('B')
    expect(result[5].quality).toBe('m7')
  })

  it('should handle typical worship key of D', () => {
    const progression = ['D', 'A/C#', 'Bm', 'G', 'D/A', 'A', 'D']
    const result = progressionToNotes(progression, 4)

    expect(result[0].root).toBe('D')
    expect(result[1].bass).toBe('C#')
    expect(result[2].quality).toBe('m')
    expect(result[4].bass).toBe('A')
  })
})
