import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { ListMusic, Save, Trash2, Plus, Clock, AlertTriangle, Youtube, Share2, Check, Printer, X, FolderOpen, Loader2, Calendar, Download, FileText, Presentation, ChevronDown } from 'lucide-react';
import { SetlistItem } from './SetlistItem';
import { useSetlistStore } from '@/stores/setlistStore';
import { aiApi, songsApi, playlistApi, shareApi, setlistsApi, SetlistSongCreate, exportApi } from '@/services/api';
import { PrintableSetlist } from '@/components/print/PrintableSetlist';
import { cn } from '@/utils/cn';
import { toast } from '@/stores/toastStore';
import { MusicTermTooltip } from '@/components/common/MusicTermTooltip';
import type { Song, Setlist } from '@/types';

// Detect touch device
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// YouTube 비디오 ID 추출 함수
const extractVideoId = (url: string): string | null => {
  if (!url) return null;

  // youtube.com/watch?v= 형식
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // youtu.be/ 형식
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // youtube.com/embed/ 형식
  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  return null;
};

// 로컬에서 플레이리스트 URL 생성 (저장되지 않은 송리스트용)
const generateLocalPlaylistUrl = (songs: { song?: { youtube_url?: string } }[]): string | null => {
  const videoIds = songs
    .map((s) => s.song?.youtube_url ? extractVideoId(s.song.youtube_url) : null)
    .filter((id): id is string => id !== null);

  if (videoIds.length === 0) return null;

  return `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;
};

export function SetlistEditor() {
  const {
    currentSetlist,
    editingSongs,
    availableSongs,
    setAvailableSongs,
    setCurrentSetlist,
    removeSongFromSetlist,
    reorderSongs,
    updateSongKey,
    addSongToSetlist,
    clearSetlist,
  } = useSetlistStore();

  const [keyAnalysis, setKeyAnalysis] = useState<{
    overall: string;
    transitions: { from: string; to: string; compatibility: string }[];
    warnings: string[];
  } | null>(null);

  const [showSongPicker, setShowSongPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPlaylist, setIsGeneratingPlaylist] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Save/Load states
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveDate, setSaveDate] = useState('');
  const [saveServiceType, setSaveServiceType] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSetlists, setSavedSetlists] = useState<Setlist[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Export states
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Use touch backend on touch devices
  const dndBackend = useMemo(() => isTouchDevice() ? TouchBackend : HTML5Backend, []);
  const dndOptions = useMemo(() => isTouchDevice() ? { enableMouseEvents: true, delayTouchStart: 150 } : {}, []);

  // Load available songs
  useEffect(() => {
    const loadSongs = async () => {
      try {
        const result = await songsApi.getAll({ per_page: 100 });
        setAvailableSongs(result.songs);
      } catch (error) {
        console.error('Failed to load songs:', error);
      }
    };
    loadSongs();
  }, [setAvailableSongs]);

  // Analyze key flow when songs change
  useEffect(() => {
    const analyzeKeys = async () => {
      if (editingSongs.length < 2) {
        setKeyAnalysis(null);
        return;
      }

      try {
        const keys = editingSongs.map((s) => s.key);
        const result = await aiApi.analyzeKeyFlow(keys);
        setKeyAnalysis(result);
      } catch (error) {
        console.error('Failed to analyze keys:', error);
      }
    };
    analyzeKeys();
  }, [editingSongs]);

  // Load saved setlists
  const loadSavedSetlists = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await setlistsApi.getAll({ per_page: 50 });
      setSavedSetlists(result.setlists);
    } catch (error) {
      console.error('Failed to load setlists:', error);
      setLoadError('송리스트 목록을 불러올 수 없습니다. 인터넷 연결을 확인하고 새로고침 해주세요.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save setlist
  const handleSaveSetlist = async () => {
    if (!saveTitle.trim()) {
      toast.warning('송리스트 제목을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const songsToSave: SetlistSongCreate[] = editingSongs.map((s, idx) => ({
        song_id: s.song_id,
        order: idx + 1,
        key: s.key,
        transition_type: s.transition_type,
        transition_chord_progression: s.transition_chord_progression,
        transition_notes: s.transition_notes,
        role: s.role,
        scripture_ref: s.scripture_ref,
        notes: s.notes,
      }));

      if (currentSetlist?.id) {
        // Update existing setlist
        await setlistsApi.update(currentSetlist.id, {
          title: saveTitle,
          date: saveDate || undefined,
          service_type: saveServiceType || undefined,
        });
        await setlistsApi.updateSongs(currentSetlist.id, songsToSave);
        toast.success('송리스트가 업데이트되었습니다!');
      } else {
        // Create new setlist
        const newSetlist = await setlistsApi.create({
          title: saveTitle,
          date: saveDate || undefined,
          service_type: saveServiceType || undefined,
          is_public: false,
          songs: songsToSave,
        });
        setCurrentSetlist(newSetlist);
        toast.success('송리스트가 저장되었습니다!');
      }

      setShowSaveModal(false);
      setSaveTitle('');
      setSaveDate('');
      setSaveServiceType('');
    } catch (error) {
      console.error('Failed to save setlist:', error);
      toast.error('송리스트 저장에 실패했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // Load a setlist
  const handleLoadSetlist = async (setlist: Setlist) => {
    setCurrentSetlist(setlist);
    setShowLoadModal(false);
  };

  // Delete a setlist
  const handleDeleteSetlist = async (setlistId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 송리스트를 삭제하시겠습니까?')) return;

    try {
      await setlistsApi.delete(setlistId);
      setSavedSetlists((prev) => prev.filter((s) => s.id !== setlistId));
      if (currentSetlist?.id === setlistId) {
        clearSetlist();
      }
    } catch (error) {
      console.error('Failed to delete setlist:', error);
      toast.error('송리스트 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // Open save modal
  const handleOpenSaveModal = () => {
    setSaveTitle(currentSetlist?.title || '');
    setSaveDate(currentSetlist?.date || '');
    setSaveServiceType(currentSetlist?.service_type || '');
    setShowSaveModal(true);
  };

  // Open load modal
  const handleOpenLoadModal = () => {
    loadSavedSetlists();
    setShowLoadModal(true);
  };

  const totalDuration = editingSongs.reduce(
    (acc, s) => acc + (s.song?.duration_sec || 0),
    0
  );

  const filteredSongs = availableSongs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSong = (song: Song) => {
    addSongToSetlist(song);
    setShowSongPicker(false);
    setSearchQuery('');
  };

  const getKeyCompatibility = (index: number): '자연스러움' | '괜찮음' | '어색함' | undefined => {
    if (!keyAnalysis || index === 0) return undefined;
    const transition = keyAnalysis.transitions[index - 1];
    return transition?.compatibility as '자연스러움' | '괜찮음' | '어색함';
  };

  // YouTube 플레이리스트로 열기
  const handleOpenYoutubePlaylist = async () => {
    if (editingSongs.length === 0) return;

    setIsGeneratingPlaylist(true);

    try {
      let playlistUrl: string | null = null;
      let songsWithoutYoutube: string[] = [];

      // 저장된 송리스트가 있으면 API 사용
      if (currentSetlist?.id) {
        const result = await playlistApi.getYoutubeUrl(currentSetlist.id);
        playlistUrl = result.playlist_url;
        songsWithoutYoutube = result.songs_without_youtube;
      } else {
        // 저장되지 않은 경우 로컬에서 URL 생성
        playlistUrl = generateLocalPlaylistUrl(editingSongs);
        songsWithoutYoutube = editingSongs
          .filter((s) => !s.song?.youtube_url)
          .map((s) => s.song?.title || '알 수 없는 곡');
      }

      if (playlistUrl) {
        // 새 탭에서 열기
        window.open(playlistUrl, '_blank', 'noopener,noreferrer');

        // YouTube URL이 없는 곡이 있으면 경고
        if (songsWithoutYoutube.length > 0) {
          console.warn('YouTube URL이 없는 곡:', songsWithoutYoutube);
        }
      } else {
        toast.warning('YouTube URL이 있는 곡이 없습니다.');
      }
    } catch (error) {
      console.error('플레이리스트 생성 실패:', error);
      // 실패 시 로컬에서 시도
      const localUrl = generateLocalPlaylistUrl(editingSongs);
      if (localUrl) {
        window.open(localUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.warning('플레이리스트를 생성할 수 없습니다. YouTube URL이 있는 곡이 없습니다.');
      }
    } finally {
      setIsGeneratingPlaylist(false);
    }
  };

  // YouTube URL이 있는 곡 수 계산
  const songsWithYoutubeCount = editingSongs.filter((s) => s.song?.youtube_url).length;

  // 공유 링크 생성
  const handleShare = async () => {
    if (!currentSetlist?.id) {
      toast.warning('먼저 송리스트를 저장해주세요.');
      return;
    }

    setIsSharing(true);
    try {
      const response = await shareApi.createShareLink(currentSetlist.id);
      const shareUrl = `${window.location.origin}/shared/${response.token}`;

      await navigator.clipboard.writeText(shareUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    } catch (error) {
      console.error('공유 링크 생성 실패:', error);
      toast.error('공유 링크 생성에 실패했습니다. 인터넷 연결을 확인해주세요.');
    } finally {
      setIsSharing(false);
    }
  };

  // 인쇄 미리보기 열기
  const handleOpenPrintPreview = () => {
    if (editingSongs.length === 0) {
      toast.warning('인쇄할 곡이 없습니다.');
      return;
    }
    setShowPrintPreview(true);
  };

  // 인쇄 실행
  const handlePrint = () => {
    window.print();
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export to PDF (HTML)
  const handleExportPDF = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const songs = editingSongs.map((s) => ({
        title: s.song?.title || '',
        artist: s.song?.artist || '',
        key: s.key,
        role: s.role,
        duration_sec: s.song?.duration_sec || 0,
      }));

      const result = await exportApi.pdfSetlist({
        setlist_id: currentSetlist?.id,
        songs: currentSetlist?.id ? undefined : songs,
        setlist_name: currentSetlist?.title || '송리스트',
        date: currentSetlist?.date,
        service_type: currentSetlist?.service_type,
      });

      // Open HTML in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(result.content);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('PDF 내보내기 실패:', error);
      toast.error('PDF 내보내기에 실패했습니다. 브라우저 팝업 차단을 확인해주세요.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to PowerPoint
  const handleExportPowerPoint = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const songs = editingSongs.map((s) => ({
        title: s.song?.title || '',
        artist: s.song?.artist || '',
        key: s.key,
        role: s.role,
        duration_sec: s.song?.duration_sec || 0,
        lyrics: '', // Would need lyrics from DB
      }));

      const blob = await exportApi.powerpoint({
        setlist_id: currentSetlist?.id,
        songs: currentSetlist?.id ? undefined : songs,
        setlist_name: currentSetlist?.title || '송리스트',
        date: currentSetlist?.date,
        service_type: currentSetlist?.service_type,
      });

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSetlist?.title || '송리스트'}_${new Date().toISOString().split('T')[0]}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PowerPoint 내보내기 실패:', error);
      toast.error('PowerPoint 파일 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsExporting(false);
    }
  };

  // Export to plain text
  const handleExportText = async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const songs = editingSongs.map((s) => ({
        title: s.song?.title || '',
        artist: s.song?.artist || '',
        key: s.key,
        role: s.role,
        duration_sec: s.song?.duration_sec || 0,
      }));

      const result = await exportApi.text({
        setlist_id: currentSetlist?.id,
        songs: currentSetlist?.id ? undefined : songs,
        setlist_name: currentSetlist?.title || '송리스트',
        date: currentSetlist?.date,
        service_type: currentSetlist?.service_type,
      });

      // Download as text file
      const blob = new Blob([result.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('텍스트 내보내기 실패:', error);
      toast.error('텍스트 파일 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DndProvider backend={dndBackend} options={dndOptions}>
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <ListMusic className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                {currentSetlist?.title || '송리스트 편집'}
              </h2>
              {currentSetlist?.id && (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs">
                  저장됨
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Load button */}
              <button
                onClick={handleOpenLoadModal}
                className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                title="불러오기"
                aria-label="불러오기"
              >
                <FolderOpen className="w-5 h-5" />
              </button>
              {/* Print button */}
              <button
                onClick={handleOpenPrintPreview}
                disabled={editingSongs.length === 0}
                className={cn(
                  "p-2.5 sm:p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors",
                  editingSongs.length > 0
                    ? "hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                )}
                title="인쇄"
                aria-label="인쇄"
              >
                <Printer className="w-5 h-5" />
              </button>
              {/* Export dropdown */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={editingSongs.length === 0 || isExporting}
                  className={cn(
                    "p-2.5 sm:p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center gap-1 transition-colors",
                    editingSongs.length > 0
                      ? "hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                      : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  )}
                  title="내보내기"
                  aria-label="내보내기"
                >
                  {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                      onClick={handleExportPDF}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <FileText className="w-4 h-4" />
                      PDF (인쇄용)
                    </button>
                    <button
                      onClick={handleExportPowerPoint}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <Presentation className="w-4 h-4" />
                      PowerPoint
                    </button>
                    <button
                      onClick={handleExportText}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <FileText className="w-4 h-4" />
                      텍스트 파일
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleShare}
                disabled={!currentSetlist?.id || isSharing}
                className={cn(
                  "p-2.5 sm:p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors",
                  currentSetlist?.id
                    ? shareSuccess
                      ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                )}
                title={currentSetlist?.id ? (shareSuccess ? "복사됨!" : "공유 링크 복사") : "먼저 송리스트를 저장해주세요"}
                aria-label="공유"
              >
                {shareSuccess ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
              </button>
              <button
                onClick={handleOpenYoutubePlaylist}
                disabled={editingSongs.length === 0 || songsWithYoutubeCount === 0 || isGeneratingPlaylist}
                className={cn(
                  "p-2.5 sm:p-2 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors",
                  editingSongs.length > 0 && songsWithYoutubeCount > 0
                    ? "hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/50 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                )}
                title={songsWithYoutubeCount > 0 ? `유튜브로 재생 (${songsWithYoutubeCount}곡)` : "YouTube URL이 있는 곡이 없습니다"}
                aria-label="유튜브로 재생"
              >
                <Youtube className="w-5 h-5" />
              </button>
              <button
                onClick={clearSetlist}
                className="p-2.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="전체 삭제"
                aria-label="전체 삭제"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleOpenSaveModal}
                disabled={editingSongs.length === 0}
                className={cn(
                  "px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg flex items-center gap-2 min-h-[44px] text-sm sm:text-base transition-colors",
                  editingSongs.length > 0
                    ? "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4" />
                <span className="hidden sm:inline">저장</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <ListMusic className="w-4 h-4" />
              {editingSongs.length}곡
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {Math.floor(totalDuration / 60)}분 {totalDuration % 60}초
            </span>
            {keyAnalysis && (
              <MusicTermTooltip term="keyFlow" position="bottom">
                <span
                  className={cn(
                    'flex items-center gap-1 cursor-help',
                    keyAnalysis.overall === '자연스러움'
                      ? 'text-green-600 dark:text-green-400'
                      : keyAnalysis.overall === '괜찮음'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  키 흐름: {keyAnalysis.overall}
                </span>
              </MusicTermTooltip>
            )}
          </div>
        </div>

        {/* Warnings */}
        {keyAnalysis?.warnings && keyAnalysis.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
                {keyAnalysis.warnings.map((warning, i) => (
                  <p key={i}>{warning}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Songs list */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {editingSongs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <ListMusic className="w-10 sm:w-12 h-10 sm:h-12 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm sm:text-base">송리스트가 비어있습니다</p>
              <button
                onClick={() => setShowSongPicker(true)}
                className="px-4 py-3 sm:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 active:bg-primary-800 flex items-center gap-2 min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                곡 추가
              </button>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-2">
              {editingSongs.map((song, index) => (
                <SetlistItem
                  key={song.id}
                  item={song}
                  index={index}
                  onRemove={() => removeSongFromSetlist(index)}
                  onKeyChange={(key) => updateSongKey(index, key)}
                  onReorder={reorderSongs}
                  keyCompatibility={getKeyCompatibility(index)}
                />
              ))}

              {/* Add song button */}
              <button
                onClick={() => setShowSongPicker(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 active:bg-gray-50 dark:active:bg-gray-800 transition-colors flex items-center justify-center gap-2 min-h-[56px]"
              >
                <Plus className="w-5 h-5" />
                곡 추가
              </button>
            </div>
          )}
        </div>

        {/* Song picker modal */}
        {showSongPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col">
              {/* Mobile drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">곡 선택</h3>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="곡 제목 또는 아티스트 검색..."
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-2">
                {filteredSongs.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleAddSong(song)}
                    className="w-full p-3 sm:p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-lg flex items-center justify-between min-h-[56px] transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{song.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{song.artist}</p>
                    </div>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-sm font-mono ml-2 flex-shrink-0 text-gray-900 dark:text-white">
                      {song.default_key}
                    </span>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 pb-safe">
                <button
                  onClick={() => {
                    setShowSongPicker(false);
                    setSearchQuery('');
                  }}
                  className="w-full py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 min-h-[48px]"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print preview modal */}
        {showPrintPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">인쇄 미리보기</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    인쇄
                  </button>
                  <button
                    onClick={() => setShowPrintPreview(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                    aria-label="닫기"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview content */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-100 dark:bg-gray-900">
                <PrintableSetlist
                  ref={printRef}
                  title={currentSetlist?.title}
                  date={currentSetlist?.date}
                  serviceType={currentSetlist?.service_type}
                  songs={editingSongs}
                />
              </div>
            </div>
          </div>
        )}

        {/* Save modal */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg w-full sm:max-w-md flex flex-col">
              {/* Mobile drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  {currentSetlist?.id ? '송리스트 업데이트' : '송리스트 저장'}
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="예: 2024년 1월 주일예배"
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    날짜
                  </label>
                  <input
                    type="date"
                    value={saveDate}
                    onChange={(e) => setSaveDate(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    예배 유형
                  </label>
                  <select
                    value={saveServiceType}
                    onChange={(e) => setSaveServiceType(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">선택...</option>
                    <option value="주일예배">주일예배</option>
                    <option value="청년예배">청년예배</option>
                    <option value="수요예배">수요예배</option>
                    <option value="금요예배">금요예배</option>
                    <option value="새벽예배">새벽예배</option>
                    <option value="특별예배">특별예배</option>
                    <option value="수련회">수련회</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {editingSongs.length}곡 · 총 {Math.floor(totalDuration / 60)}분 {totalDuration % 60}초
                </div>
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 pb-safe">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[48px]"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveSetlist}
                  disabled={isSaving || !saveTitle.trim()}
                  className={cn(
                    "flex-1 py-3 sm:py-2 rounded-lg flex items-center justify-center gap-2 min-h-[48px]",
                    saveTitle.trim()
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load modal */}
        {showLoadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[85vh] sm:max-h-[80vh] flex flex-col">
              {/* Mobile drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  저장된 송리스트
                </h3>
                <button
                  onClick={loadSavedSetlists}
                  disabled={isLoading}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                  title="새로고침"
                >
                  <Loader2 className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                  </div>
                ) : loadError ? (
                  <div className="p-4 text-center text-red-500 dark:text-red-400">
                    {loadError}
                  </div>
                ) : savedSetlists.length === 0 ? (
                  <div className="p-8 text-center">
                    <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">저장된 송리스트가 없습니다</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {savedSetlists.map((setlist) => (
                      <button
                        key={setlist.id}
                        onClick={() => handleLoadSetlist(setlist)}
                        className={cn(
                          "w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-600 transition-colors",
                          currentSetlist?.id === setlist.id && "bg-primary-50 dark:bg-primary-900/20"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {setlist.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {setlist.date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(setlist.date).toLocaleDateString('ko-KR')}
                                </span>
                              )}
                              {setlist.service_type && (
                                <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                  {setlist.service_type}
                                </span>
                              )}
                              <span>{setlist.songs?.length || 0}곡</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteSetlist(setlist.id, e)}
                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 pb-safe">
                <button
                  onClick={() => setShowLoadModal(false)}
                  className="w-full py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 min-h-[48px]"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}
