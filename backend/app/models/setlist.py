from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Date, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Setlist(Base):
    __tablename__ = "setlists"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)
    date = Column(Date, nullable=True)

    service_type = Column(String(100), nullable=True)
    sermon_topic = Column(String(500), nullable=True)
    sermon_scripture = Column(String(255), nullable=True)

    total_duration_sec = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    is_public = Column(Boolean, default=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    songs = relationship("SetlistSong", back_populates="setlist", cascade="all, delete-orphan", order_by="SetlistSong.order")


class SetlistSong(Base):
    __tablename__ = "setlist_songs"
    __table_args__ = (
        Index("ix_setlist_songs_setlist_id", "setlist_id"),
        Index("ix_setlist_songs_song_id", "song_id"),
        Index("ix_setlist_songs_setlist_order", "setlist_id", "order"),
    )

    id = Column(Integer, primary_key=True, index=True)
    setlist_id = Column(Integer, ForeignKey("setlists.id", ondelete="CASCADE"), nullable=False)
    song_id = Column(Integer, ForeignKey("songs.id"), nullable=False)

    order = Column(Integer, nullable=False)
    key = Column(String(10), nullable=False)

    # Transition info
    transition_type = Column(String(50), nullable=True)  # "direct", "pivot", "bridge"
    transition_chord_progression = Column(String(255), nullable=True)
    transition_notes = Column(Text, nullable=True)

    # Role in worship
    role = Column(String(100), nullable=True)  # "시작", "경배", "고백", "선포", "응답"
    scripture_ref = Column(String(255), nullable=True)

    notes = Column(Text, nullable=True)

    # Relationships
    setlist = relationship("Setlist", back_populates="songs")
    song = relationship("Song")
