from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models import Song, ChordChart
from app.models.user import User
from app.schemas.song import (
    SongCreate, SongUpdate, SongResponse, SongListResponse,
    ChordChartCreate, ChordChartResponse
)

router = APIRouter(prefix="/songs", tags=["songs"])


@router.get("", response_model=SongListResponse)
async def get_songs(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=1000),
    search: Optional[str] = None,
    artist: Optional[str] = None,
    key: Optional[str] = None,
    mood: Optional[str] = None,
    service_type: Optional[str] = None,
):
    query = select(Song)

    if search:
        query = query.where(
            Song.title.ilike(f"%{search}%") |
            Song.title_en.ilike(f"%{search}%") |
            Song.artist.ilike(f"%{search}%")
        )
    if artist:
        query = query.where(Song.artist.ilike(f"%{artist}%"))
    if key:
        query = query.where(Song.default_key == key)
    if mood:
        query = query.where(Song._mood_tags.ilike(f"%{mood}%"))
    if service_type:
        query = query.where(Song._service_types.ilike(f"%{service_type}%"))

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    songs = result.scalars().all()

    return SongListResponse(
        songs=[_song_to_response(s) for s in songs],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{song_id}", response_model=SongResponse)
async def get_song(song_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")
    return _song_to_response(song)


@router.post("", response_model=SongResponse)
async def create_song(
    song_data: SongCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    song = Song(
        title=song_data.title,
        title_en=song_data.title_en,
        title_original=song_data.title_original,
        artist=song_data.artist,
        album=song_data.album,
        year=song_data.year,
        default_key=song_data.default_key,
        bpm=song_data.bpm,
        duration_sec=song_data.duration_sec,
        difficulty=song_data.difficulty,
        vocal_range_low=song_data.vocal_range_low,
        vocal_range_high=song_data.vocal_range_high,
        scripture_connection=song_data.scripture_connection,
        youtube_url=song_data.youtube_url,
        hymn_number=song_data.hymn_number,
    )
    song.mood_tags = song_data.mood_tags
    song.service_types = song_data.service_types
    song.season_tags = song_data.season_tags
    song.min_instruments = song_data.min_instruments
    song.scripture_refs = song_data.scripture_refs

    db.add(song)
    await db.commit()
    await db.refresh(song)
    return _song_to_response(song)


@router.put("/{song_id}", response_model=SongResponse)
async def update_song(
    song_id: int,
    song_data: SongUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    update_data = song_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ["mood_tags", "service_types"]:
            setattr(song, field, value)
        else:
            setattr(song, field, value)

    await db.commit()
    await db.refresh(song)
    return _song_to_response(song)


@router.delete("/{song_id}")
async def delete_song(
    song_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    await db.delete(song)
    await db.commit()
    return {"message": "Song deleted successfully"}


@router.get("/{song_id}/chord-chart", response_model=list[ChordChartResponse])
async def get_chord_charts(song_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChordChart).where(ChordChart.song_id == song_id)
    )
    return result.scalars().all()


@router.post("/{song_id}/chord-chart", response_model=ChordChartResponse)
async def create_chord_chart(
    song_id: int,
    chart_data: ChordChartCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify song exists
    result = await db.execute(select(Song).where(Song.id == song_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Song not found")

    chart = ChordChart(
        song_id=song_id,
        key=chart_data.key,
        content=chart_data.content,
        source=chart_data.source,
        confidence=chart_data.confidence
    )
    db.add(chart)
    await db.commit()
    await db.refresh(chart)
    return chart


def _song_to_response(song: Song) -> SongResponse:
    return SongResponse(
        id=song.id,
        title=song.title,
        title_en=song.title_en,
        title_original=song.title_original,
        artist=song.artist,
        album=song.album,
        year=song.year,
        default_key=song.default_key,
        bpm=song.bpm,
        duration_sec=song.duration_sec,
        mood_tags=song.mood_tags,
        service_types=song.service_types,
        season_tags=song.season_tags,
        difficulty=song.difficulty,
        min_instruments=song.min_instruments,
        vocal_range_low=song.vocal_range_low,
        vocal_range_high=song.vocal_range_high,
        scripture_refs=song.scripture_refs,
        scripture_connection=song.scripture_connection,
        youtube_url=song.youtube_url,
        hymn_number=song.hymn_number,
        created_at=song.created_at,
        updated_at=song.updated_at
    )
