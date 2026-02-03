import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.api.deps import get_db
from app.models import Setlist, SetlistSong, ShareToken
from app.schemas.setlist import SetlistResponse, SetlistSongResponse
from app.schemas.song import SongResponse


class ShareTokenCreate(BaseModel):
    """Request schema for creating share token"""
    expires_days: Optional[int] = 7


class ShareTokenResponse(BaseModel):
    """Response schema for share token"""
    token: str
    setlist_id: int
    expires_at: Optional[datetime]
    share_url: str


class SharedSetlistResponse(BaseModel):
    """Response schema for shared setlist"""
    setlist: SetlistResponse
    shared_at: datetime
    expires_at: Optional[datetime]


router = APIRouter(prefix="/share", tags=["share"])


def generate_share_token() -> str:
    """Generate a secure random token for sharing"""
    return secrets.token_urlsafe(32)


@router.post("/setlists/{setlist_id}", response_model=ShareTokenResponse)
async def create_share_link(
    setlist_id: int,
    request: ShareTokenCreate = ShareTokenCreate(),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a share link for a setlist.

    - **setlist_id**: ID of the setlist to share
    - **expires_days**: Number of days until the link expires (default: 7, None for never)
    """
    # Verify setlist exists
    result = await db.execute(
        select(Setlist).where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    # Generate token
    token = generate_share_token()

    # Calculate expiration
    expires_at = None
    if request.expires_days is not None:
        expires_at = datetime.utcnow() + timedelta(days=request.expires_days)

    # Store token in database
    share_token = ShareToken(
        token=token,
        setlist_id=setlist_id,
        expires_at=expires_at
    )
    db.add(share_token)
    await db.commit()

    return ShareTokenResponse(
        token=token,
        setlist_id=setlist_id,
        expires_at=expires_at,
        share_url=f"/shared/{token}"
    )


@router.get("/shared/{token}", response_model=SharedSetlistResponse)
async def get_shared_setlist(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a shared setlist by token.

    - **token**: The share token from the share link
    """
    # Find token in database
    result = await db.execute(
        select(ShareToken)
        .options(selectinload(ShareToken.setlist).selectinload(Setlist.songs).selectinload(SetlistSong.song))
        .where(ShareToken.token == token)
    )
    share_token = result.scalar_one_or_none()

    if not share_token:
        raise HTTPException(status_code=404, detail="Share link not found or expired")

    # Check expiration
    if share_token.expires_at and datetime.utcnow() > share_token.expires_at:
        # Clean up expired token
        await db.delete(share_token)
        await db.commit()
        raise HTTPException(status_code=404, detail="Share link has expired")

    # Check if setlist still exists (CASCADE should handle this, but be safe)
    if not share_token.setlist:
        await db.delete(share_token)
        await db.commit()
        raise HTTPException(status_code=404, detail="Setlist no longer exists")

    # Convert to response
    setlist_response = _setlist_to_response(share_token.setlist)

    return SharedSetlistResponse(
        setlist=setlist_response,
        shared_at=share_token.created_at,
        expires_at=share_token.expires_at
    )


@router.delete("/setlists/{setlist_id}/revoke")
async def revoke_share_links(
    setlist_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Revoke all share links for a setlist.

    - **setlist_id**: ID of the setlist to revoke shares for
    """
    # Verify setlist exists
    result = await db.execute(
        select(Setlist).where(Setlist.id == setlist_id)
    )
    setlist = result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    # Count tokens before deletion
    count_result = await db.execute(
        select(ShareToken).where(ShareToken.setlist_id == setlist_id)
    )
    tokens_count = len(count_result.scalars().all())

    # Remove all tokens for this setlist
    await db.execute(
        delete(ShareToken).where(ShareToken.setlist_id == setlist_id)
    )
    await db.commit()

    return {"message": f"Revoked {tokens_count} share link(s)"}


def _setlist_to_response(setlist: Setlist) -> SetlistResponse:
    """Convert Setlist model to SetlistResponse schema"""
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
