"""
Playlists API Routes

송리스트 기반 YouTube 플레이리스트 URL 생성 API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from app.api.deps import get_db
from app.models import Setlist, SetlistSong
from app.services.youtube_playlist import youtube_playlist_service


router = APIRouter(prefix="/playlists", tags=["playlists"])


class PlaylistUrlResponse(BaseModel):
    """플레이리스트 URL 응답"""
    setlist_id: int
    setlist_title: str
    playlist_url: Optional[str] = None
    embed_url: Optional[str] = None
    video_ids: list[str]
    total_songs: int
    songs_with_youtube: int
    songs_without_youtube: list[str]  # YouTube URL이 없는 곡 제목


class GeneratePlaylistRequest(BaseModel):
    """플레이리스트 생성 요청"""
    setlist_id: int


@router.post("/generate", response_model=PlaylistUrlResponse)
async def generate_playlist(
    request: GeneratePlaylistRequest,
    db: AsyncSession = Depends(get_db)
) -> PlaylistUrlResponse:
    """
    송리스트 ID로 YouTube 플레이리스트 URL을 생성합니다.

    - 송리스트에 포함된 곡들의 youtube_url 필드를 사용
    - OAuth 없이 watch_videos URL 형식으로 생성
    - YouTube URL이 없는 곡은 건너뜁니다
    """
    # 송리스트 조회
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs).selectinload(SetlistSong.song))
        .where(Setlist.id == request.setlist_id)
    )
    setlist = result.scalar_one_or_none()

    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    # 곡 순서대로 YouTube URL 수집
    sorted_songs = sorted(setlist.songs, key=lambda x: x.order)
    youtube_urls: list[str] = []
    song_titles: list[str] = []
    songs_without_youtube: list[str] = []

    for setlist_song in sorted_songs:
        if setlist_song.song:
            song_titles.append(setlist_song.song.title)
            if setlist_song.song.youtube_url:
                youtube_urls.append(setlist_song.song.youtube_url)
            else:
                songs_without_youtube.append(setlist_song.song.title)
        else:
            youtube_urls.append("")  # 곡 정보가 없는 경우

    # 플레이리스트 URL 생성
    playlist_result = youtube_playlist_service.generate_from_youtube_urls(youtube_urls)

    return PlaylistUrlResponse(
        setlist_id=setlist.id,
        setlist_title=setlist.title,
        playlist_url=playlist_result["playlist_url"],
        embed_url=playlist_result["embed_url"],
        video_ids=playlist_result["video_ids"],
        total_songs=len(sorted_songs),
        songs_with_youtube=playlist_result["valid_count"],
        songs_without_youtube=songs_without_youtube
    )


@router.get("/{setlist_id}/youtube-url", response_model=PlaylistUrlResponse)
async def get_youtube_url(
    setlist_id: int,
    db: AsyncSession = Depends(get_db)
) -> PlaylistUrlResponse:
    """
    송리스트의 YouTube 플레이리스트 URL을 반환합니다.

    바로 재생 가능한 URL을 반환하며, 새 탭에서 열면 됩니다.
    """
    # 위 함수와 동일한 로직 (GET 방식으로 간편 접근)
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs).selectinload(SetlistSong.song))
        .where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one_or_none()

    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    sorted_songs = sorted(setlist.songs, key=lambda x: x.order)
    youtube_urls: list[str] = []
    songs_without_youtube: list[str] = []

    for setlist_song in sorted_songs:
        if setlist_song.song:
            if setlist_song.song.youtube_url:
                youtube_urls.append(setlist_song.song.youtube_url)
            else:
                songs_without_youtube.append(setlist_song.song.title)

    playlist_result = youtube_playlist_service.generate_from_youtube_urls(youtube_urls)

    return PlaylistUrlResponse(
        setlist_id=setlist.id,
        setlist_title=setlist.title,
        playlist_url=playlist_result["playlist_url"],
        embed_url=playlist_result["embed_url"],
        video_ids=playlist_result["video_ids"],
        total_songs=len(sorted_songs),
        songs_with_youtube=playlist_result["valid_count"],
        songs_without_youtube=songs_without_youtube
    )
