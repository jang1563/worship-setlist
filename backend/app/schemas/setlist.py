from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from app.schemas.song import SongResponse


class SetlistSongBase(BaseModel):
    song_id: int
    order: int
    key: str
    transition_type: Optional[str] = None
    transition_chord_progression: Optional[str] = None
    transition_notes: Optional[str] = None
    role: Optional[str] = None
    scripture_ref: Optional[str] = None
    notes: Optional[str] = None


class SetlistSongCreate(SetlistSongBase):
    pass


class SetlistSongResponse(SetlistSongBase):
    id: int
    song: Optional[SongResponse] = None

    class Config:
        from_attributes = True


class SetlistBase(BaseModel):
    title: str
    date: Optional[date] = None
    service_type: Optional[str] = None
    sermon_topic: Optional[str] = None
    sermon_scripture: Optional[str] = None
    total_duration_sec: Optional[int] = None
    notes: Optional[str] = None
    is_public: bool = False


class SetlistCreate(SetlistBase):
    songs: list[SetlistSongCreate] = []


class SetlistUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[date] = None
    service_type: Optional[str] = None
    sermon_topic: Optional[str] = None
    sermon_scripture: Optional[str] = None
    notes: Optional[str] = None
    is_public: Optional[bool] = None


class SetlistResponse(SetlistBase):
    id: int
    songs: list[SetlistSongResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SetlistListResponse(BaseModel):
    setlists: list[SetlistResponse]
    total: int
    page: int
    per_page: int
