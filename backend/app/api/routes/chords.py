"""
API routes for chord chart operations.

Endpoints:
- GET /api/songs/{id}/chords - Get chord charts for a song
- POST /api/songs/{id}/chords - Save chord chart for a song
- POST /api/chords/transpose - Transpose ChordPro content
- POST /api/chords/parse - Parse ChordPro content
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models import Song, ChordChart
from app.models.user import User
from app.services.chord_service import chord_service
from app.services.ai_service import ai_service

router = APIRouter(prefix="/chords", tags=["chords"])


# Pydantic models for request/response
class ChordChartCreate(BaseModel):
    """Request model for creating a chord chart."""
    key: str
    content: str  # Legacy field
    chordpro_content: Optional[str] = None  # ChordPro format
    source: str = "community"  # "ai", "community", "official"
    confidence: Optional[int] = None


class ChordChartUpdate(BaseModel):
    """Request model for updating a chord chart."""
    key: Optional[str] = None
    content: Optional[str] = None
    chordpro_content: Optional[str] = None
    source: Optional[str] = None
    confidence: Optional[int] = None


class ChordChartResponse(BaseModel):
    """Response model for chord chart."""
    id: int
    song_id: int
    key: str
    content: str
    chordpro_content: Optional[str]
    source: str
    confidence: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TransposeRequest(BaseModel):
    """Request model for transposing chords."""
    content: str  # ChordPro content
    from_key: str
    to_key: str


class TransposeResponse(BaseModel):
    """Response model for transposed chords."""
    content: str  # Transposed ChordPro content
    from_key: str
    to_key: str
    semitones: int


class ParseRequest(BaseModel):
    """Request model for parsing ChordPro content."""
    content: str


class ParsedChord(BaseModel):
    """Single parsed chord."""
    chord: str
    root: str
    quality: str
    bass: Optional[str] = None


class ParsedLineSegment(BaseModel):
    """A segment of a parsed line."""
    chord: Optional[str]
    lyric: str


class ParsedLineResponse(BaseModel):
    """A parsed line with segments."""
    segments: list[ParsedLineSegment]


class ParseResponse(BaseModel):
    """Response model for parsed ChordPro content."""
    title: Optional[str]
    artist: Optional[str]
    key: Optional[str]
    tempo: Optional[int]
    lines: list[ParsedLineResponse]
    chords: list[str]  # Unique chords in order
    html: str  # HTML rendering


class ChordToHtmlRequest(BaseModel):
    """Request model for converting ChordPro to HTML."""
    content: str
    highlight_class: str = "chord"


class ChordToHtmlResponse(BaseModel):
    """Response model for HTML conversion."""
    html: str


class DetectKeyRequest(BaseModel):
    """Request model for detecting key."""
    content: str


class DetectKeyResponse(BaseModel):
    """Response model for key detection."""
    key: Optional[str]
    confidence: str  # "high", "medium", "low"


class ValidateRequest(BaseModel):
    """Request model for validating ChordPro."""
    content: str


class ValidateResponse(BaseModel):
    """Response model for validation result."""
    is_valid: bool
    warnings: list[str]


class AIChordExtractRequest(BaseModel):
    """Request model for AI chord extraction."""
    title: str
    artist: str
    lyrics: str
    key: Optional[str] = None


class AIChordExtractResponse(BaseModel):
    """Response model for AI chord extraction."""
    success: bool
    key: Optional[str] = None
    time_signature: Optional[str] = None
    chordpro: Optional[str] = None
    chord_progression: Optional[list[str]] = None
    unique_chords: Optional[list[str]] = None
    confidence: Optional[int] = None
    notes: Optional[str] = None
    source: str  # "ai" or "demo"
    error: Optional[str] = None


# Song chord chart endpoints

@router.get("/songs/{song_id}", response_model=list[ChordChartResponse])
async def get_song_chords(
    song_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all chord charts for a song."""
    # Verify song exists
    song_result = await db.execute(select(Song).where(Song.id == song_id))
    if not song_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Song not found")

    result = await db.execute(
        select(ChordChart).where(ChordChart.song_id == song_id)
    )
    charts = result.scalars().all()
    return charts


@router.post("/songs/{song_id}", response_model=ChordChartResponse)
async def create_song_chord_chart(
    song_id: int,
    chart_data: ChordChartCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new chord chart for a song."""
    # Verify song exists
    song_result = await db.execute(select(Song).where(Song.id == song_id))
    if not song_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Song not found")

    # Validate ChordPro content if provided
    content_to_validate = chart_data.chordpro_content or chart_data.content
    is_valid, warnings = chord_service.validate_chordpro(content_to_validate)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ChordPro content: {', '.join(warnings)}"
        )

    chart = ChordChart(
        song_id=song_id,
        key=chart_data.key,
        content=chart_data.content,
        chordpro_content=chart_data.chordpro_content,
        source=chart_data.source,
        confidence=chart_data.confidence
    )

    db.add(chart)
    await db.commit()
    await db.refresh(chart)
    return chart


@router.put("/songs/{song_id}/{chart_id}", response_model=ChordChartResponse)
async def update_song_chord_chart(
    song_id: int,
    chart_id: int,
    chart_data: ChordChartUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing chord chart."""
    result = await db.execute(
        select(ChordChart).where(
            ChordChart.id == chart_id,
            ChordChart.song_id == song_id
        )
    )
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chord chart not found")

    # Validate ChordPro content if being updated
    if chart_data.chordpro_content:
        is_valid, warnings = chord_service.validate_chordpro(chart_data.chordpro_content)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid ChordPro content: {', '.join(warnings)}"
            )

    update_data = chart_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(chart, field, value)

    await db.commit()
    await db.refresh(chart)
    return chart


@router.delete("/songs/{song_id}/{chart_id}")
async def delete_song_chord_chart(
    song_id: int,
    chart_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chord chart."""
    result = await db.execute(
        select(ChordChart).where(
            ChordChart.id == chart_id,
            ChordChart.song_id == song_id
        )
    )
    chart = result.scalar_one_or_none()
    if not chart:
        raise HTTPException(status_code=404, detail="Chord chart not found")

    await db.delete(chart)
    await db.commit()
    return {"message": "Chord chart deleted successfully"}


# ChordPro processing endpoints

@router.post("/transpose", response_model=TransposeResponse)
async def transpose_chords(request: TransposeRequest):
    """Transpose ChordPro content from one key to another."""
    # Validate input
    is_valid, warnings = chord_service.validate_chordpro(request.content)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ChordPro content: {', '.join(warnings)}"
        )

    semitones = chord_service.calculate_transpose_semitones(
        request.from_key, request.to_key
    )
    transposed = chord_service.transpose_chordpro(
        request.content, request.from_key, request.to_key
    )

    return TransposeResponse(
        content=transposed,
        from_key=request.from_key,
        to_key=request.to_key,
        semitones=semitones
    )


@router.post("/parse", response_model=ParseResponse)
async def parse_chordpro(request: ParseRequest):
    """Parse ChordPro content and return structured data."""
    parsed = chord_service.parse_chordpro(request.content)
    html = chord_service.chordpro_to_html(request.content)
    unique_chords = chord_service.extract_chords(request.content)

    lines = []
    for line in parsed.lines:
        segments = [
            ParsedLineSegment(chord=chord, lyric=lyric)
            for chord, lyric in line.segments
        ]
        lines.append(ParsedLineResponse(segments=segments))

    return ParseResponse(
        title=parsed.title,
        artist=parsed.artist,
        key=parsed.key,
        tempo=parsed.tempo,
        lines=lines,
        chords=unique_chords,
        html=html
    )


@router.post("/to-html", response_model=ChordToHtmlResponse)
async def convert_to_html(request: ChordToHtmlRequest):
    """Convert ChordPro content to HTML."""
    html = chord_service.chordpro_to_html(
        request.content, request.highlight_class
    )
    return ChordToHtmlResponse(html=html)


@router.post("/detect-key", response_model=DetectKeyResponse)
async def detect_key(request: DetectKeyRequest):
    """Detect the key from ChordPro content."""
    parsed = chord_service.parse_chordpro(request.content)

    # If key is in metadata, high confidence
    if parsed.key:
        return DetectKeyResponse(key=parsed.key, confidence="high")

    # Otherwise, try to detect
    detected_key = chord_service.detect_key(request.content)
    confidence = "medium" if detected_key else "low"

    return DetectKeyResponse(key=detected_key, confidence=confidence)


@router.post("/validate", response_model=ValidateResponse)
async def validate_chordpro(request: ValidateRequest):
    """Validate ChordPro content."""
    is_valid, warnings = chord_service.validate_chordpro(request.content)
    return ValidateResponse(is_valid=is_valid, warnings=warnings)


@router.post("/extract-chords")
async def extract_chords(request: ParseRequest):
    """Extract all unique chords from ChordPro content."""
    chords = chord_service.extract_chords(request.content)
    chord_details = []

    for chord_str in chords:
        chord_info = chord_service.parse_chord(chord_str)
        chord_details.append({
            "chord": chord_str,
            "root": chord_info.root,
            "quality": chord_info.quality,
            "bass": chord_info.bass
        })

    return {
        "chords": chords,
        "details": chord_details,
        "count": len(chords)
    }


@router.post("/ai-extract", response_model=AIChordExtractResponse)
async def ai_extract_chords(request: AIChordExtractRequest):
    """Use AI to extract/suggest chords for song lyrics.

    This endpoint analyzes lyrics and suggests appropriate chord placements
    based on musical theory and common Korean CCM/worship patterns.
    """
    result = await ai_service.extract_chords_from_lyrics(
        title=request.title,
        artist=request.artist,
        lyrics=request.lyrics,
        key=request.key
    )

    return AIChordExtractResponse(**result)


@router.post("/ai-extract-song/{song_id}", response_model=AIChordExtractResponse)
async def ai_extract_chords_for_song(
    song_id: int,
    lyrics: str = Query(..., description="Lyrics to analyze"),
    db: AsyncSession = Depends(get_db)
):
    """Use AI to extract/suggest chords for an existing song.

    Fetches song metadata from database and generates chord suggestions.
    """
    # Get song info
    result = await db.execute(select(Song).where(Song.id == song_id))
    song = result.scalar_one_or_none()

    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    extraction_result = await ai_service.extract_chords_from_lyrics(
        title=song.title,
        artist=song.artist,
        lyrics=lyrics,
        key=song.default_key
    )

    return AIChordExtractResponse(**extraction_result)
