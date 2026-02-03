import { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { chordToMidiNotes } from '@/utils/chordToNotes';

interface ChordPlayerProps {
  chords?: string[];
  bpm?: number;
  className?: string;
  onChordChange?: (index: number, chord: string) => void;
}

type InstrumentType = 'piano' | 'guitar' | 'pad';

const INSTRUMENT_SETTINGS: Record<InstrumentType, { attack: number; decay: number; sustain: number; release: number }> = {
  piano: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.8 },
  guitar: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 1.0 },
  pad: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 2.0 },
};

export function ChordPlayer({
  chords = [],
  bpm = 120,
  className = '',
  onChordChange,
}: ChordPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(-1);
  const [currentBpm, setCurrentBpm] = useState(bpm);
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [volume, setVolume] = useState(-6); // dB
  const [isLooping, setIsLooping] = useState(true);
  const [beatsPerChord, setBeatsPerChord] = useState(4);

  const synthRef = useRef<Tone.PolySynth | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize Tone.js
  const initAudio = useCallback(async () => {
    if (isInitializedRef.current) return;

    await Tone.start();

    // Create polyphonic synth
    const settings = INSTRUMENT_SETTINGS[instrument];
    synthRef.current = new Tone.PolySynth(Tone.Synth, {
      envelope: settings,
      oscillator: {
        type: instrument === 'pad' ? 'sine' : instrument === 'guitar' ? 'triangle' : 'triangle',
      },
    }).toDestination();

    synthRef.current.volume.value = volume;
    isInitializedRef.current = true;
  }, [instrument, volume]);

  // Update synth settings when instrument changes
  useEffect(() => {
    if (!synthRef.current) return;

    const settings = INSTRUMENT_SETTINGS[instrument];
    synthRef.current.set({
      envelope: settings,
      oscillator: {
        type: instrument === 'pad' ? 'sine' : instrument === 'guitar' ? 'triangle' : 'triangle',
      },
    });
  }, [instrument]);

  // Update volume
  useEffect(() => {
    if (synthRef.current) {
      synthRef.current.volume.value = volume;
    }
  }, [volume]);

  // Create or update sequence when chords change
  useEffect(() => {
    if (!isInitializedRef.current || chords.length === 0) return;

    // Clear existing sequence
    if (sequenceRef.current) {
      sequenceRef.current.dispose();
    }

    // Create new sequence
    sequenceRef.current = new Tone.Sequence(
      (time, chordIndex) => {
        if (typeof chordIndex !== 'number') return;

        const chord = chords[chordIndex];
        if (!chord) return;

        // Get MIDI notes for this chord
        const { noteNames } = chordToMidiNotes(chord, 3);

        // Play the chord
        if (synthRef.current) {
          // Release any currently playing notes
          synthRef.current.releaseAll(time);

          // Trigger new chord
          synthRef.current.triggerAttackRelease(
            noteNames,
            `${beatsPerChord}n`,
            time
          );
        }

        // Update UI
        Tone.Draw.schedule(() => {
          setCurrentChordIndex(chordIndex);
          onChordChange?.(chordIndex, chord);
        }, time);
      },
      chords.map((_, i) => i),
      `${beatsPerChord}n`
    );

    sequenceRef.current.loop = isLooping;

    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }
    };
  }, [chords, currentBpm, beatsPerChord, isLooping, onChordChange]);

  // Update BPM
  useEffect(() => {
    Tone.Transport.bpm.value = currentBpm;
  }, [currentBpm]);

  // Start playback
  const handlePlay = async () => {
    await initAudio();

    if (chords.length === 0) return;

    if (sequenceRef.current) {
      sequenceRef.current.start(0);
    }

    Tone.Transport.start();
    setIsPlaying(true);
    setCurrentChordIndex(0);
  };

  // Stop playback
  const handleStop = () => {
    Tone.Transport.stop();
    Tone.Transport.position = 0;

    if (synthRef.current) {
      synthRef.current.releaseAll();
    }

    setIsPlaying(false);
    setCurrentChordIndex(-1);
  };

  // Pause playback
  const handlePause = () => {
    Tone.Transport.pause();
    setIsPlaying(false);
  };

  // Play single chord
  const playChord = async (chord: string) => {
    await initAudio();

    const { noteNames } = chordToMidiNotes(chord, 3);

    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.triggerAttackRelease(noteNames, '2n');
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
      }
      if (synthRef.current) {
        synthRef.current.dispose();
      }
      Tone.Transport.stop();
    };
  }, []);

  return (
    <div className={`flex flex-col gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            MIDI 연습 가이드
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {chords.length}개 코드
          </span>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleStop}
          disabled={!isPlaying && currentChordIndex === -1}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
          title="정지"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" />
          </svg>
        </button>

        <button
          onClick={isPlaying ? handlePause : handlePlay}
          disabled={chords.length === 0}
          className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full disabled:opacity-50 shadow-lg"
          title={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`p-2 rounded-lg transition-colors ${
            isLooping
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
          }`}
          title="반복"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Chord Display */}
      {chords.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center py-2">
          {chords.map((chord, index) => (
            <button
              key={index}
              onClick={() => playChord(chord)}
              className={`px-3 py-2 rounded-lg text-sm font-mono font-medium transition-all ${
                currentChordIndex === index
                  ? 'bg-indigo-600 text-white scale-110 shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {chord}
            </button>
          ))}
        </div>
      )}

      {chords.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          코드가 없습니다. 코드 악보를 추가해주세요.
        </div>
      )}

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4">
        {/* BPM */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">BPM</label>
            <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{currentBpm}</span>
          </div>
          <input
            type="range"
            min="40"
            max="200"
            value={currentBpm}
            onChange={(e) => setCurrentBpm(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>40</span>
            <span>120</span>
            <span>200</span>
          </div>
        </div>

        {/* Volume */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500">볼륨</label>
            <span className="text-xs font-mono text-gray-700 dark:text-gray-300">{volume}dB</span>
          </div>
          <input
            type="range"
            min="-24"
            max="0"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {/* Instrument & Beats per Chord */}
      <div className="grid grid-cols-2 gap-4">
        {/* Instrument */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500">악기</label>
          <div className="flex gap-1">
            {(['piano', 'guitar', 'pad'] as InstrumentType[]).map((inst) => (
              <button
                key={inst}
                onClick={() => setInstrument(inst)}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                  instrument === inst
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {inst === 'piano' ? '피아노' : inst === 'guitar' ? '기타' : '패드'}
              </button>
            ))}
          </div>
        </div>

        {/* Beats per Chord */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500">코드당 박자</label>
          <div className="flex gap-1">
            {[2, 4, 8].map((beats) => (
              <button
                key={beats}
                onClick={() => setBeatsPerChord(beats)}
                className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                  beatsPerChord === beats
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {beats}박
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current chord info */}
      {currentChordIndex >= 0 && chords[currentChordIndex] && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
          <span className="font-medium">현재: </span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400">
            {chords[currentChordIndex]}
          </span>
          <span className="text-xs text-gray-400 ml-2">
            ({chordToMidiNotes(chords[currentChordIndex], 3).noteNames.join(', ')})
          </span>
        </div>
      )}
    </div>
  );
}

export default ChordPlayer;
