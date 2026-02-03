from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models import Song, User, Favorite


router = APIRouter(prefix="/favorites", tags=["favorites"])


class FavoriteResponse(BaseModel):
    id: int
    song_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteSongResponse(BaseModel):
    id: int
    title: str
    title_en: str | None
    artist: str
    default_key: str
    bpm: int | None
    duration_sec: int | None
    youtube_url: str | None
    favorited_at: datetime

    class Config:
        from_attributes = True


class FavoriteListResponse(BaseModel):
    favorites: List[FavoriteSongResponse]
    total: int


@router.post("/{song_id}", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    song_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a song to user's favorites."""
    # Check if song exists
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # Check if already favorited
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.song_id == song_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Song already in favorites")

    # Create favorite
    favorite = Favorite(user_id=current_user.id, song_id=song_id)
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)

    return favorite


@router.delete("/{song_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    song_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a song from user's favorites."""
    result = await db.execute(
        select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.song_id == song_id
        )
    )
    favorite = result.scalar_one_or_none()
    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite not found")

    await db.delete(favorite)
    await db.commit()


@router.get("", response_model=FavoriteListResponse)
async def get_favorites(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's favorite songs list."""
    result = await db.execute(
        select(Favorite, Song)
        .join(Song, Favorite.song_id == Song.id)
        .where(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
    )
    rows = result.all()

    favorites = [
        FavoriteSongResponse(
            id=song.id,
            title=song.title,
            title_en=song.title_en,
            artist=song.artist,
            default_key=song.default_key,
            bpm=song.bpm,
            duration_sec=song.duration_sec,
            youtube_url=song.youtube_url,
            favorited_at=favorite.created_at
        )
        for favorite, song in rows
    ]

    return FavoriteListResponse(favorites=favorites, total=len(favorites))


@router.get("/ids", response_model=List[int])
async def get_favorite_ids(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of song IDs that user has favorited."""
    result = await db.execute(
        select(Favorite.song_id).where(Favorite.user_id == current_user.id)
    )
    return [row[0] for row in result.all()]
