from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user_optional
from app.models import Setlist, SetlistSong, Song
from app.models.user import User
from app.schemas.setlist import (
    SetlistCreate, SetlistUpdate, SetlistResponse, SetlistListResponse,
    SetlistSongCreate, SetlistSongResponse
)
from app.schemas.song import SongResponse

router = APIRouter(prefix="/setlists", tags=["setlists"])


@router.get("", response_model=SetlistListResponse)
async def get_setlists(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(Setlist).options(
        selectinload(Setlist.songs).selectinload(SetlistSong.song)
    ).order_by(Setlist.created_at.desc())

    # Count total
    count_query = select(func.count()).select_from(Setlist)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    setlists = result.scalars().unique().all()

    return SetlistListResponse(
        setlists=[_setlist_to_response(s) for s in setlists],
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/{setlist_id}", response_model=SetlistResponse)
async def get_setlist(setlist_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs).selectinload(SetlistSong.song))
        .where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")
    return _setlist_to_response(setlist)


@router.post("", response_model=SetlistResponse)
async def create_setlist(
    setlist_data: SetlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    setlist = Setlist(
        title=setlist_data.title,
        date=setlist_data.date,
        service_type=setlist_data.service_type,
        sermon_topic=setlist_data.sermon_topic,
        sermon_scripture=setlist_data.sermon_scripture,
        total_duration_sec=setlist_data.total_duration_sec,
        notes=setlist_data.notes,
        is_public=setlist_data.is_public
    )
    db.add(setlist)
    await db.flush()

    # Add songs
    for song_data in setlist_data.songs:
        setlist_song = SetlistSong(
            setlist_id=setlist.id,
            song_id=song_data.song_id,
            order=song_data.order,
            key=song_data.key,
            transition_type=song_data.transition_type,
            transition_chord_progression=song_data.transition_chord_progression,
            transition_notes=song_data.transition_notes,
            role=song_data.role,
            scripture_ref=song_data.scripture_ref,
            notes=song_data.notes
        )
        db.add(setlist_song)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs).selectinload(SetlistSong.song))
        .where(Setlist.id == setlist.id)
    )
    setlist = result.scalar_one()
    return _setlist_to_response(setlist)


@router.put("/{setlist_id}", response_model=SetlistResponse)
async def update_setlist(
    setlist_id: int,
    setlist_data: SetlistUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs))
        .where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    update_data = setlist_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setlist, field, value)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs).selectinload(SetlistSong.song))
        .where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one()
    return _setlist_to_response(setlist)


@router.delete("/{setlist_id}")
async def delete_setlist(
    setlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    result = await db.execute(select(Setlist).where(Setlist.id == setlist_id))
    setlist = result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    await db.delete(setlist)
    await db.commit()
    return {"message": "Setlist deleted successfully"}


@router.put("/{setlist_id}/songs", response_model=SetlistResponse)
async def update_setlist_songs(
    setlist_id: int,
    songs: list[SetlistSongCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)
):
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs))
        .where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    # Delete existing songs
    for song in setlist.songs:
        await db.delete(song)

    # Add new songs
    for song_data in songs:
        setlist_song = SetlistSong(
            setlist_id=setlist_id,
            song_id=song_data.song_id,
            order=song_data.order,
            key=song_data.key,
            transition_type=song_data.transition_type,
            transition_chord_progression=song_data.transition_chord_progression,
            transition_notes=song_data.transition_notes,
            role=song_data.role,
            scripture_ref=song_data.scripture_ref,
            notes=song_data.notes
        )
        db.add(setlist_song)

    # Calculate total duration
    total_duration = 0
    for song_data in songs:
        song_result = await db.execute(select(Song).where(Song.id == song_data.song_id))
        song = song_result.scalar_one_or_none()
        if song and song.duration_sec:
            total_duration += song.duration_sec
    setlist.total_duration_sec = total_duration

    await db.commit()

    # Expire the cached setlist to force fresh load of relationships
    db.expire(setlist)

    # Reload with relationships
    result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs).selectinload(SetlistSong.song))
        .where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one()
    return _setlist_to_response(setlist)


def _setlist_to_response(setlist: Setlist) -> SetlistResponse:
    songs = []
    for ss in sorted(setlist.songs, key=lambda x: x.order):
        song_response = None
        if ss.song:
            song_response = SongResponse(
                id=ss.song.id,
                title=ss.song.title,
                title_en=ss.song.title_en,
                title_original=ss.song.title_original,
                artist=ss.song.artist,
                album=ss.song.album,
                year=ss.song.year,
                default_key=ss.song.default_key,
                bpm=ss.song.bpm,
                duration_sec=ss.song.duration_sec,
                mood_tags=ss.song.mood_tags,
                service_types=ss.song.service_types,
                season_tags=ss.song.season_tags,
                difficulty=ss.song.difficulty,
                min_instruments=ss.song.min_instruments,
                vocal_range_low=ss.song.vocal_range_low,
                vocal_range_high=ss.song.vocal_range_high,
                scripture_refs=ss.song.scripture_refs,
                scripture_connection=ss.song.scripture_connection,
                youtube_url=ss.song.youtube_url,
                hymn_number=ss.song.hymn_number,
                created_at=ss.song.created_at,
                updated_at=ss.song.updated_at
            )

        songs.append(SetlistSongResponse(
            id=ss.id,
            song_id=ss.song_id,
            order=ss.order,
            key=ss.key,
            transition_type=ss.transition_type,
            transition_chord_progression=ss.transition_chord_progression,
            transition_notes=ss.transition_notes,
            role=ss.role,
            scripture_ref=ss.scripture_ref,
            notes=ss.notes,
            song=song_response
        ))

    return SetlistResponse(
        id=setlist.id,
        title=setlist.title,
        date=setlist.date,
        service_type=setlist.service_type,
        sermon_topic=setlist.sermon_topic,
        sermon_scripture=setlist.sermon_scripture,
        total_duration_sec=setlist.total_duration_sec,
        notes=setlist.notes,
        is_public=setlist.is_public,
        songs=songs,
        created_at=setlist.created_at,
        updated_at=setlist.updated_at
    )
