"""
API routes for exporting setlists and songs.

Endpoints:
- POST /api/export/pdf/setlist - Export setlist summary to PDF-ready HTML
- POST /api/export/pdf/song - Export single song with chords to PDF-ready HTML
- POST /api/export/propresenter - Export setlist to ProPresenter format
- POST /api/export/openlyrics - Export song to OpenLyrics XML
- POST /api/export/powerpoint - Export setlist to PowerPoint format
- POST /api/export/text - Export setlist to plain text
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.api.deps import get_db
from app.models import Song, Setlist, SetlistSong
from app.services.export_service import export_service, ExportedSong

router = APIRouter(prefix="/export", tags=["export"])


# Request/Response models

class SongExportRequest(BaseModel):
    """Request for exporting a single song."""
    song_id: int
    key: Optional[str] = None  # Override default key
    include_chords: bool = True
    chordpro_content: Optional[str] = None  # Custom chord chart


class SetlistExportRequest(BaseModel):
    """Request for exporting a setlist."""
    setlist_id: Optional[int] = None
    songs: Optional[list[dict]] = None  # Direct song list for quick export
    setlist_name: str = "예배 송리스트"
    date: Optional[str] = None
    service_type: Optional[str] = None


class ExportResponse(BaseModel):
    """Response containing exported content."""
    format: str
    content: str
    filename: str


# Endpoints

@router.post("/pdf/setlist", response_model=ExportResponse)
async def export_setlist_pdf(
    request: SetlistExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Export setlist summary to PDF-ready HTML.

    Returns HTML optimized for printing/PDF conversion.
    Use browser print or a PDF library to convert.
    """
    songs = []

    if request.setlist_id:
        # Load from database
        setlist_result = await db.execute(
            select(Setlist).where(Setlist.id == request.setlist_id)
        )
        setlist = setlist_result.scalar_one_or_none()
        if not setlist:
            raise HTTPException(status_code=404, detail="Setlist not found")

        # Get setlist songs
        songs_result = await db.execute(
            select(SetlistSong, Song)
            .join(Song, SetlistSong.song_id == Song.id)
            .where(SetlistSong.setlist_id == request.setlist_id)
            .order_by(SetlistSong.order)
        )

        for setlist_song, song in songs_result.all():
            songs.append({
                "title": song.title,
                "artist": song.artist,
                "key": setlist_song.key or song.default_key,
                "role": setlist_song.role or "",
                "duration_sec": song.duration_sec or 0
            })

        setlist_name = setlist.title
        date = setlist.date.strftime('%Y-%m-%d') if setlist.date else None
        service_type = setlist.service_type
    elif request.songs:
        songs = request.songs
        setlist_name = request.setlist_name
        date = request.date
        service_type = request.service_type
    else:
        raise HTTPException(
            status_code=400,
            detail="Either setlist_id or songs list is required"
        )

    html = export_service.export_setlist_summary_html(
        songs=songs,
        setlist_name=setlist_name,
        date=date,
        service_type=service_type
    )

    filename = f"setlist_{datetime.now().strftime('%Y%m%d')}.html"

    return ExportResponse(
        format="html",
        content=html,
        filename=filename
    )


@router.post("/pdf/song", response_model=ExportResponse)
async def export_song_pdf(
    request: SongExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Export a single song with chords to PDF-ready HTML.

    Returns HTML optimized for printing/PDF conversion.
    """
    # Get song from database
    song_result = await db.execute(
        select(Song).where(Song.id == request.song_id)
    )
    song = song_result.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    # Use provided chord chart or create simple lyrics sections
    if request.chordpro_content:
        sections = export_service.chordpro_to_sections(request.chordpro_content)
    elif song.lyrics:
        # Simple lyrics without sections
        sections = [{"section": "Verse", "content": song.lyrics}]
    else:
        sections = [{"section": "Verse", "content": "(가사 없음)"}]

    exported_song = ExportedSong(
        title=song.title,
        artist=song.artist,
        key=request.key or song.default_key,
        lyrics=sections
    )

    html = export_service.export_song_to_pdf_html(
        song=exported_song,
        include_chords=request.include_chords
    )

    filename = f"{song.title}_{song.default_key}.html"

    return ExportResponse(
        format="html",
        content=html,
        filename=filename
    )


@router.post("/propresenter")
async def export_to_propresenter(
    request: SetlistExportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Export setlist to ProPresenter 7 JSON format."""
    exported_songs = []

    if request.setlist_id:
        # Load from database
        songs_result = await db.execute(
            select(SetlistSong, Song)
            .join(Song, SetlistSong.song_id == Song.id)
            .where(SetlistSong.setlist_id == request.setlist_id)
            .order_by(SetlistSong.order)
        )

        for setlist_song, song in songs_result.all():
            lyrics = song.lyrics or ""
            sections = export_service.chordpro_to_sections(lyrics) if lyrics else []

            exported_songs.append(ExportedSong(
                title=song.title,
                artist=song.artist,
                key=setlist_song.key or song.default_key,
                lyrics=sections
            ))

    json_content = export_service.export_to_propresenter(
        songs=exported_songs,
        setlist_name=request.setlist_name
    )

    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{request.setlist_name}.pro7.json"'
        }
    )


@router.post("/openlyrics/{song_id}")
async def export_to_openlyrics(
    song_id: int,
    key: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Export a song to OpenLyrics XML format."""
    song_result = await db.execute(
        select(Song).where(Song.id == song_id)
    )
    song = song_result.scalar_one_or_none()
    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    lyrics = song.lyrics or ""
    sections = export_service.chordpro_to_sections(lyrics) if lyrics else []

    exported_song = ExportedSong(
        title=song.title,
        artist=song.artist,
        key=key or song.default_key,
        lyrics=sections
    )

    xml_content = export_service.export_to_openlyrics(exported_song)

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f'attachment; filename="{song.title}.xml"'
        }
    )


@router.post("/powerpoint")
async def export_to_powerpoint(
    request: SetlistExportRequest,
    include_chords: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Export setlist to PowerPoint (.pptx) format.

    Creates a presentation with:
    - Title slide with setlist name
    - Per-song title slides
    - Lyrics slides (6 lines per slide)
    """
    exported_songs = []

    if request.setlist_id:
        songs_result = await db.execute(
            select(SetlistSong, Song)
            .join(Song, SetlistSong.song_id == Song.id)
            .where(SetlistSong.setlist_id == request.setlist_id)
            .order_by(SetlistSong.order)
        )

        for setlist_song, song in songs_result.all():
            lyrics = song.lyrics or ""
            sections = export_service.chordpro_to_sections(lyrics) if lyrics else [
                {"section": "Lyrics", "content": "(가사 없음)"}
            ]

            exported_songs.append(ExportedSong(
                title=song.title,
                artist=song.artist,
                key=setlist_song.key or song.default_key,
                lyrics=sections
            ))
    elif request.songs:
        for song_data in request.songs:
            exported_songs.append(ExportedSong(
                title=song_data.get("title", ""),
                artist=song_data.get("artist", ""),
                key=song_data.get("key", ""),
                lyrics=[{"section": "Lyrics", "content": song_data.get("lyrics", "")}]
            ))

    pptx_bytes = export_service.export_to_powerpoint(
        songs=exported_songs,
        setlist_name=request.setlist_name,
        include_chords=include_chords
    )

    if pptx_bytes is None:
        raise HTTPException(
            status_code=501,
            detail="PowerPoint export is not available. Install python-pptx package."
        )

    filename = f"{request.setlist_name}_{datetime.now().strftime('%Y%m%d')}.pptx"

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


@router.post("/text", response_model=ExportResponse)
async def export_to_text(
    request: SetlistExportRequest,
    include_chords: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """Export setlist to plain text format."""
    exported_songs = []

    if request.setlist_id:
        songs_result = await db.execute(
            select(SetlistSong, Song)
            .join(Song, SetlistSong.song_id == Song.id)
            .where(SetlistSong.setlist_id == request.setlist_id)
            .order_by(SetlistSong.order)
        )

        for setlist_song, song in songs_result.all():
            lyrics = song.lyrics or ""
            sections = export_service.chordpro_to_sections(lyrics) if lyrics else []

            exported_songs.append(ExportedSong(
                title=song.title,
                artist=song.artist,
                key=setlist_song.key or song.default_key,
                lyrics=sections
            ))
    elif request.songs:
        for song_data in request.songs:
            exported_songs.append(ExportedSong(
                title=song_data.get("title", ""),
                artist=song_data.get("artist", ""),
                key=song_data.get("key", ""),
                lyrics=[{"section": "Lyrics", "content": song_data.get("lyrics", "")}]
            ))

    text_content = export_service.export_to_plain_text(
        songs=exported_songs,
        include_chords=include_chords
    )

    return ExportResponse(
        format="text",
        content=text_content,
        filename=f"{request.setlist_name}.txt"
    )
