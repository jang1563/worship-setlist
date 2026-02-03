"""YouTube Worship Trend Analysis Service

Provides real YouTube Data API v3 integration for analyzing worship trends.
Falls back to mock data when API key is not configured or quota is exceeded.
"""
import re
import httpx
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
import logging

from app.core.config import settings
from app.services.youtube_cache import youtube_cache, YouTubeCache


logger = logging.getLogger(__name__)


class YouTubeAPIError(Exception):
    """Base exception for YouTube API errors"""
    pass


class QuotaExceededError(YouTubeAPIError):
    """Raised when YouTube API quota is exceeded"""
    pass


class NetworkError(YouTubeAPIError):
    """Raised when network connection fails"""
    pass


class WorshipChannel(BaseModel):
    """Known worship team and church YouTube channels"""
    name: str
    channel_id: str
    channel_url: str
    category: str  # worship_team, church, international


class VideoInfo(BaseModel):
    """Parsed video information"""
    video_id: str
    title: str
    channel_name: str
    published_at: datetime
    view_count: int
    thumbnail_url: str
    video_url: str
    extracted_songs: list[str]
    service_type: Optional[str] = None


class TrendAnalysis(BaseModel):
    """Weekly trend analysis result"""
    period_start: datetime
    period_end: datetime
    top_songs: list[dict]  # {title, count, channels}
    top_channels: list[dict]  # {name, video_count, total_views}
    recent_videos: list[VideoInfo]
    insights: str
    is_cached: bool = False
    last_updated: Optional[datetime] = None
    is_mock_data: bool = False


# Known Korean worship team and church channels
WORSHIP_CHANNELS: list[WorshipChannel] = [
    # === 찬양사역팀 ===
    WorshipChannel(
        name="마커스워십",
        channel_id="UCZh-gD4yHxVQx-TGV6jJJrQ",
        channel_url="https://www.youtube.com/@marcusworship",
        category="worship_team"
    ),
    WorshipChannel(
        name="어노인팅",
        channel_id="UC7nHyqMQD_9g7v_vb9B3yjQ",
        channel_url="https://www.youtube.com/@Anointingworshipofficial",
        category="worship_team"
    ),
    WorshipChannel(
        name="제이어스",
        channel_id="UC4pXfXg5gRFECLIyf_1ZFUQ",
        channel_url="https://www.youtube.com/@jayworship",
        category="worship_team"
    ),
    WorshipChannel(
        name="YWAM워십",
        channel_id="UCFzV_Lw1nPgGkkOKyL8mN3Q",
        channel_url="https://www.youtube.com/@ywamworship",
        category="worship_team"
    ),
    WorshipChannel(
        name="캠퍼스워십",
        channel_id="UCnMHLz7rx8FNzpPu7eP3JXA",
        channel_url="https://www.youtube.com/@campusworship",
        category="worship_team"
    ),
    WorshipChannel(
        name="소원 (SOWON)",
        channel_id="UCwEbS1OJN1y7XlP2y3xJYBQ",
        channel_url="https://www.youtube.com/@sowonworship",
        category="worship_team"
    ),
    WorshipChannel(
        name="뉴젠워십",
        channel_id="UC5v5bKe3Y4h3F-xr1Q8rLXA",
        channel_url="https://www.youtube.com/@newgenworship",
        category="worship_team"
    ),
    WorshipChannel(
        name="다윗의장막",
        channel_id="UCj8Xqx3QE2Yh3Q7xSvJvKXQ",
        channel_url="https://www.youtube.com/@davidstabernacle",
        category="worship_team"
    ),

    # === 주요 대형교회 ===
    WorshipChannel(
        name="사랑의교회",
        channel_id="UCbTPmq3RNKB9rRdXD0xb5Vw",
        channel_url="https://www.youtube.com/@saaborim",
        category="church"
    ),
    WorshipChannel(
        name="온누리교회",
        channel_id="UC6n3x-7Z0p3RgPmKxVvq_oQ",
        channel_url="https://www.youtube.com/@onnuritv",
        category="church"
    ),
    WorshipChannel(
        name="여의도순복음교회",
        channel_id="UCT_HXWGvhcJzq5P5J2q8vFQ",
        channel_url="https://www.youtube.com/@faborim",
        category="church"
    ),
    WorshipChannel(
        name="새문안교회",
        channel_id="UCNEh8JNk3Xh6fy1nK5yfQuw",
        channel_url="https://www.youtube.com/@saemoonan",
        category="church"
    ),
    WorshipChannel(
        name="분당우리교회",
        channel_id="UC8mJSI1Q-x4Nh5Qm1R4Jf8g",
        channel_url="https://www.youtube.com/@bundangwoori",
        category="church"
    ),
    WorshipChannel(
        name="명성교회",
        channel_id="UCXeF8Wd8Cm6MxKL5yFRJAVw",
        channel_url="https://www.youtube.com/@myungsung",
        category="church"
    ),
    WorshipChannel(
        name="지구촌교회",
        channel_id="UC8WZvkxL0C3HYzCRp5hV4Ow",
        channel_url="https://www.youtube.com/@jiguchonchurch",
        category="church"
    ),
    WorshipChannel(
        name="영락교회",
        channel_id="UCt2eHzLD1f3YkWFxl8PHXEQ",
        channel_url="https://www.youtube.com/@youngnak",
        category="church"
    ),
    WorshipChannel(
        name="소망교회",
        channel_id="UCX8DsyUdRH2_J7XB8zL1q5w",
        channel_url="https://www.youtube.com/@somangchurch",
        category="church"
    ),
    WorshipChannel(
        name="할렐루야교회",
        channel_id="UCQk9E8Fh9xW6oEZLX4SYxVQ",
        channel_url="https://www.youtube.com/@halleluiahchurch",
        category="church"
    ),

    # === 청년/대학부 채널 ===
    WorshipChannel(
        name="사랑의교회 청년부",
        channel_id="UC1jlIpKxnZK9oXP8lDRQJEA",
        channel_url="https://www.youtube.com/@sarangyouth",
        category="church"
    ),
    WorshipChannel(
        name="온누리교회 청년부",
        channel_id="UCd5h3WqYEy_Kp8qB5CRGR4A",
        channel_url="https://www.youtube.com/@onnuriyouth",
        category="church"
    ),

    # === 해외 ===
    WorshipChannel(
        name="Hillsong Worship",
        channel_id="UC4q12NoPNySbVqwpw4iO5Xg",
        channel_url="https://www.youtube.com/@hillsongworship",
        category="international"
    ),
    WorshipChannel(
        name="Elevation Worship",
        channel_id="UCT_LRVpJWp2qoSsFcZ7bVVg",
        channel_url="https://www.youtube.com/@elevationworship",
        category="international"
    ),
    WorshipChannel(
        name="Bethel Music",
        channel_id="UC9Lnxz1j9_-GrAU2ixNF2fg",
        channel_url="https://www.youtube.com/@bethelmusic",
        category="international"
    ),
    WorshipChannel(
        name="Passion Music",
        channel_id="UCQ9YCZL8UHj5LcHLqibEdKg",
        channel_url="https://www.youtube.com/@passionmusic",
        category="international"
    ),
]


class YouTubeService:
    """Service for fetching and analyzing YouTube worship content"""

    # HTTP timeout settings
    CONNECT_TIMEOUT = 10.0
    READ_TIMEOUT = 30.0

    def __init__(self):
        self.api_key = getattr(settings, 'YOUTUBE_API_KEY', None)
        self.base_url = "https://www.googleapis.com/youtube/v3"
        self._cache = youtube_cache

    def _has_api_key(self) -> bool:
        """Check if YouTube API key is configured"""
        return bool(self.api_key and self.api_key.strip() and self.api_key != "your-youtube-api-key-here")

    def get_known_channels(self, category: Optional[str] = None) -> list[WorshipChannel]:
        """Get list of known worship channels"""
        if category:
            return [ch for ch in WORSHIP_CHANNELS if ch.category == category]
        return WORSHIP_CHANNELS

    async def _make_api_request(
        self,
        endpoint: str,
        params: dict,
        timeout: Optional[float] = None
    ) -> dict:
        """
        Make a request to YouTube Data API v3.

        Raises:
            QuotaExceededError: When API quota is exceeded
            NetworkError: When network connection fails
            YouTubeAPIError: For other API errors
        """
        params["key"] = self.api_key
        timeout = timeout or self.READ_TIMEOUT

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.CONNECT_TIMEOUT, read=timeout)) as client:
                response = await client.get(f"{self.base_url}/{endpoint}", params=params)

                if response.status_code == 403:
                    error_data = response.json()
                    error_reason = error_data.get("error", {}).get("errors", [{}])[0].get("reason", "")
                    if error_reason in ("quotaExceeded", "dailyLimitExceeded"):
                        logger.warning("YouTube API quota exceeded")
                        raise QuotaExceededError("YouTube API 일일 할당량이 초과되었습니다.")
                    raise YouTubeAPIError(f"API access denied: {error_reason}")

                if response.status_code != 200:
                    logger.error(f"YouTube API error: {response.status_code} - {response.text}")
                    raise YouTubeAPIError(f"API returned status {response.status_code}")

                return response.json()

        except httpx.ConnectError as e:
            logger.error(f"Network connection error: {e}")
            raise NetworkError("YouTube API에 연결할 수 없습니다. 네트워크를 확인해주세요.")
        except httpx.TimeoutException as e:
            logger.error(f"Request timeout: {e}")
            raise NetworkError("YouTube API 요청 시간이 초과되었습니다.")
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise NetworkError(f"요청 중 오류가 발생했습니다: {str(e)}")

    async def _get_video_statistics(self, video_ids: list[str]) -> dict[str, dict]:
        """
        Fetch video statistics (view count, like count, etc.) for multiple videos.
        Returns a dict mapping video_id to statistics.
        """
        if not video_ids or not self._has_api_key():
            return {}

        # Check cache first
        cached = await self._cache.get_video_details(video_ids)
        if cached:
            return cached

        try:
            # YouTube API allows up to 50 video IDs per request
            stats = {}
            for i in range(0, len(video_ids), 50):
                batch = video_ids[i:i + 50]
                data = await self._make_api_request(
                    "videos",
                    {
                        "id": ",".join(batch),
                        "part": "statistics,contentDetails"
                    }
                )

                for item in data.get("items", []):
                    video_id = item.get("id", "")
                    statistics = item.get("statistics", {})
                    content_details = item.get("contentDetails", {})
                    duration_str = content_details.get("duration", "PT0S")
                    duration_seconds = self._parse_duration(duration_str)

                    stats[video_id] = {
                        "view_count": int(statistics.get("viewCount", 0)),
                        "like_count": int(statistics.get("likeCount", 0)),
                        "comment_count": int(statistics.get("commentCount", 0)),
                        "duration_seconds": duration_seconds
                    }

            # Cache the results
            await self._cache.set_video_details(video_ids, stats)
            return stats

        except YouTubeAPIError:
            return {}

    def _parse_duration(self, duration_str: str) -> int:
        """Parse ISO 8601 duration (PT1H2M3S) to seconds"""
        import re
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds

    # Minimum video duration in seconds (filter out Shorts < 60s)
    MIN_VIDEO_DURATION = 60

    async def search_worship_videos(
        self,
        query: str = "찬양 예배",
        days_back: int = 7,
        max_results: int = 20
    ) -> list[VideoInfo]:
        """Search for recent worship videos"""
        # If no API key, return mock data for demo
        if not self._has_api_key():
            logger.info("No YouTube API key configured, using mock data")
            return self._get_mock_videos()

        # Check cache first
        cached = await self._cache.get_search_results(query, days_back)
        if cached:
            logger.info(f"Returning cached search results for query: {query}")
            return [VideoInfo(**v) for v in cached]

        try:
            published_after = (datetime.utcnow() - timedelta(days=days_back)).isoformat() + "Z"

            data = await self._make_api_request(
                "search",
                {
                    "q": query,
                    "type": "video",
                    "part": "snippet",
                    "order": "date",
                    "publishedAfter": published_after,
                    "maxResults": max_results,
                    "relevanceLanguage": "ko",
                    "regionCode": "KR"
                }
            )

            video_ids = []
            videos = []

            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                video_id = item.get("id", {}).get("videoId", "")
                if video_id:
                    video_ids.append(video_id)

                published_str = snippet.get("publishedAt", "")
                try:
                    published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    published_at = datetime.utcnow()

                videos.append({
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "channel_name": snippet.get("channelTitle", ""),
                    "published_at": published_at,
                    "view_count": 0,  # Will be updated below
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                    "video_url": f"https://www.youtube.com/watch?v={video_id}",
                    "extracted_songs": self._extract_songs_from_title(snippet.get("title", "")),
                    "service_type": self._extract_service_type(snippet.get("title", ""))
                })

            # Fetch view counts and durations for all videos
            stats = await self._get_video_statistics(video_ids)
            filtered_videos = []
            for video in videos:
                video_stats = stats.get(video["video_id"], {})
                video["view_count"] = video_stats.get("view_count", 0)
                duration = video_stats.get("duration_seconds", 0)
                # Filter out Shorts (videos under 60 seconds)
                if duration >= self.MIN_VIDEO_DURATION or duration == 0:
                    filtered_videos.append(video)
                else:
                    logger.debug(f"Filtered out short video: {video['title']} ({duration}s)")

            # Convert to VideoInfo objects
            result = [VideoInfo(**v) for v in filtered_videos]

            # Cache the results (serialize datetime for caching)
            cache_data = [
                {**v, "published_at": v["published_at"].isoformat()}
                for v in videos
            ]
            await self._cache.set_search_results(query, days_back, cache_data)

            return result

        except QuotaExceededError:
            logger.warning("Quota exceeded, falling back to mock data")
            return self._get_mock_videos()
        except (NetworkError, YouTubeAPIError) as e:
            logger.error(f"API error during search: {e}")
            return self._get_mock_videos()

    async def get_channel_recent_videos(
        self,
        channel_id: str,
        max_results: int = 10,
        days_back: int = 7
    ) -> list[VideoInfo]:
        """Get recent videos from a specific channel within the specified time period"""
        if not self._has_api_key():
            return []

        # Cache key includes days_back for different periods
        cache_key = f"{channel_id}:{days_back}"
        cached = await self._cache.get_channel_videos(cache_key)
        if cached:
            logger.info(f"Returning cached videos for channel: {channel_id} ({days_back} days)")
            return [VideoInfo(**v) for v in cached]

        try:
            # First get the uploads playlist
            data = await self._make_api_request(
                "channels",
                {
                    "id": channel_id,
                    "part": "contentDetails,snippet"
                }
            )

            items = data.get("items", [])
            if not items:
                logger.warning(f"Channel not found: {channel_id}")
                return []

            channel_info = items[0]
            channel_name = channel_info.get("snippet", {}).get("title", "")
            uploads_playlist = channel_info.get("contentDetails", {}).get(
                "relatedPlaylists", {}
            ).get("uploads", "")

            if not uploads_playlist:
                return []

            # Get videos from uploads playlist
            data = await self._make_api_request(
                "playlistItems",
                {
                    "playlistId": uploads_playlist,
                    "part": "snippet,contentDetails",
                    "maxResults": max_results
                }
            )

            video_ids = []
            videos = []
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)

            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                video_id = snippet.get("resourceId", {}).get("videoId", "")
                if not video_id:
                    continue

                published_str = snippet.get("publishedAt", "")
                try:
                    published_at = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                    # Make cutoff_date timezone-aware for comparison
                    if published_at.tzinfo is not None:
                        from datetime import timezone
                        cutoff_aware = cutoff_date.replace(tzinfo=timezone.utc)
                    else:
                        cutoff_aware = cutoff_date
                    # Filter by date - skip videos older than days_back
                    if published_at < cutoff_aware:
                        continue
                except (ValueError, AttributeError):
                    published_at = datetime.utcnow()

                video_ids.append(video_id)
                videos.append({
                    "video_id": video_id,
                    "title": snippet.get("title", ""),
                    "channel_name": channel_name or snippet.get("channelTitle", ""),
                    "published_at": published_at,
                    "view_count": 0,
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                    "video_url": f"https://www.youtube.com/watch?v={video_id}",
                    "extracted_songs": self._extract_songs_from_title(snippet.get("title", "")),
                    "service_type": self._extract_service_type(snippet.get("title", ""))
                })

            # Fetch view counts and filter out shorts
            stats = await self._get_video_statistics(video_ids)
            filtered_videos = []
            for video in videos:
                video_stats = stats.get(video["video_id"], {})
                video["view_count"] = video_stats.get("view_count", 0)
                duration = video_stats.get("duration_seconds", 0)
                # Filter out Shorts (videos under 60 seconds)
                if duration >= self.MIN_VIDEO_DURATION or duration == 0:
                    filtered_videos.append(video)
                else:
                    logger.debug(f"Filtered out short video: {video['title']} ({duration}s)")

            result = [VideoInfo(**v) for v in filtered_videos]

            # Cache the results with period-specific key
            cache_data = [
                {**v, "published_at": v["published_at"].isoformat()}
                for v in filtered_videos
            ]
            await self._cache.set_channel_videos(cache_key, cache_data)

            return result

        except QuotaExceededError:
            logger.warning(f"Quota exceeded when fetching channel {channel_id}")
            return []
        except (NetworkError, YouTubeAPIError) as e:
            logger.error(f"API error for channel {channel_id}: {e}")
            return []

    async def analyze_weekly_trends(self, days_back: int = 7) -> TrendAnalysis:
        """Analyze worship trends from the past week"""
        # Check cache first
        cached = await self._cache.get_trend_analysis(days_back)
        if cached:
            logger.info(f"Returning cached trend analysis for {days_back} days")
            # Reconstruct VideoInfo objects
            cached["recent_videos"] = [
                VideoInfo(**v) if isinstance(v, dict) else v
                for v in cached.get("recent_videos", [])
            ]
            cached["is_cached"] = True
            # Handle both string and datetime objects for period dates
            if isinstance(cached.get("period_start"), str):
                cached["period_start"] = datetime.fromisoformat(cached["period_start"])
            if isinstance(cached.get("period_end"), str):
                cached["period_end"] = datetime.fromisoformat(cached["period_end"])
            if cached.get("last_updated") and isinstance(cached["last_updated"], str):
                cached["last_updated"] = datetime.fromisoformat(cached["last_updated"])
            return TrendAnalysis(**cached)

        is_mock_data = not self._has_api_key()
        all_videos = []

        if self._has_api_key():
            # Collect videos from known channels (limit to avoid quota issues)
            for channel in WORSHIP_CHANNELS[:8]:
                try:
                    # Pass days_back to get videos from the correct time period
                    videos = await self.get_channel_recent_videos(
                        channel.channel_id,
                        max_results=20,  # Get more results for better filtering
                        days_back=days_back
                    )
                    all_videos.extend(videos)
                except Exception as e:
                    logger.error(f"Error fetching channel {channel.name}: {e}")
                    continue

            # Also search for general worship content
            try:
                search_videos = await self.search_worship_videos(
                    query="찬양 예배 live worship",
                    days_back=days_back
                )
                all_videos.extend(search_videos)
            except Exception as e:
                logger.error(f"Error in search: {e}")

        # If no videos collected (API issues or no key), use mock data
        if not all_videos:
            is_mock_data = True
            all_videos = self._get_mock_videos()

        # Analyze songs
        song_counts: dict[str, dict] = {}
        channel_stats: dict[str, dict] = {}

        for video in all_videos:
            # Count channel stats
            ch_name = video.channel_name
            if ch_name not in channel_stats:
                channel_stats[ch_name] = {"name": ch_name, "video_count": 0, "total_views": 0}
            channel_stats[ch_name]["video_count"] += 1
            channel_stats[ch_name]["total_views"] += video.view_count

            # Count song mentions - store video URL for direct linking
            for song in video.extracted_songs:
                # Skip non-song content
                if self._is_non_song_content(song):
                    continue
                if song not in song_counts:
                    song_counts[song] = {
                        "title": song,
                        "count": 0,
                        "channels": set(),
                        "video_url": video.video_url  # Store first video URL
                    }
                song_counts[song]["count"] += 1
                song_counts[song]["channels"].add(ch_name)

        # Convert to lists and sort
        top_songs = sorted(
            [{"title": s["title"], "count": s["count"], "channels": list(s["channels"]), "video_url": s.get("video_url", "")}
             for s in song_counts.values()],
            key=lambda x: x["count"],
            reverse=True
        )[:10]

        top_channels = sorted(
            list(channel_stats.values()),
            key=lambda x: x["video_count"],
            reverse=True
        )[:5]

        # Sort videos by date
        recent_videos = sorted(all_videos, key=lambda x: x.published_at, reverse=True)[:20]

        # Generate insights
        insights = self._generate_insights(top_songs, top_channels, len(all_videos), is_mock_data)

        now = datetime.utcnow()
        analysis = TrendAnalysis(
            period_start=now - timedelta(days=days_back),
            period_end=now,
            top_songs=top_songs,
            top_channels=top_channels,
            recent_videos=recent_videos,
            insights=insights,
            is_cached=False,
            last_updated=now,
            is_mock_data=is_mock_data
        )

        # Cache the analysis (serialize for caching)
        cache_data = {
            "period_start": analysis.period_start.isoformat(),
            "period_end": analysis.period_end.isoformat(),
            "top_songs": analysis.top_songs,
            "top_channels": analysis.top_channels,
            "recent_videos": [
                {**v.model_dump(), "published_at": v.published_at.isoformat()}
                for v in analysis.recent_videos
            ],
            "insights": analysis.insights,
            "is_mock_data": is_mock_data,
            "last_updated": now.isoformat()
        }
        await self._cache.set_trend_analysis(days_back, cache_data)

        return analysis

    def _extract_songs_from_title(self, title: str) -> list[str]:
        """
        Extract song names from video title using multiple regex patterns.
        Improved to handle various Korean worship video title formats.
        """
        songs = []

        # Clean the title first
        title = title.strip()

        # Pattern 1: Songs in various bracket types
        # e.g., [주의 사랑], 「예수 내 삶의」, 『아름다우신』, (좋으신 하나님)
        bracket_patterns = [
            r'\[([^\[\]]+)\]',  # [song name]
            r'「([^「」]+)」',  # 「song name」
            r'『([^『』]+)』',  # 『song name』
            r'【([^【】]+)】',  # 【song name】
            r'〔([^〔〕]+)〕',  # 〔song name〕
        ]

        for pattern in bracket_patterns:
            matches = re.findall(pattern, title)
            for match in matches:
                match = match.strip()
                # Filter out non-song content (team names, dates, etc.)
                if len(match) > 1 and not self._is_metadata(match):
                    songs.append(match)

        # Pattern 2: Songs separated by + or /
        # e.g., "주의 사랑 + 좋으신 하나님" or "성령이여 / 아름다우신"
        separator_pattern = r'([가-힣a-zA-Z][가-힣a-zA-Z\s]{1,20})\s*[+/]\s*([가-힣a-zA-Z][가-힣a-zA-Z\s]{1,20})'
        matches = re.findall(separator_pattern, title)
        for match_pair in matches:
            for match in match_pair:
                match = match.strip()
                if len(match) > 1 and not self._is_metadata(match):
                    songs.append(match)

        # Pattern 3: Korean title before dash or pipe (common format)
        # e.g., "주의 사랑이 나를 놓지 않네 - 마커스워십"
        dash_pattern = r'^([가-힣][가-힣\s]{2,25})\s*[-|–—]'
        match = re.search(dash_pattern, title)
        if match:
            song = match.group(1).strip()
            if not self._is_metadata(song):
                songs.append(song)

        # Pattern 4: Music note markers
        # e.g., ♪ 주의 사랑 ♪
        note_pattern = r'[♪♫♬]\s*([^♪♫♬]+)\s*[♪♫♬]?'
        matches = re.findall(note_pattern, title)
        for match in matches:
            match = match.strip()
            if len(match) > 1 and not self._is_metadata(match):
                songs.append(match)

        # Pattern 5: Quotes
        # e.g., "주의 사랑" or '예수 내 삶의'
        quote_pattern = r'["\']([^"\']{2,25})["\']'
        matches = re.findall(quote_pattern, title)
        for match in matches:
            match = match.strip()
            if not self._is_metadata(match):
                songs.append(match)

        # Pattern 6: Known song keywords (fallback) - only specific song titles
        known_song_titles = [
            "주의 사랑이 나를 놓지 않네", "아름다우신", "좋으신 하나님", "성령이여 오소서",
            "나의 가는 길", "예수 내 삶의 주님", "주 안에서 행복", "하나님의 세계",
            "주의 임재 앞에", "은혜", "다 갚을 수 없는", "여호와 이레",
            "나 무엇과도 주님을 바꿀 수 없네", "나 같은 죄인 살리신", "주 하나님 지으신 모든 세계",
            "내 주를 가까이 하게 함은", "주 예수 내게 오사", "만복의 근원 하나님",
            "예수 사랑하심은", "날 위해 십자가의", "예수 부활했으니",
            "거룩 거룩 거룩", "주님의 은혜라", "주 품에 품으소서", "살아계신 주",
            "내 주 되신 주를 참 사랑하고", "주 예수보다 더 귀한 것은 없네",
            "마음을 다해", "하나님은 너를 지키시는 자", "눈을 들어 주를 보라",
            "주를 향한 나의 사랑", "주님의 영", "성령의 바람",
            "What A Beautiful Name", "Reckless Love", "Good Good Father",
            "Oceans", "Way Maker", "Blessed Be Your Name", "Holy Spirit",
            "Build My Life", "Goodness of God", "Great Are You Lord"
        ]

        for song_title in known_song_titles:
            if song_title.lower() in title.lower():
                songs.append(song_title)

        # Remove duplicates while preserving order
        seen = set()
        unique_songs = []
        for song in songs:
            song_lower = song.lower()
            if song_lower not in seen:
                seen.add(song_lower)
                unique_songs.append(song)

        return unique_songs[:5]  # Limit to 5 songs per video

    def _is_non_song_content(self, text: str) -> bool:
        """
        Filter out content that is clearly not a worship song.
        This is a stricter filter applied after initial extraction.
        """
        text_lower = text.lower().strip()

        # Technical/equipment terms
        tech_terms = [
            '방송실', '방송', 'bass', 'guitar', 'drum', 'piano solo', 'inst', 'mr',
            '악기', '반주', 'gutar', '베이스', '드럼', '기타', '키보드', 'keyboard',
            '연주', 'instrumental', 'bgm', '배경음악', 'backing', 'track'
        ]

        # Non-song content patterns
        non_song_patterns = [
            '예배', '설교', '말씀', '기도', '광고', '공지', '안내', '인사', '축도',
            '봉헌', '헌금', '성경', '찬양집회', '간증', '세례', '성찬',
            '생방송', '라이브', 'live', 'replay', '다시보기', '재방송',
            '워십팀', '찬양팀', '성가대', '합창', 'choir', '밴드', 'band',
            '연습', '리허설', 'rehearsal', 'practice', 'soundcheck',
            '튜토리얼', 'tutorial', '강좌', '배우기', 'how to', 'lesson'
        ]

        # Check tech terms
        for term in tech_terms:
            if term in text_lower:
                return True

        # Check non-song patterns
        for pattern in non_song_patterns:
            if pattern in text_lower:
                return True

        # Names with specific patterns (e.g., "Bass gutar Jiyong")
        if re.search(r'(bass|drum|guitar|piano)\s+\w+\s+\w+', text_lower):
            return True

        # Very short text (less than 2 characters) is likely not a song
        if len(text.strip()) < 2:
            return True

        # Text that's just a number
        if text.strip().isdigit():
            return True

        return False

    def _is_metadata(self, text: str) -> bool:
        """Check if text is likely metadata rather than a song title"""
        metadata_patterns = [
            r'^\d{4}',  # Year (2024, 2025, etc.)
            r'^\d+월',  # Month (1월, 12월)
            r'(live|라이브|official|공식)',  # Live/Official markers
            r'(주일예배|수요예배|새벽예배|청년예배)',  # Service types
            r'(컨퍼런스|집회|찬양집회)',  # Event types
            r'(교회|워십|worship)',  # Church/Worship
            r'^(ep\.?\s*\d+|#\d+)',  # Episode numbers
            r'(full|ver\.|version)',  # Version markers
        ]

        # Generic words that should not be considered song titles
        generic_words = {
            '찬양', '경배', '예배', 'worship', 'praise', 'live', 'official',
            '라이브', '공식', 'music', '뮤직', 'ccm', 'playlist', '플레이리스트',
            'cover', '커버', 'piano', '피아노', 'guitar', '기타', 'bass', '베이스',
            'drum', '드럼', 'mr', 'inst', '반주', 'gutar', '악기'  # Include typos too
        }

        if text.lower().strip() in generic_words:
            return True

        text_lower = text.lower()
        for pattern in metadata_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        return False

    def _extract_service_type(self, title: str) -> Optional[str]:
        """Extract service type from video title"""
        service_types = {
            "주일예배": ["주일", "주일예배", "sunday"],
            "수요예배": ["수요", "수요예배", "wednesday"],
            "새벽예배": ["새벽", "새벽예배", "dawn"],
            "청년예배": ["청년", "청년예배", "youth"],
            "금요예배": ["금요", "금요예배", "friday"],
            "컨퍼런스": ["컨퍼런스", "conference", "집회"],
            "라이브": ["live", "라이브", "생방송"],
        }

        title_lower = title.lower()
        for service_type, keywords in service_types.items():
            for keyword in keywords:
                if keyword in title_lower:
                    return service_type

        return None

    def _generate_insights(
        self,
        top_songs: list[dict],
        top_channels: list[dict],
        total_videos: int,
        is_mock_data: bool = False
    ) -> str:
        """Generate text insights from trend data"""
        insights = []

        if is_mock_data:
            insights.append("(데모 데이터 - YouTube API 키를 설정하면 실제 데이터를 확인할 수 있습니다)")

        if top_songs:
            top_song = top_songs[0]
            insights.append(
                f"이번 주 가장 많이 사용된 곡은 '{top_song['title']}'입니다 "
                f"({top_song['count']}회, {len(top_song['channels'])}개 채널)."
            )

        if top_channels:
            active_channel = top_channels[0]
            insights.append(
                f"가장 활발한 채널은 '{active_channel['name']}'으로 "
                f"{active_channel['video_count']}개의 영상을 업로드했습니다."
            )

        insights.append(f"총 {total_videos}개의 예배 영상이 분석되었습니다.")

        return " ".join(insights)

    def _get_mock_videos(self) -> list[VideoInfo]:
        """Return mock data for demo without API key"""
        now = datetime.utcnow()
        return [
            VideoInfo(
                video_id="mock1",
                title="[마커스워십] 주의 사랑이 나를 놓지 않네 + 좋으신 하나님 | 2024 겨울 컨퍼런스",
                channel_name="마커스워십",
                published_at=now - timedelta(days=1),
                view_count=15000,
                thumbnail_url="https://i.ytimg.com/vi/Sc6SSHuZvQE/hqdefault.jpg",
                video_url="https://www.youtube.com/watch?v=mock1",
                extracted_songs=["주의 사랑", "좋으신 하나님"],
                service_type="컨퍼런스"
            ),
            VideoInfo(
                video_id="mock2",
                title="어노인팅 예배 - 성령이여 오소서 / 아름다우신 | 주일예배",
                channel_name="어노인팅",
                published_at=now - timedelta(days=2),
                view_count=8500,
                thumbnail_url="https://i.ytimg.com/vi/example/hqdefault.jpg",
                video_url="https://www.youtube.com/watch?v=mock2",
                extracted_songs=["성령이여", "아름다우신"],
                service_type="주일예배"
            ),
            VideoInfo(
                video_id="mock3",
                title="제이어스 - 나의 가는 길 + 예수 내 삶의 주님 (Live)",
                channel_name="제이어스",
                published_at=now - timedelta(days=3),
                view_count=12000,
                thumbnail_url="https://i.ytimg.com/vi/example2/hqdefault.jpg",
                video_url="https://www.youtube.com/watch?v=mock3",
                extracted_songs=["나의 가는 길", "예수 내 삶의"],
                service_type="라이브"
            ),
            VideoInfo(
                video_id="mock4",
                title="YWAM워십 | 주 안에서 행복 + 하나님의 세계 | 청년예배",
                channel_name="YWAM워십",
                published_at=now - timedelta(days=4),
                view_count=6000,
                thumbnail_url="https://i.ytimg.com/vi/example3/hqdefault.jpg",
                video_url="https://www.youtube.com/watch?v=mock4",
                extracted_songs=["주 안에서", "하나님의 세계"],
                service_type="청년예배"
            ),
            VideoInfo(
                video_id="mock5",
                title="[Hillsong] What A Beautiful Name + Reckless Love | Sunday Service",
                channel_name="Hillsong Worship",
                published_at=now - timedelta(days=5),
                view_count=50000,
                thumbnail_url="https://i.ytimg.com/vi/example4/hqdefault.jpg",
                video_url="https://www.youtube.com/watch?v=mock5",
                extracted_songs=["What A Beautiful Name", "Reckless Love"],
                service_type="주일예배"
            ),
        ]


# Singleton instance
youtube_service = YouTubeService()
