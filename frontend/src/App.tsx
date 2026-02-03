import { useState, lazy, Suspense } from 'react';
import { Header } from '@/components/common/Header';
import { Sidebar } from '@/components/common/Sidebar';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ToastContainer } from '@/components/common/ToastContainer';
import { ChatView } from '@/components/chat/ChatView';
import { SongList } from '@/components/songs/SongList';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { useSetlistStore } from '@/stores/setlistStore';
import type { SetlistGenerateResponse } from '@/types';

// Lazy load heavy components for better initial load performance
const SetlistEditor = lazy(() => import('@/components/setlist/SetlistEditor').then(m => ({ default: m.SetlistEditor })));
const TrendsDashboard = lazy(() => import('@/components/trends/TrendsDashboard').then(m => ({ default: m.TrendsDashboard })));
const PracticePage = lazy(() => import('@/pages/PracticePage').then(m => ({ default: m.PracticePage })));
const PresenterPage = lazy(() => import('@/pages/PresenterPage').then(m => ({ default: m.PresenterPage })));
const LeaderDashboard = lazy(() => import('@/pages/LeaderDashboard').then(m => ({ default: m.LeaderDashboard })));
const SongDetailPage = lazy(() => import('@/pages/SongDetailPage').then(m => ({ default: m.SongDetailPage })));
const StageMonitorPage = lazy(() => import('@/pages/StageMonitorPage').then(m => ({ default: m.StageMonitorPage })));
const TeamsPage = lazy(() => import('@/pages/TeamsPage').then(m => ({ default: m.TeamsPage })));
const TeamDetailPage = lazy(() => import('@/pages/TeamDetailPage').then(m => ({ default: m.TeamDetailPage })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}

interface PracticeSong {
  id: number;
  title: string;
  artist?: string;
  youtubeUrl?: string;
  defaultKey?: string;
}

function App() {
  const [currentView, setCurrentView] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [practiceSong, setPracticeSong] = useState<PracticeSong | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const { setEditingSongs } = useSetlistStore();

  const handleStartPractice = (song: PracticeSong) => {
    setPracticeSong(song);
    setCurrentView('practice');
  };

  const handleSongSelect = (songId: number) => {
    setSelectedSongId(songId);
    setCurrentView('song-detail');
  };

  const handleTeamSelect = (teamId: number) => {
    setSelectedTeamId(teamId);
    setCurrentView('team-detail');
  };

  const handleSetlistSelect = (setlist: SetlistGenerateResponse) => {
    // Convert AI response to SetlistSong format
    const songs = setlist.setlist.map((item) => ({
      id: Date.now() + item.order,
      song_id: item.song_id,
      order: item.order,
      key: item.key,
      role: item.role,
      scripture_ref: item.scripture_ref,
      transition_type: item.transition_to_next?.type,
      transition_chord_progression: item.transition_to_next?.progression,
      transition_notes: item.transition_to_next?.description,
      song: {
        id: item.song_id,
        title: item.title,
        artist: '',
        default_key: item.key,
        duration_sec: item.duration_sec,
        mood_tags: [],
        service_types: [],
        season_tags: [],
        difficulty: 'medium',
        min_instruments: [],
        scripture_refs: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }));

    setEditingSongs(songs);
    setCurrentView('setlists');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'chat':
        return <ChatView onSetlistSelect={handleSetlistSelect} />;
      case 'setlists':
        return (
          <Suspense fallback={<PageLoader />}>
            <SetlistEditor />
          </Suspense>
        );
      case 'songs':
        return <SongList onPractice={handleStartPractice} onSongSelect={handleSongSelect} />;
      case 'song-detail':
        return selectedSongId ? (
          <Suspense fallback={<PageLoader />}>
            <SongDetailPage
              songId={selectedSongId}
              onBack={() => setCurrentView('songs')}
              onPractice={handleStartPractice}
            />
          </Suspense>
        ) : (
          <SongList onPractice={handleStartPractice} onSongSelect={handleSongSelect} />
        );
      case 'trends':
        return (
          <Suspense fallback={<PageLoader />}>
            <TrendsDashboard />
          </Suspense>
        );
      case 'practice':
        return (
          <Suspense fallback={<PageLoader />}>
            <PracticePage
              songId={practiceSong?.id}
              songTitle={practiceSong?.title}
              artist={practiceSong?.artist}
              youtubeUrl={practiceSong?.youtubeUrl}
              defaultKey={practiceSong?.defaultKey}
              onBack={() => setCurrentView('songs')}
            />
          </Suspense>
        );
      case 'presenter':
        return (
          <Suspense fallback={<PageLoader />}>
            <PresenterPage onBack={() => setCurrentView('leader')} />
          </Suspense>
        );
      case 'leader':
        return (
          <Suspense fallback={<PageLoader />}>
            <LeaderDashboard onOpenPresenter={() => setCurrentView('presenter')} />
          </Suspense>
        );
      case 'stage':
        return (
          <Suspense fallback={<PageLoader />}>
            <StageMonitorPage onBack={() => setCurrentView('leader')} />
          </Suspense>
        );
      case 'teams':
        return (
          <Suspense fallback={<PageLoader />}>
            <TeamsPage onTeamSelect={handleTeamSelect} />
          </Suspense>
        );
      case 'team-detail':
        return selectedTeamId ? (
          <Suspense fallback={<PageLoader />}>
            <TeamDetailPage
              teamId={selectedTeamId}
              onBack={() => setCurrentView('teams')}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<PageLoader />}>
            <TeamsPage onTeamSelect={handleTeamSelect} />
          </Suspense>
        );
      default:
        return <ChatView onSetlistSelect={handleSetlistSelect} />;
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-hidden">
          <ErrorBoundary>
            {renderContent()}
          </ErrorBoundary>
        </main>
      </div>
      <OnboardingModal />
      <ToastContainer />
    </div>
  );
}

export default App;
