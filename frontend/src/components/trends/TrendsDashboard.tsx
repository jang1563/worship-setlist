import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, Youtube, Music, Play, ExternalLink, RefreshCw, AlertCircle, Clock, Database, BookOpen, Hash, Sparkles, BarChart3, Eye, Video, ChevronUp, ChevronDown } from 'lucide-react';
import { trendsApi } from '@/services/api';
import type { TrendAnalysis, VideoInfo, WorshipChannel } from '@/types';

// Worship theme keywords for extraction
const WORSHIP_THEMES: Record<string, { keywords: string[]; scripture: string; description: string }> = {
  '경배와 찬양': {
    keywords: ['경배', '찬양', 'worship', 'praise', '영광', 'glory'],
    scripture: '시편 95:6',
    description: '하나님께 경배와 찬양을 드림'
  },
  '은혜와 사랑': {
    keywords: ['은혜', '사랑', 'grace', 'love', '자비', '긍휼'],
    scripture: '에베소서 2:8',
    description: '하나님의 은혜와 사랑'
  },
  '치유와 회복': {
    keywords: ['치유', '회복', 'healing', 'restore', '위로', '평안'],
    scripture: '이사야 53:5',
    description: '주님의 치유하심과 회복'
  },
  '헌신과 순종': {
    keywords: ['헌신', '순종', 'surrender', 'follow', '주님 앞에', '나를 드립니다'],
    scripture: '로마서 12:1',
    description: '주께 드리는 헌신'
  },
  '성령': {
    keywords: ['성령', 'holy spirit', '기름 부음', '임재'],
    scripture: '사도행전 2:4',
    description: '성령 충만과 임재'
  },
  '승리와 선포': {
    keywords: ['승리', '선포', 'victory', 'declare', '능력', '이김'],
    scripture: '고린도전서 15:57',
    description: '그리스도 안에서의 승리'
  },
  '감사': {
    keywords: ['감사', 'thanks', 'thankful', '주께 감사'],
    scripture: '데살로니가전서 5:18',
    description: '범사에 감사함'
  },
  '기도': {
    keywords: ['기도', 'prayer', '간구', '응답'],
    scripture: '빌립보서 4:6',
    description: '하나님께 드리는 기도'
  }
};

// Extract themes from song titles and video titles
function extractThemes(trends: TrendAnalysis | null): { theme: string; count: number; scripture: string; description: string }[] {
  if (!trends) return [];

  const themeCounts: Record<string, number> = {};
  const allTexts = [
    ...trends.top_songs.map(s => s.title.toLowerCase()),
    ...trends.recent_videos.map(v => v.title.toLowerCase()),
    ...trends.recent_videos.flatMap(v => v.extracted_songs.map(s => s.toLowerCase()))
  ];

  for (const [themeName, themeData] of Object.entries(WORSHIP_THEMES)) {
    let count = 0;
    for (const text of allTexts) {
      for (const keyword of themeData.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          count++;
          break;
        }
      }
    }
    if (count > 0) {
      themeCounts[themeName] = count;
    }
  }

  return Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, count]) => ({
      theme,
      count,
      scripture: WORSHIP_THEMES[theme].scripture,
      description: WORSHIP_THEMES[theme].description
    }));
}

// Generate YouTube search URL for a song
function generateYouTubeSearchUrl(title: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' 찬양')}`;
}

// Compare trend data for insights
interface TrendComparison {
  weekly: TrendAnalysis | null;
  monthly: TrendAnalysis | null;
}

export function TrendsDashboard() {
  const [trends, setTrends] = useState<TrendAnalysis | null>(null);
  const [channels, setChannels] = useState<WorshipChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daysBack, setDaysBack] = useState(7);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'channels' | 'insights'>('overview');
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [comparison, setComparison] = useState<TrendComparison>({ weekly: null, monthly: null });

  // Map time period to days
  const getDaysForPeriod = (period: 'weekly' | 'monthly' | 'yearly') => {
    switch (period) {
      case 'weekly': return 7;
      case 'monthly': return 30;
      case 'yearly': return 365;
    }
  };

  // Update daysBack when timePeriod changes
  useEffect(() => {
    setDaysBack(getDaysForPeriod(timePeriod));
  }, [timePeriod]);

  // Extract themes from trends data
  const themes = useMemo(() => extractThemes(trends), [trends]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!trends) return null;
    const totalViews = trends.recent_videos.reduce((sum, v) => sum + v.view_count, 0);
    const totalVideos = trends.recent_videos.length;
    const uniqueSongs = new Set(trends.top_songs.map(s => s.title)).size;
    const activeChannels = trends.top_channels.length;
    return { totalViews, totalVideos, uniqueSongs, activeChannels };
  }, [trends]);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const [trendsData, channelsData] = await Promise.all([
        trendsApi.getWeeklyTrends(daysBack, forceRefresh),
        trendsApi.getChannels(),
      ]);
      setTrends(trendsData);
      setChannels(channelsData);
      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Failed to load trends:', err);
      const errorMessage = err instanceof Error ? err.message : '동향 데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [daysBack]);

  // Load comparison data for insights tab
  const loadComparisonData = useCallback(async () => {
    try {
      const [weekly, monthly] = await Promise.all([
        trendsApi.getWeeklyTrends(7),
        trendsApi.getWeeklyTrends(30),
      ]);
      setComparison({ weekly, monthly });
    } catch (err) {
      console.error('Failed to load comparison data:', err);
    }
  }, []);

  // Load comparison data when insights tab is active
  useEffect(() => {
    if (activeTab === 'insights' && !comparison.weekly) {
      loadComparisonData();
    }
  }, [activeTab, comparison.weekly, loadComparisonData]);

  const handleForceRefresh = () => {
    loadData(true);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatViews = (views: number) => {
    if (views >= 10000) return `${(views / 10000).toFixed(1)}만`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}천`;
    return views.toString();
  };

  const formatLastUpdated = (dateStr: string | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatLocalLastFetch = () => {
    if (!lastFetchTime) return null;
    return lastFetchTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <TrendingUp className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">워십 동향</h2>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">(YouTube)</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Last update time indicator */}
            {lastFetchTime && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Clock className="w-3 h-3" />
                <span>마지막 조회: {formatLocalLastFetch()}</span>
              </div>
            )}
            {/* Time period tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                    timePeriod === period
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {period === 'weekly' && '주간'}
                  {period === 'monthly' && '월간'}
                  {period === 'yearly' && '연간'}
                </button>
              ))}
            </div>
            <button
              onClick={() => loadData(false)}
              disabled={loading}
              className="p-2.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="새로고침"
              title="새로고침 (캐시)"
            >
              <RefreshCw className={`w-5 h-5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleForceRefresh}
              disabled={loading}
              className="hidden sm:flex p-2 text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30 active:bg-orange-100 rounded-lg transition-colors items-center justify-center"
              aria-label="강제 새로고침"
              title="강제 새로고침 (YouTube API 재요청)"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="ml-1 text-xs font-medium">갱신</span>
            </button>
          </div>
        </div>

        {/* Tabs - scrollable on mobile */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 -mb-4 overflow-x-auto scrollbar-hide">
          {(['overview', 'insights', 'videos', 'channels'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 sm:py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:bg-gray-50 dark:active:bg-gray-700'
              }`}
            >
              {tab === 'overview' && '개요'}
              {tab === 'insights' && '인사이트'}
              {tab === 'videos' && '최신 영상'}
              {tab === 'channels' && '채널'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">동향 데이터를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertCircle className="w-10 sm:w-12 h-10 sm:h-12 text-red-400 mb-4" />
            <p className="text-gray-700 dark:text-gray-200 font-medium text-sm sm:text-base mb-2">데이터를 불러올 수 없습니다</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-4 max-w-md">{error}</p>
            <button
              onClick={() => loadData()}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm hover:bg-primary-600 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : !trends ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <TrendingUp className="w-10 sm:w-12 h-10 sm:h-12 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">동향 데이터를 불러올 수 없습니다</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Data Source Indicator */}
                {(trends.is_mock_data || trends.is_cached) && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm ${
                    trends.is_mock_data
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                  }`}>
                    {trends.is_mock_data ? (
                      <>
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>데모 데이터입니다. YouTube API 키를 설정하면 실제 데이터를 확인할 수 있습니다.</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4 flex-shrink-0" />
                        <span>
                          캐시된 데이터
                          {trends.last_updated && ` (${formatLastUpdated(trends.last_updated)} 업데이트)`}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Statistics Cards */}
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Video className="w-4 h-4" />
                        <span className="text-xs">영상 수</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalVideos}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Music className="w-4 h-4" />
                        <span className="text-xs">인기 곡</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueSongs}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">총 조회수</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatViews(stats.totalViews)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                        <Youtube className="w-4 h-4" />
                        <span className="text-xs">활동 채널</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeChannels}</p>
                    </div>
                  </div>
                )}

                {/* Insights */}
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-xl p-4 sm:p-5 text-white">
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Sparkles className="w-4 h-4" />
                    주간 인사이트
                  </h3>
                  <p className="text-primary-50 text-xs sm:text-sm leading-relaxed">
                    {trends.insights}
                  </p>
                  {trends.last_updated && !trends.is_mock_data && (
                    <div className="mt-3 pt-3 border-t border-primary-400/30 flex items-center gap-1.5 text-primary-100 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>업데이트: {formatLastUpdated(trends.last_updated)}</span>
                    </div>
                  )}
                </div>

                {/* Theme Keywords with Scripture */}
                {themes.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                        <Hash className="w-4 h-4 text-purple-500" />
                        이번 주 예배 테마
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {themes.map((t) => (
                          <span
                            key={t.theme}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
                          >
                            <span>{t.theme}</span>
                            <span className="text-purple-400 dark:text-purple-500 text-xs">({t.count})</span>
                          </span>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {themes.slice(0, 3).map((t) => (
                          <div
                            key={t.theme}
                            className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <BookOpen className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{t.theme}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description}</p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">📖 {t.scripture}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Songs with Links */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                      <BarChart3 className="w-4 h-4 text-primary-500" />
                      인기 찬양곡 TOP 10
                    </h3>
                  </div>
                  {trends.top_songs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      분석된 곡이 없습니다.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {trends.top_songs.map((song, index) => (
                        <div key={song.title} className="px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400' :
                            index === 1 ? 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300' :
                            index === 2 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">{song.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {song.channels.slice(0, 2).join(', ')}
                              {song.channels.length > 2 && ` 외 ${song.channels.length - 2}개 채널`}
                            </p>
                          </div>
                          {/* Song count bar visualization */}
                          <div className="hidden sm:flex items-center gap-2 w-24">
                            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${Math.min(100, (song.count / (trends.top_songs[0]?.count || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{song.count}회</span>
                          </div>
                          {/* Mobile count */}
                          <span className="sm:hidden text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                            {song.count}회
                          </span>
                          {/* YouTube direct link - always visible on mobile */}
                          <a
                            href={song.video_url || generateYouTubeSearchUrl(song.title)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                            title={song.video_url ? "YouTube에서 보기" : "YouTube에서 검색"}
                          >
                            <Youtube className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Channels - responsive grid */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-3 sm:px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                      <Youtube className="w-4 h-4 text-red-500" />
                      활발한 채널
                    </h3>
                  </div>
                  {trends.top_channels.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                      분석된 채널이 없습니다.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {trends.top_channels.map((channel, index) => (
                        <div key={channel.name} className="px-3 sm:px-4 py-3 flex items-center gap-3 sm:gap-4">
                          <div className="relative">
                            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                              <Youtube className="w-5 h-5 text-red-500" />
                            </div>
                            {index < 3 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate text-sm sm:text-base">{channel.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                <Video className="w-3 h-3" />
                                {channel.video_count}개
                              </span>
                              {channel.total_views > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                  <Eye className="w-3 h-3" />
                                  {formatViews(channel.total_views)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Period Comparison Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 rounded-xl p-4 sm:p-5 text-white">
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <Sparkles className="w-4 h-4" />
                    기간별 찬양 인사이트
                  </h3>
                  <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
                    주간과 월간 데이터를 비교하여 찬양 트렌드 변화를 분석합니다.
                  </p>
                </div>

                {/* Comparison Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Weekly Summary */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white">주간 (7일)</h4>
                    </div>
                    {comparison.weekly ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          총 영상: <span className="font-medium text-gray-900 dark:text-white">{comparison.weekly.recent_videos.length}개</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          인기곡: <span className="font-medium text-gray-900 dark:text-white">{comparison.weekly.top_songs.length}곡</span>
                        </p>
                        {comparison.weekly.top_songs[0] && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            1위: <span className="font-medium text-primary-600 dark:text-primary-400">{comparison.weekly.top_songs[0].title}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">로딩 중...</p>
                    )}
                  </div>

                  {/* Monthly Summary */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white">월간 (30일)</h4>
                    </div>
                    {comparison.monthly ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          총 영상: <span className="font-medium text-gray-900 dark:text-white">{comparison.monthly.recent_videos.length}개</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          인기곡: <span className="font-medium text-gray-900 dark:text-white">{comparison.monthly.top_songs.length}곡</span>
                        </p>
                        {comparison.monthly.top_songs[0] && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            1위: <span className="font-medium text-primary-600 dark:text-primary-400">{comparison.monthly.top_songs[0].title}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">로딩 중...</p>
                    )}
                  </div>
                </div>

                {/* Trend Comparison */}
                {comparison.weekly && comparison.monthly && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        주간 vs 월간 인기곡 비교
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {comparison.weekly.top_songs.slice(0, 5).map((song, index) => {
                          const monthlyRank = comparison.monthly?.top_songs.findIndex(s => s.title === song.title) ?? -1;
                          const isNew = monthlyRank === -1;
                          const isRising = monthlyRank > index;
                          const isFalling = monthlyRank !== -1 && monthlyRank < index;

                          return (
                            <div key={song.title} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                                {index + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{song.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  이번 주 {song.count}회
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {isNew && (
                                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                                    NEW
                                  </span>
                                )}
                                {isRising && (
                                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium flex items-center gap-0.5">
                                    <ChevronUp className="w-3 h-3" />
                                    상승
                                  </span>
                                )}
                                {isFalling && (
                                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium flex items-center gap-0.5">
                                    <ChevronDown className="w-3 h-3" />
                                    하락
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights */}
                {trends && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI 분석
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
                      {trends.insights}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'videos' && (
              <div className="grid gap-3 sm:gap-4">
                {trends.recent_videos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Youtube className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">최근 영상이 없습니다.</p>
                  </div>
                ) : (
                  trends.recent_videos.map((video) => (
                    <VideoCard key={video.video_id} video={video} />
                  ))
                )}
              </div>
            )}

            {activeTab === 'channels' && (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {channels.map((channel) => (
                  <a
                    key={channel.channel_id}
                    href={channel.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-red-300 dark:hover:border-red-500 active:bg-red-50 dark:active:bg-red-900/20 transition-colors group min-h-[72px]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors flex-shrink-0">
                        <Youtube className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                          <span className="truncate">{channel.name}</span>
                          <ExternalLink className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {channel.category === 'worship_team' && '찬양사역팀'}
                          {channel.category === 'church' && '교회'}
                          {channel.category === 'international' && '해외'}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VideoCard({ video }: { video: VideoInfo }) {
  return (
    <a
      href={video.video_url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-red-300 dark:hover:border-red-500 active:bg-red-50 dark:active:bg-red-900/20 transition-colors group"
    >
      {/* Stacked layout on mobile, horizontal on larger screens */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4">
        <div className="relative flex-shrink-0">
          <img
            src={video.thumbnail_url || '/placeholder-video.png'}
            alt={video.title}
            className="w-full sm:w-40 h-44 sm:h-24 object-cover rounded-lg bg-gray-100 dark:bg-gray-700"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 sm:transition-opacity rounded-lg">
            <Play className="w-12 h-12 sm:w-10 sm:h-10 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors text-sm sm:text-base">
            {video.title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{video.channel_name}</p>
          <div className="flex items-center gap-2 sm:gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
            <span>{new Date(video.published_at).toLocaleDateString('ko-KR')}</span>
            {video.view_count > 0 && (
              <span>{video.view_count.toLocaleString()} 조회</span>
            )}
          </div>
          {video.extracted_songs.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {video.extracted_songs.slice(0, 4).map((song) => (
                <a
                  key={song}
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song + ' 찬양')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1 sm:py-0.5 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                >
                  {song}
                </a>
              ))}
              {video.extracted_songs.length > 4 && (
                <span className="px-2 py-1 sm:py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
                  +{video.extracted_songs.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
