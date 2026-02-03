from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SongBase(BaseModel):
    title: str
    title_en: Optional[str] = None
    title_original: Optional[str] = None
    artist: str
    album: Optional[str] = None
    year: Optional[int] = None
    default_key: str
    bpm: Optional[int] = None
    duration_sec: Optional[int] = None
    mood_tags: list[str] = []
    service_types: list[str] = []
    season_tags: list[str] = []
    difficulty: str = "medium"
    min_instruments: list[str] = []
    vocal_range_low: Optional[str] = None
    vocal_range_high: Optional[str] = None
    scripture_refs: list[str] = []
    scripture_connection: Optional[str] = None
    youtube_url: Optional[str] = None
    hymn_number: Optional[int] = None


class SongCreate(SongBase):
    pass


class SongUpdate(BaseModel):
    title: Optional[str] = None
    title_en: Optional[str] = None
    artist: Optional[str] = None
    default_key: Optional[str] = None
    bpm: Optional[int] = None
    duration_sec: Optional[int] = None
    mood_tags: Optional[list[str]] = None
    service_types: Optional[list[str]] = None
    youtube_url: Optional[str] = None


class SongResponse(SongBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SongListResponse(BaseModel):
    songs: list[SongResponse]
    total: int
    page: int
    per_page: int


class ChordChartBase(BaseModel):
    key: str
    content: str
    chordpro_content: Optional[str] = None
    source: str = "community"
    confidence: Optional[int] = None


class ChordChartCreate(ChordChartBase):
    song_id: Optional[int] = None  # Optional: can be provided via path parameter


class ChordChartUpdate(BaseModel):
    key: Optional[str] = None
    content: Optional[str] = None
    chordpro_content: Optional[str] = None
    source: Optional[str] = None
    confidence: Optional[int] = None


class ChordChartResponse(ChordChartBase):
    id: int
    song_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
