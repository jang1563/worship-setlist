"""YouTube Worship Trends API Routes"""
from fastapi import APIRouter, Query
from typing import Optional

from app.services.youtube_service import (
    youtube_service,
    WorshipChannel,
    VideoInfo,
    TrendAnalysis
)
from app.services.youtube_cache import youtube_cache

router = APIRouter(prefix="/trends", tags=["trends"])


@router.get("/channels", response_model=list[WorshipChannel])
async def get_worship_channels(
    category: Optional[str] = Query(None, description="Filter by category: korean, international")
):
    """Get list of known worship team YouTube channels"""
    return youtube_service.get_known_channels(category)


@router.get("/search", response_model=list[VideoInfo])
async def search_worship_videos(
    query: str = Query("찬양 예배", description="Search query"),
    days_back: int = Query(7, ge=1, le=30, description="Days to look back"),
    max_results: int = Query(20, ge=1, le=50, description="Maximum results")
):
    """Search for recent worship videos on YouTube"""
    return await youtube_service.search_worship_videos(query, days_back, max_results)


@router.get("/channel/{channel_id}/videos", response_model=list[VideoInfo])
async def get_channel_videos(
    channel_id: str,
    max_results: int = Query(10, ge=1, le=50, description="Maximum results")
):
    """Get recent videos from a specific worship channel"""
    return await youtube_service.get_channel_recent_videos(channel_id, max_results)


@router.get("/weekly", response_model=TrendAnalysis)
async def get_weekly_trends(
    days_back: int = Query(7, ge=1, le=365, description="Days to analyze"),
    force_refresh: bool = Query(False, description="Force refresh cache")
):
    """Get weekly worship trend analysis

    Returns:
    - Top songs used across worship teams
    - Most active channels
    - Recent worship videos with extracted setlists
    - AI-generated insights
    """
    if force_refresh:
        # Clear trend cache for this period
        await youtube_cache._backend.delete(f"trends:{days_back}")
    return await youtube_service.analyze_weekly_trends(days_back)


@router.post("/cache/clear")
async def clear_trends_cache():
    """Clear all YouTube trends cache"""
    count = await youtube_cache.clear_all()
    return {"message": f"Cleared {count} cache entries", "cleared": count}


@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    return await youtube_cache.get_stats()


@router.get("/song-popularity")
async def get_song_popularity(
    song_title: str = Query(..., description="Song title to search"),
    days_back: int = Query(30, ge=1, le=90, description="Days to analyze")
):
    """Check how popular a specific song is across worship channels"""
    videos = await youtube_service.search_worship_videos(song_title, days_back, 50)

    channels_using = set()
    video_count = 0

    for video in videos:
        if song_title.lower() in video.title.lower():
            channels_using.add(video.channel_name)
            video_count += 1

    return {
        "song_title": song_title,
        "video_count": video_count,
        "channels": list(channels_using),
        "channel_count": len(channels_using),
        "recent_videos": videos[:5]
    }
