from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import json
from typing import Optional

from app.core.database import Base


class Song(Base):
    __tablename__ = "songs"

    id = Column(Integer, primary_key=True, index=True)

    # Basic info
    title = Column(String(255), nullable=False, index=True)
    title_en = Column(String(255), nullable=True)
    title_original = Column(String(255), nullable=True)

    artist = Column(String(255), nullable=False, index=True)
    album = Column(String(255), nullable=True)
    year = Column(Integer, nullable=True)

    # Music info
    default_key = Column(String(10), nullable=False)
    bpm = Column(Integer, nullable=True)
    duration_sec = Column(Integer, nullable=True)

    # Tags (stored as JSON strings)
    _mood_tags = Column("mood_tags", Text, nullable=True)
    _service_types = Column("service_types", Text, nullable=True)
    _season_tags = Column("season_tags", Text, nullable=True)

    # Practical info
    difficulty = Column(String(20), default="medium")
    _min_instruments = Column("min_instruments", Text, nullable=True)
    vocal_range_low = Column(String(10), nullable=True)
    vocal_range_high = Column(String(10), nullable=True)

    # Spiritual info
    _scripture_refs = Column("scripture_refs", Text, nullable=True)
    scripture_connection = Column(Text, nullable=True)

    # Media
    youtube_url = Column(String(500), nullable=True)

    # Hymn number (for 찬송가)
    hymn_number = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    chord_charts = relationship("ChordChart", back_populates="song", cascade="all, delete-orphan")
    sections = relationship("SongSection", back_populates="song", cascade="all, delete-orphan", order_by="SongSection.order")
    favorited_by = relationship("Favorite", back_populates="song", cascade="all, delete-orphan")

    @property
    def mood_tags(self) -> list[str]:
        return json.loads(self._mood_tags) if self._mood_tags else []

    @mood_tags.setter
    def mood_tags(self, value: list[str]):
        self._mood_tags = json.dumps(value, ensure_ascii=False) if value else None

    @property
    def service_types(self) -> list[str]:
        return json.loads(self._service_types) if self._service_types else []

    @service_types.setter
    def service_types(self, value: list[str]):
        self._service_types = json.dumps(value, ensure_ascii=False) if value else None

    @property
    def season_tags(self) -> list[str]:
        return json.loads(self._season_tags) if self._season_tags else []

    @season_tags.setter
    def season_tags(self, value: list[str]):
        self._season_tags = json.dumps(value, ensure_ascii=False) if value else None

    @property
    def min_instruments(self) -> list[str]:
        return json.loads(self._min_instruments) if self._min_instruments else []

    @min_instruments.setter
    def min_instruments(self, value: list[str]):
        self._min_instruments = json.dumps(value, ensure_ascii=False) if value else None

    @property
    def scripture_refs(self) -> list[str]:
        return json.loads(self._scripture_refs) if self._scripture_refs else []

    @scripture_refs.setter
    def scripture_refs(self, value: list[str]):
        self._scripture_refs = json.dumps(value, ensure_ascii=False) if value else None


class ChordChart(Base):
    __tablename__ = "chord_charts"
    __table_args__ = (
        Index("ix_chord_charts_song_id", "song_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)

    key = Column(String(10), nullable=False)
    content = Column(Text, nullable=False)  # Legacy field
    chordpro_content = Column(Text, nullable=True)  # ChordPro format content

    source = Column(String(50), default="community")  # "ai", "community", "official"
    confidence = Column(Integer, nullable=True)  # AI extraction confidence (0-100)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    song = relationship("Song", back_populates="chord_charts")

    @property
    def effective_chordpro(self) -> str:
        """Return chordpro_content if available, otherwise fall back to content."""
        return self.chordpro_content or self.content


class SongSection(Base):
    """
    Song section timestamps for structured playback.
    Stores markers for Verse, Chorus, Bridge, etc.
    """
    __tablename__ = "song_sections"
    __table_args__ = (
        Index("ix_song_sections_song_id", "song_id"),
        Index("ix_song_sections_song_order", "song_id", "order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)

    # Section info
    section_type = Column(String(50), nullable=False)  # "verse", "chorus", "bridge", "intro", "outro", "instrumental"
    section_number = Column(Integer, default=1)  # Verse 1, Verse 2, etc.
    label = Column(String(100), nullable=True)  # Custom label like "Verse 1" or "Pre-Chorus"

    # Timing (in seconds from start)
    start_time = Column(Integer, nullable=False)  # Start timestamp in seconds
    end_time = Column(Integer, nullable=True)  # End timestamp (optional)

    # Content
    lyrics = Column(Text, nullable=True)  # Lyrics for this section
    chords = Column(Text, nullable=True)  # ChordPro content for this section

    # Order
    order = Column(Integer, nullable=False)  # Order within the song

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    song = relationship("Song", back_populates="sections")
