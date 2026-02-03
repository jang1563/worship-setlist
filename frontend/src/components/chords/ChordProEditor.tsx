import { useState, useCallback, useEffect, useMemo } from 'react';
import { Music, RefreshCw, Eye, Edit2, AlertCircle, Check, Wand2, Loader2 } from 'lucide-react';
import { chordsApi } from '@/services/api';
import { ChordDisplay } from './ChordDisplay';
import { toast } from '@/stores/toastStore';
import { MusicTermTooltip } from '@/components/common/MusicTermTooltip';

interface ChordProEditorProps {
  initialContent?: string;
  initialKey?: string;
  songId?: number;
  songTitle?: string;
  songArtist?: string;
  onSave?: (content: string, key: string) => void;
  onChange?: (content: string) => void;
  readOnly?: boolean;
}

const AVAILABLE_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Am', 'A#m', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dbm', 'Dm',
  'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gbm', 'Gm', 'G#m', 'Abm'
];

export function ChordProEditor({
  initialContent = '',
  initialKey = 'C',
  songId,
  songTitle = '',
  songArtist = '',
  onSave,
  onChange,
  readOnly = false
}: ChordProEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [currentKey, setCurrentKey] = useState(initialKey);
  const [targetKey, setTargetKey] = useState(initialKey);
  const [isPreview, setIsPreview] = useState(false);
  const [isTransposing, setIsTransposing] = useState(false);
  const [validation, setValidation] = useState<{ isValid: boolean; warnings: string[] }>({
    isValid: true,
    warnings: []
  });
  const [parsedHtml, setParsedHtml] = useState('');
  const [extractedChords, setExtractedChords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isAIExtracting, setIsAIExtracting] = useState(false);
  const [aiExtractionNotes, setAIExtractionNotes] = useState<string | null>(null);
  const [lyricsInput, setLyricsInput] = useState('');

  // Validate content on change
  useEffect(() => {
    const validateContent = async () => {
      if (!content.trim()) {
        setValidation({ isValid: true, warnings: [] });
        return;
      }

      try {
        const result = await chordsApi.validate(content);
        setValidation({ isValid: result.is_valid, warnings: result.warnings });
      } catch {
        // Ignore validation errors during typing
      }
    };

    const debounceTimer = setTimeout(validateContent, 500);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  // Parse content for preview
  useEffect(() => {
    const parseContent = async () => {
      if (!content.trim()) {
        setParsedHtml('');
        setExtractedChords([]);
        return;
      }

      try {
        const result = await chordsApi.parse(content);
        setParsedHtml(result.html);
        setExtractedChords(result.chords);
      } catch {
        // Ignore parse errors
      }
    };

    const debounceTimer = setTimeout(parseContent, 300);
    return () => clearTimeout(debounceTimer);
  }, [content]);

  // Handle content change
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onChange?.(newContent);
  }, [onChange]);

  // Handle transpose
  const handleTranspose = useCallback(async () => {
    if (currentKey === targetKey) return;

    setIsTransposing(true);
    try {
      const result = await chordsApi.transpose({
        content,
        from_key: currentKey,
        to_key: targetKey
      });
      setContent(result.content);
      setCurrentKey(targetKey);
      onChange?.(result.content);
    } catch (error) {
      console.error('Transpose error:', error);
    } finally {
      setIsTransposing(false);
    }
  }, [content, currentKey, targetKey, onChange]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validation.isValid) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (songId) {
        await chordsApi.saveForSong(songId, {
          key: currentKey,
          content: content,
          chordpro_content: content,
          source: 'community'
        });
      }
      onSave?.(content, currentKey);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [content, currentKey, songId, validation.isValid, onSave]);

  // Insert chord at cursor
  const insertChord = useCallback((chord: string) => {
    const textarea = document.getElementById('chordpro-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + `[${chord}]` + content.slice(end);
    setContent(newContent);
    onChange?.(newContent);

    // Restore cursor position after chord
    setTimeout(() => {
      textarea.focus();
      const newPos = start + chord.length + 2;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [content, onChange]);

  // AI Chord extraction
  const handleAIExtract = useCallback(async () => {
    if (!lyricsInput.trim() && !content.trim()) {
      toast.warning('가사를 입력해주세요.');
      return;
    }

    setIsAIExtracting(true);
    setAIExtractionNotes(null);

    try {
      const result = await chordsApi.aiExtract({
        title: songTitle || '제목 없음',
        artist: songArtist || '아티스트 미상',
        lyrics: lyricsInput.trim() || content.replace(/\[[^\]]+\]/g, ''), // Remove existing chords if using content
        key: currentKey || undefined
      });

      if (result.success && result.chordpro) {
        setContent(result.chordpro);
        if (result.key) setCurrentKey(result.key);
        onChange?.(result.chordpro);
        setAIExtractionNotes(result.notes || null);
        setLyricsInput(''); // Clear lyrics input after successful extraction
      } else {
        toast.error(result.error || 'AI가 코드를 추출하지 못했습니다. 가사가 올바른지 확인해주세요.');
      }
    } catch (error) {
      console.error('AI extraction error:', error);
      toast.error('AI 코드 추출에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAIExtracting(false);
    }
  }, [lyricsInput, content, songTitle, songArtist, currentKey, onChange]);

  // Common chords for quick insert
  const commonChords = useMemo(() => {
    const baseChords = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const variants = ['', 'm', '7', 'maj7', 'm7', 'sus4'];

    // Generate chords based on current key
    const keyIndex = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(currentKey.replace('m', '').replace('#', '').replace('b', ''));
    const rotatedBase = [...baseChords.slice(keyIndex), ...baseChords.slice(0, keyIndex)];

    return rotatedBase.flatMap(chord =>
      variants.slice(0, 3).map(variant => chord + variant)
    ).slice(0, 12);
  }, [currentKey]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header / Toolbar */}
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Key selector */}
          <MusicTermTooltip term="key" position="bottom">
            <div className="flex items-center gap-2 cursor-help">
              <Music className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Key:</span>
              <select
                value={currentKey}
                onChange={(e) => setCurrentKey(e.target.value)}
                disabled={readOnly}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={(e) => e.stopPropagation()}
              >
                {AVAILABLE_KEYS.map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
          </MusicTermTooltip>

          {/* Transpose controls */}
          {!readOnly && (
            <MusicTermTooltip term="transpose" position="bottom">
              <div className="flex items-center gap-2 cursor-help">
                <RefreshCw className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Transpose to:</span>
              <select
                  value={targetKey}
                  onChange={(e) => setTargetKey(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  {AVAILABLE_KEYS.map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
                <button
                  onClick={handleTranspose}
                  disabled={isTransposing || currentKey === targetKey}
                  className="text-sm px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isTransposing ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : null}
                  Transpose
                </button>
              </div>
            </MusicTermTooltip>
          )}

          {/* AI Extract button */}
          {!readOnly && (
            <button
              onClick={handleAIExtract}
              disabled={isAIExtracting}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
              title="AI로 코드 추출"
            >
              {isAIExtracting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3" />
              )}
              AI 코드 추출
            </button>
          )}

          {/* View toggle */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setIsPreview(false)}
              className={`p-2 rounded ${!isPreview ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Edit mode"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`p-2 rounded ${isPreview ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}
              title="Preview mode"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI extraction notes */}
        {aiExtractionNotes && (
          <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded text-sm text-purple-800">
            <strong>AI 분석:</strong> {aiExtractionNotes}
          </div>
        )}

        {/* Validation warnings */}
        {!validation.isValid && validation.warnings.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {validation.warnings.map((warning, i) => (
                <div key={i}>{warning}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick chord insert buttons */}
      {!readOnly && !isPreview && (
        <div className="border-b border-gray-200 p-2 bg-gray-50">
          <div className="flex flex-wrap gap-1">
            {commonChords.map(chord => (
              <button
                key={chord}
                onClick={() => insertChord(chord)}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 hover:border-gray-400 font-mono"
              >
                {chord}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Lyrics input (collapsible) */}
      {!readOnly && !isPreview && !content.trim() && (
        <div className="border-b border-gray-200 p-3 bg-purple-50">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">AI 코드 자동 추출</span>
          </div>
          <textarea
            value={lyricsInput}
            onChange={(e) => setLyricsInput(e.target.value)}
            placeholder="가사를 입력하면 AI가 자동으로 코드를 배치합니다...&#10;&#10;예:&#10;주의 사랑이 나를 놓지 않네&#10;주의 은혜가 나를 놓지 않네"
            className="w-full h-[120px] font-sans text-sm p-3 border border-purple-200 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y bg-white"
          />
          <button
            onClick={handleAIExtract}
            disabled={isAIExtracting || !lyricsInput.trim()}
            className="mt-2 w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAIExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                AI 분석 중...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                코드 자동 추출
              </>
            )}
          </button>
        </div>
      )}

      {/* Editor / Preview area */}
      <div className="p-4">
        {isPreview ? (
          <div className="min-h-[300px]">
            <ChordDisplay html={parsedHtml} chords={extractedChords} />
          </div>
        ) : (
          <textarea
            id="chordpro-editor"
            value={content}
            onChange={handleContentChange}
            readOnly={readOnly}
            placeholder="Enter ChordPro content here...&#10;&#10;Example:&#10;[G]Amazing [D]grace how [Em]sweet the [C]sound&#10;[G]That saved a [D]wretch like [G]me"
            className="w-full h-[300px] font-mono text-sm p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            spellCheck={false}
          />
        )}
      </div>

      {/* Extracted chords summary */}
      {extractedChords.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <MusicTermTooltip term="chord" position="top">
              <span className="text-sm text-gray-600 cursor-help">Used chords:</span>
            </MusicTermTooltip>
            {extractedChords.map((chord, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded font-mono"
              >
                {chord}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Save button */}
      {!readOnly && onSave && (
        <div className="border-t border-gray-200 p-3 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !validation.isValid}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saveSuccess ? 'Saved!' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
