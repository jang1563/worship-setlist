from pydantic import BaseModel, Field
from typing import Optional, Literal


class SetlistGenerateRequest(BaseModel):
    service_type: str = Field(..., min_length=1, max_length=50)  # 예배 유형 (주일예배, 청년예배, 새벽예배 등)
    duration_minutes: int = Field(..., ge=5, le=180)  # 예상 시간 (5분~3시간)
    sermon_scripture: Optional[str] = Field(None, max_length=200)  # 설교 본문
    sermon_topic: Optional[str] = Field(None, max_length=200)  # 설교 주제
    instruments: list[str] = Field(default_factory=list, max_length=20)  # 악기 구성
    vocal_count: int = Field(1, ge=0, le=20)  # 보컬 수
    mood_request: Optional[str] = Field(None, max_length=500)  # 분위기 요청
    exclude_song_ids: list[int] = Field(default_factory=list, max_length=100)  # 제외할 곡 ID
    additional_notes: Optional[str] = Field(None, max_length=1000)  # 기타 요청


class SetlistSongItem(BaseModel):
    song_id: int = Field(..., ge=1)
    title: str = Field(..., min_length=1, max_length=200)
    order: int = Field(..., ge=1, le=50)
    key: str = Field(..., min_length=1, max_length=10)
    role: str = Field(..., min_length=1, max_length=50)
    scripture_ref: Optional[str] = Field(None, max_length=100)
    duration_sec: int = Field(..., ge=0, le=3600)
    transition_to_next: Optional[dict] = None


class SetlistGenerateResponse(BaseModel):
    setlist: list[SetlistSongItem]
    total_duration_sec: int
    key_flow_assessment: str  # "자연스러움", "괜찮음", "조정필요"
    mood_flow: str
    notes: str


class SetlistRefineRequest(BaseModel):
    current_setlist: list[SetlistSongItem] = Field(..., max_length=50)
    user_message: str = Field(..., min_length=1, max_length=1000)  # 사용자 수정 요청


class TransitionGuideRequest(BaseModel):
    from_song_id: int = Field(..., ge=1)
    from_key: str = Field(..., min_length=1, max_length=10)
    to_song_id: int = Field(..., ge=1)
    to_key: str = Field(..., min_length=1, max_length=10)


class TransitionRecommendation(BaseModel):
    type: Literal["pivot", "chromatic", "circle", "bridge", "direct"]
    chord_progression: str = Field(..., max_length=200)
    description: str = Field(..., max_length=500)
    instrument_guide: dict[str, str] = Field(default_factory=dict)
    bars: int = Field(..., ge=1, le=16)


class TransitionGuideResponse(BaseModel):
    from_song: str
    from_key: str
    to_song: str
    to_key: str
    key_distance: int
    recommendations: list[TransitionRecommendation]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=10000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=50)
    context: Optional[dict] = None  # Current setlist context


class ChatResponse(BaseModel):
    message: str
    setlist: Optional[SetlistGenerateResponse] = None
    action: Optional[str] = None  # "generate", "refine", "suggest_transition", etc.


class ChainSongRecommendation(BaseModel):
    song_id: int
    title: str
    artist: str
    key: str
    compatibility_score: int  # 1-10
    key_compatibility: str  # "자연스러움", "괜찮음", "어색함"
    mood_match: str
    reason: str
    suggested_transition: Optional[str] = None


class ChainSongRequest(BaseModel):
    fixed_song_id: int = Field(..., ge=1)
    fixed_song_key: str = Field(..., min_length=1, max_length=10)
    position: Literal["before", "after"] = "after"
    service_type: Optional[str] = Field(None, max_length=50)
    mood_preference: Optional[str] = Field(None, max_length=100)
    exclude_song_ids: list[int] = Field(default_factory=list, max_length=100)
    limit: int = Field(5, ge=1, le=20)


class ChainSongResponse(BaseModel):
    fixed_song_title: str
    fixed_song_key: str
    recommendations: list[ChainSongRecommendation]
    notes: str
