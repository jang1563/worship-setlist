# WorshipFlow 데이터베이스 스키마

## ERD 개요

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    songs    │────<│ setlist_    │>────│  setlists   │
│             │     │   songs     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
      │                                        │
      │                                        │
      v                                        v
┌─────────────┐                         ┌─────────────┐
│chord_charts │                         │   teams     │
└─────────────┘                         └─────────────┘
      │                                        │
      v                                        v
┌─────────────┐                         ┌─────────────┐
│   users     │<────────────────────────│team_members │
└─────────────┘                         └─────────────┘
```

---

## 테이블 정의

### songs (찬양)

```sql
CREATE TABLE songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- 기본 정보
    title TEXT NOT NULL,              -- 한글 제목
    title_en TEXT,                    -- 영문 제목
    title_original TEXT,              -- 원곡 제목 (번안곡인 경우)
    
    artist TEXT NOT NULL,             -- 아티스트/밴드
    album TEXT,
    year INTEGER,
    
    -- 음악 정보
    default_key TEXT NOT NULL,        -- 기본 키 (C, D, E, F, G, A, B + m, #, b)
    bpm INTEGER,
    duration_sec INTEGER,
    
    -- 태그 (JSON array)
    mood_tags TEXT,                   -- ["경배", "찬양", "고백"]
    service_types TEXT,               -- ["새벽", "주일", "청년"]
    season_tags TEXT,                 -- ["성탄", "부활", "추수감사"]
    
    -- 실용 정보
    difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
    min_instruments TEXT,             -- ["piano"] 또는 ["piano", "guitar", "drums"]
    vocal_range_low TEXT,             -- 최저음 (예: "A3")
    vocal_range_high TEXT,            -- 최고음 (예: "D5")
    
    -- 영적 정보
    scripture_refs TEXT,              -- ["로마서 8:1", "시편 23:1"]
    scripture_connection TEXT,        -- 말씀과의 연결 설명
    origin_story TEXT,                -- 작곡 배경
    story_source TEXT,                -- 출처
    
    -- 미디어
    youtube_url TEXT,
    
    -- 번안곡 연결
    original_song_id INTEGER REFERENCES songs(id),
    
    -- 메타
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_songs_key ON songs(default_key);
```

### chord_charts (코드차트)

```sql
CREATE TABLE chord_charts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL REFERENCES songs(id),
    
    key TEXT NOT NULL,                -- 이 차트의 키
    content TEXT NOT NULL,            -- ChordPro 포맷
    
    source TEXT DEFAULT 'community',  -- "ai", "community", "official"
    confidence REAL,                  -- AI 추출 신뢰도 (0-1)
    
    contributor_id INTEGER REFERENCES users(id),
    verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chord_charts_song ON chord_charts(song_id);
```

### setlists (송리스트)

```sql
CREATE TABLE setlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    title TEXT NOT NULL,
    date DATE,
    
    service_type TEXT,                -- 예배 유형
    sermon_topic TEXT,                -- 설교 주제
    sermon_scripture TEXT,            -- 설교 본문
    
    total_duration INTEGER,           -- 총 예상 시간 (초)
    notes TEXT,
    
    is_public BOOLEAN DEFAULT FALSE,
    team_id INTEGER REFERENCES teams(id),
    created_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_setlists_date ON setlists(date);
CREATE INDEX idx_setlists_team ON setlists(team_id);
```

### setlist_songs (송리스트-곡 연결)

```sql
CREATE TABLE setlist_songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setlist_id INTEGER NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
    song_id INTEGER NOT NULL REFERENCES songs(id),
    
    "order" INTEGER NOT NULL,         -- 순서
    key TEXT NOT NULL,                -- 이 셋에서 사용할 키
    
    -- 전환 정보
    transition_type TEXT,             -- "direct", "pivot", "bridge"
    transition_chord_progression TEXT,-- "G → Gsus4 → A"
    transition_notes TEXT,
    
    notes TEXT,                       -- 기타 메모
    
    UNIQUE(setlist_id, "order")
);

CREATE INDEX idx_setlist_songs_setlist ON setlist_songs(setlist_id);
```

### usage_history (사용 이력)

```sql
CREATE TABLE usage_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL REFERENCES songs(id),
    setlist_id INTEGER REFERENCES setlists(id),
    team_id INTEGER REFERENCES teams(id),
    
    used_date DATE NOT NULL,
    service_type TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_song ON usage_history(song_id);
CREATE INDEX idx_usage_date ON usage_history(used_date);
CREATE INDEX idx_usage_team ON usage_history(team_id);
```

### users (사용자)

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    name TEXT,
    profile_image_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### teams (팀)

```sql
CREATE TABLE teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    church_name TEXT,
    
    created_by INTEGER REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### team_members (팀 멤버)

```sql
CREATE TABLE team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    
    role TEXT DEFAULT 'member',       -- "admin", "leader", "member"
    instrument TEXT,                  -- "vocal", "piano", "guitar", "bass", "drums"
    
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

---

## SQLAlchemy 모델

```python
# backend/app/models/song.py

from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import json

class Song(Base):
    __tablename__ = "songs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    title = Column(String, nullable=False, index=True)
    title_en = Column(String)
    title_original = Column(String)
    
    artist = Column(String, nullable=False, index=True)
    album = Column(String)
    year = Column(Integer)
    
    default_key = Column(String, nullable=False)
    bpm = Column(Integer)
    duration_sec = Column(Integer)
    
    _mood_tags = Column("mood_tags", Text)
    _service_types = Column("service_types", Text)
    _season_tags = Column("season_tags", Text)
    
    difficulty = Column(String, default="medium")
    _min_instruments = Column("min_instruments", Text)
    vocal_range_low = Column(String)
    vocal_range_high = Column(String)
    
    _scripture_refs = Column("scripture_refs", Text)
    scripture_connection = Column(Text)
    origin_story = Column(Text)
    story_source = Column(String)
    
    youtube_url = Column(String)
    
    original_song_id = Column(Integer, ForeignKey("songs.id"))
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    chord_charts = relationship("ChordChart", back_populates="song")
    original_song = relationship("Song", remote_side=[id])
    
    @property
    def mood_tags(self):
        return json.loads(self._mood_tags) if self._mood_tags else []
    
    @mood_tags.setter
    def mood_tags(self, value):
        self._mood_tags = json.dumps(value) if value else None
```

---

## Pydantic 스키마

```python
# backend/app/schemas/song.py

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SongBase(BaseModel):
    title: str
    title_en: Optional[str] = None
    artist: str
    default_key: str
    bpm: Optional[int] = None
    duration_sec: Optional[int] = None
    mood_tags: list[str] = []
    service_types: list[str] = []
    scripture_refs: list[str] = []
    youtube_url: Optional[str] = None

class SongCreate(SongBase):
    pass

class Song(SongBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SetlistSongItem(BaseModel):
    song_id: int
    order: int
    key: str
    transition_type: Optional[str] = None
    transition_chord_progression: Optional[str] = None
    notes: Optional[str] = None

class SetlistCreate(BaseModel):
    title: str
    date: Optional[str] = None
    service_type: Optional[str] = None
    sermon_topic: Optional[str] = None
    sermon_scripture: Optional[str] = None
    songs: list[SetlistSongItem] = []
```
