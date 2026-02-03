import json
from typing import Optional
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models import Song
from app.schemas.ai import (
    SetlistGenerateRequest, SetlistGenerateResponse, SetlistSongItem,
    TransitionGuideRequest, TransitionGuideResponse, TransitionRecommendation,
    ChainSongRequest, ChainSongResponse, ChainSongRecommendation
)

SYSTEM_PROMPT = """당신은 한국 교회 예배를 위한 찬양 컨설턴트입니다.
15년 이상 워십 리더로 사역한 경험을 바탕으로 예배의 맥락을 이해하고
적절한 송리스트를 구성합니다.

## 핵심 원칙

1. 예배의 흐름
   - 시작: 은혜 고백, 감사
   - 경배: 하나님께 집중
   - 고백/회개: 자기 성찰
   - 선포: 믿음 고백, 승리
   - 응답: 헌신, 결단

2. 음악적 고려
   - 키 전환의 자연스러움 (±2반음 이내 권장)
   - BPM 흐름 (빠름→중간→느림 또는 점진적 빌드업)
   - 세대 다양성 (찬송가 + CCM 조합)

3. 실용적 고려
   - 팀의 악기 구성
   - 보컬 음역대
   - 최근 사용 곡 제외

## 제약사항
- 곡 DB에 있는 곡만 추천
- 키 전환이 어색하면 경고
- 시간 초과시 조정 제안

## 출력 형식
반드시 아래 JSON 형식으로 출력하세요:

{
  "setlist": [
    {
      "song_id": <숫자>,
      "title": "<곡 제목>",
      "order": <순서>,
      "key": "<키>",
      "role": "<역할 설명>",
      "scripture_ref": "<관련 말씀>",
      "duration_sec": <초>,
      "transition_to_next": {
        "type": "direct|pivot|bridge",
        "progression": "<코드 진행>",
        "description": "<설명>"
      }
    }
  ],
  "total_duration_sec": <총 시간>,
  "key_flow_assessment": "자연스러움|괜찮음|조정필요",
  "mood_flow": "<분위기 흐름 설명>",
  "notes": "<추가 설명>"
}"""


class AIService:
    def __init__(self):
        self.client = None
        self._is_demo_mode = True
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
        if api_key and api_key.strip() and not api_key.startswith('test-') and api_key != 'your-anthropic-api-key-here':
            try:
                self.client = anthropic.Anthropic(api_key=api_key)
                self._is_demo_mode = False
            except Exception:
                self._is_demo_mode = True

    def _has_valid_api_key(self) -> bool:
        """Check if a valid API key is configured"""
        return self.client is not None and not self._is_demo_mode

    async def generate_setlist(
        self,
        request: SetlistGenerateRequest,
        db: AsyncSession
    ) -> SetlistGenerateResponse:
        if not self._has_valid_api_key():
            # Return demo setlist when no API key
            return await self._get_demo_setlist(request, db)

        # Get available songs from DB
        query = select(Song)
        if request.exclude_song_ids:
            query = query.where(~Song.id.in_(request.exclude_song_ids))
        result = await db.execute(query)
        songs = result.scalars().all()

        # Format songs for prompt
        songs_json = json.dumps([
            {
                "id": s.id,
                "title": s.title,
                "artist": s.artist,
                "key": s.default_key,
                "bpm": s.bpm,
                "duration_sec": s.duration_sec,
                "mood_tags": s.mood_tags,
                "service_types": s.service_types,
                "scripture_refs": s.scripture_refs,
                "difficulty": s.difficulty,
                "vocal_range_high": s.vocal_range_high
            }
            for s in songs
        ], ensure_ascii=False, indent=2)

        user_prompt = f"""## 예배 정보
- 예배 유형: {request.service_type}
- 예상 시간: {request.duration_minutes}분
- 설교 본문: {request.sermon_scripture or "없음"}
- 설교 주제: {request.sermon_topic or "없음"}

## 팀 구성
- 악기: {", ".join(request.instruments) if request.instruments else "피아노"}
- 보컬 수: {request.vocal_count}명

## 요청사항
- 분위기: {request.mood_request or "자연스럽게"}
- 기타: {request.additional_notes or "없음"}

## 사용 가능한 곡 DB
{songs_json}

위 정보를 바탕으로 송리스트를 구성해주세요. JSON 형식으로만 응답하세요."""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        response_text = message.content[0].text

        # Parse JSON from response
        try:
            # Try to extract JSON from the response
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                data = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response: {e}")

        return SetlistGenerateResponse(
            setlist=[
                SetlistSongItem(
                    song_id=item["song_id"],
                    title=item["title"],
                    order=item["order"],
                    key=item["key"],
                    role=item["role"],
                    scripture_ref=item.get("scripture_ref"),
                    duration_sec=item["duration_sec"],
                    transition_to_next=item.get("transition_to_next")
                )
                for item in data["setlist"]
            ],
            total_duration_sec=data["total_duration_sec"],
            key_flow_assessment=data["key_flow_assessment"],
            mood_flow=data["mood_flow"],
            notes=data["notes"]
        )

    async def _get_demo_setlist(
        self,
        request: SetlistGenerateRequest,
        db: AsyncSession
    ) -> SetlistGenerateResponse:
        """Return demo setlist when API key is not configured"""
        # Get some sample songs from DB
        result = await db.execute(select(Song).limit(20))
        songs = result.scalars().all()

        if not songs:
            # Fallback demo data if no songs in DB
            return SetlistGenerateResponse(
                setlist=[
                    SetlistSongItem(song_id=1, title="주의 사랑이 나를 놓지 않네", order=1, key="G", role="시작/감사", duration_sec=300),
                    SetlistSongItem(song_id=2, title="아름다우신", order=2, key="A", role="경배", duration_sec=270),
                    SetlistSongItem(song_id=3, title="좋으신 하나님", order=3, key="D", role="고백", duration_sec=280),
                    SetlistSongItem(song_id=4, title="나의 가는 길", order=4, key="G", role="응답", duration_sec=290),
                ],
                total_duration_sec=1140,
                key_flow_assessment="자연스러움",
                mood_flow="감사 → 경배 → 고백 → 응답의 자연스러운 흐름",
                notes="(데모 모드) Anthropic API 키를 설정하면 AI가 예배에 맞는 송리스트를 생성합니다."
            )

        # Select songs based on service type
        selected = []
        num_songs = min(5, max(3, request.duration_minutes // 5))

        for i, song in enumerate(songs[:num_songs]):
            role_map = ["시작/감사", "경배", "고백", "선포", "응답"]
            selected.append(SetlistSongItem(
                song_id=song.id,
                title=song.title,
                order=i + 1,
                key=song.default_key or "G",
                role=role_map[i % len(role_map)],
                duration_sec=song.duration_sec or 300,
                scripture_ref=song.scripture_refs[0] if song.scripture_refs else None
            ))

        total_duration = sum(s.duration_sec for s in selected)

        return SetlistGenerateResponse(
            setlist=selected,
            total_duration_sec=total_duration,
            key_flow_assessment="자연스러움",
            mood_flow=f"{request.service_type}에 맞는 자연스러운 흐름",
            notes=f"(데모 모드) API 키를 설정하면 '{request.sermon_topic or request.service_type}'에 맞는 AI 추천을 받을 수 있습니다."
        )

    async def suggest_transition(
        self,
        request: TransitionGuideRequest,
        db: AsyncSession
    ) -> TransitionGuideResponse:
        if not self._has_valid_api_key():
            # Return demo transition guide
            return await self._get_demo_transition(request, db)

        # Get song info
        from_song_result = await db.execute(select(Song).where(Song.id == request.from_song_id))
        from_song = from_song_result.scalar_one_or_none()

        to_song_result = await db.execute(select(Song).where(Song.id == request.to_song_id))
        to_song = to_song_result.scalar_one_or_none()

        if not from_song or not to_song:
            raise ValueError("Song not found")

        key_distance = self._calculate_key_distance(request.from_key, request.to_key)

        transition_prompt = f"""두 곡 사이의 자연스러운 전환 방법을 제안해주세요.

이전 곡: {from_song.title} (Key: {request.from_key})
다음 곡: {to_song.title} (Key: {request.to_key})
키 거리: {key_distance}반음

JSON 형식으로 응답하세요:
{{
  "recommendations": [
    {{
      "type": "pivot|chromatic|circle|bridge",
      "chord_progression": "<코드 진행>",
      "description": "<설명>",
      "instrument_guide": {{
        "piano": "<피아노 가이드>",
        "guitar": "<기타 가이드>",
        "bass": "<베이스 가이드>"
      }},
      "bars": <마디 수>
    }}
  ]
}}"""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": transition_prompt}
            ]
        )

        response_text = message.content[0].text

        try:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                data = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response: {e}")

        return TransitionGuideResponse(
            from_song=from_song.title,
            from_key=request.from_key,
            to_song=to_song.title,
            to_key=request.to_key,
            key_distance=key_distance,
            recommendations=[
                TransitionRecommendation(
                    type=r["type"],
                    chord_progression=r["chord_progression"],
                    description=r["description"],
                    instrument_guide=r.get("instrument_guide", {}),
                    bars=r.get("bars", 4)
                )
                for r in data["recommendations"]
            ]
        )

    async def _get_demo_transition(
        self,
        request: TransitionGuideRequest,
        db: AsyncSession
    ) -> TransitionGuideResponse:
        """Return demo transition guide when API key is not configured"""
        from_song_result = await db.execute(select(Song).where(Song.id == request.from_song_id))
        from_song = from_song_result.scalar_one_or_none()
        to_song_result = await db.execute(select(Song).where(Song.id == request.to_song_id))
        to_song = to_song_result.scalar_one_or_none()

        key_distance = self._calculate_key_distance(request.from_key, request.to_key)

        recommendations = []
        if key_distance <= 2:
            recommendations.append(TransitionRecommendation(
                type="direct",
                chord_progression=f"{request.from_key} → {request.to_key}",
                description=f"직접 전환 가능 ({key_distance}반음 차이)",
                instrument_guide={"piano": "마지막 코드 후 바로 전환", "guitar": "스트럼 후 전환"},
                bars=1
            ))
        else:
            recommendations.append(TransitionRecommendation(
                type="bridge",
                chord_progression=f"{request.from_key} → {request.from_key}sus4 → {request.to_key}",
                description=f"브릿지 코드를 사용한 전환 ({key_distance}반음 차이)",
                instrument_guide={"piano": "아르페지오로 부드럽게 연결", "guitar": "피킹으로 분위기 전환"},
                bars=4
            ))

        return TransitionGuideResponse(
            from_song=from_song.title if from_song else "이전 곡",
            from_key=request.from_key,
            to_song=to_song.title if to_song else "다음 곡",
            to_key=request.to_key,
            key_distance=key_distance,
            recommendations=recommendations
        )

    async def recommend_chain_songs(
        self,
        request: ChainSongRequest,
        db: AsyncSession
    ) -> ChainSongResponse:
        """Recommend songs that chain well from/to a fixed song."""
        # Get the fixed song
        fixed_song_result = await db.execute(select(Song).where(Song.id == request.fixed_song_id))
        fixed_song = fixed_song_result.scalar_one_or_none()

        if not fixed_song:
            raise ValueError("Fixed song not found")

        # Get available songs (excluding fixed song and excluded songs)
        exclude_ids = [request.fixed_song_id] + request.exclude_song_ids
        query = select(Song).where(~Song.id.in_(exclude_ids))
        result = await db.execute(query)
        available_songs = result.scalars().all()

        # Calculate key compatibility for each song
        recommendations = []
        for song in available_songs:
            if request.position == "after":
                key_distance = self._calculate_key_distance(request.fixed_song_key, song.default_key)
            else:
                key_distance = self._calculate_key_distance(song.default_key, request.fixed_song_key)

            # Determine compatibility
            if key_distance <= 2:
                key_compat = "자연스러움"
                compat_score = 10 - key_distance
            elif key_distance <= 4:
                key_compat = "괜찮음"
                compat_score = 7 - (key_distance - 2)
            else:
                key_compat = "어색함"
                compat_score = max(1, 5 - (key_distance - 4))

            # Check mood match
            fixed_moods = set(fixed_song.mood_tags or [])
            song_moods = set(song.mood_tags or [])
            mood_overlap = fixed_moods & song_moods

            if mood_overlap:
                mood_match = f"분위기 일치: {', '.join(list(mood_overlap)[:2])}"
                compat_score = min(10, compat_score + 2)
            else:
                mood_match = "다른 분위기"

            # Check service type match
            if request.service_type:
                if request.service_type in (song.service_types or []):
                    compat_score = min(10, compat_score + 1)

            # Generate reason
            position_text = "다음" if request.position == "after" else "이전"
            reason = f"{fixed_song.title}의 {position_text} 곡으로 "
            if key_compat == "자연스러움":
                reason += f"키 전환이 자연스럽습니다 ({request.fixed_song_key} → {song.default_key})."
            elif key_compat == "괜찮음":
                reason += f"키 전환이 가능합니다 ({key_distance}반음 차이)."
            else:
                reason += f"키 전환에 주의가 필요합니다 ({key_distance}반음 차이)."

            # Suggest transition if needed
            suggested_transition = None
            if key_distance > 0:
                if key_distance <= 2:
                    suggested_transition = "직접 전환 가능"
                else:
                    suggested_transition = f"브릿지 코드 사용 권장 ({request.fixed_song_key}→{song.default_key})"

            recommendations.append({
                "song": song,
                "key_compat": key_compat,
                "compat_score": compat_score,
                "mood_match": mood_match,
                "reason": reason,
                "suggested_transition": suggested_transition
            })

        # Sort by compatibility score
        recommendations.sort(key=lambda x: x["compat_score"], reverse=True)

        # Take top N recommendations
        top_recommendations = recommendations[:request.limit]

        return ChainSongResponse(
            fixed_song_title=fixed_song.title,
            fixed_song_key=request.fixed_song_key,
            recommendations=[
                ChainSongRecommendation(
                    song_id=r["song"].id,
                    title=r["song"].title,
                    artist=r["song"].artist,
                    key=r["song"].default_key,
                    compatibility_score=r["compat_score"],
                    key_compatibility=r["key_compat"],
                    mood_match=r["mood_match"],
                    reason=r["reason"],
                    suggested_transition=r["suggested_transition"]
                )
                for r in top_recommendations
            ],
            notes=f"'{fixed_song.title}' ({request.fixed_song_key})와 잘 어울리는 곡들입니다. 키 호환성과 분위기를 고려하여 추천했습니다."
        )

    async def refine_setlist(
        self,
        current_setlist: list[dict],
        user_message: str,
        db: AsyncSession
    ) -> SetlistGenerateResponse:
        """Refine/modify an existing setlist based on user feedback."""
        if not self._has_valid_api_key():
            # Return the current setlist with a demo message
            setlist_items = []
            for item in current_setlist:
                setlist_items.append(SetlistSongItem(
                    song_id=item.get("song_id", 0),
                    title=item.get("title", ""),
                    order=item.get("order", 0),
                    key=item.get("key", "G"),
                    role=item.get("role", ""),
                    duration_sec=item.get("duration_sec", 300)
                ))
            return SetlistGenerateResponse(
                setlist=setlist_items,
                total_duration_sec=sum(i.duration_sec for i in setlist_items),
                key_flow_assessment="자연스러움",
                mood_flow="데모 모드",
                notes=f"(데모 모드) API 키를 설정하면 '{user_message}' 요청에 따라 AI가 송리스트를 수정합니다."
            )

        # Get available songs from DB
        result = await db.execute(select(Song))
        songs = result.scalars().all()

        # Format current setlist and songs for the prompt
        current_setlist_json = json.dumps(current_setlist, ensure_ascii=False, indent=2)
        songs_json = json.dumps([
            {
                "id": s.id,
                "title": s.title,
                "artist": s.artist,
                "key": s.default_key,
                "bpm": s.bpm,
                "duration_sec": s.duration_sec,
                "mood_tags": s.mood_tags,
                "service_types": s.service_types,
                "scripture_refs": s.scripture_refs,
                "difficulty": s.difficulty,
            }
            for s in songs
        ], ensure_ascii=False, indent=2)

        refine_prompt = f"""## 현재 송리스트
{current_setlist_json}

## 사용자 수정 요청
{user_message}

## 사용 가능한 곡 DB
{songs_json}

사용자의 요청에 따라 송리스트를 수정해주세요.
- 시간 수정 요청: 곡을 추가/제거하여 총 시간을 맞춤
- 곡 교체 요청: 해당 곡을 유사한 다른 곡으로 교체
- 분위기 수정: 전체적인 분위기를 조정
- 순서 변경: 곡 순서를 재배치

JSON 형식으로만 응답하세요."""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": refine_prompt}
            ]
        )

        response_text = message.content[0].text

        # Parse JSON from response
        try:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                json_str = response_text[json_start:json_end]
                data = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse AI response: {e}")

        return SetlistGenerateResponse(
            setlist=[
                SetlistSongItem(
                    song_id=item["song_id"],
                    title=item["title"],
                    order=item["order"],
                    key=item["key"],
                    role=item["role"],
                    scripture_ref=item.get("scripture_ref"),
                    duration_sec=item["duration_sec"],
                    transition_to_next=item.get("transition_to_next")
                )
                for item in data["setlist"]
            ],
            total_duration_sec=data["total_duration_sec"],
            key_flow_assessment=data["key_flow_assessment"],
            mood_flow=data["mood_flow"],
            notes=data["notes"]
        )

    async def recommend_by_scripture(
        self,
        scripture_reference: str,
        db: AsyncSession,
        limit: int = 10
    ) -> list[dict]:
        """Recommend songs based on a Bible scripture reference."""
        if not self.client:
            raise ValueError("Anthropic API key not configured")

        # Get all songs with scripture connections
        result = await db.execute(select(Song))
        songs = result.scalars().all()

        # Format songs for AI analysis
        songs_with_scripture = [
            {
                "id": s.id,
                "title": s.title,
                "artist": s.artist,
                "key": s.default_key,
                "scripture_refs": s.scripture_refs,
                "scripture_connection": s.scripture_connection,
                "mood_tags": s.mood_tags
            }
            for s in songs if s.scripture_refs or s.scripture_connection
        ]

        scripture_prompt = f"""성경 본문과 관련된 찬양을 추천해주세요.

성경 본문: {scripture_reference}

사용 가능한 곡 목록:
{json.dumps(songs_with_scripture, ensure_ascii=False, indent=2)}

JSON 형식으로 응답하세요:
{{
  "scripture_theme": "<본문의 주제>",
  "recommended_songs": [
    {{
      "song_id": <숫자>,
      "title": "<곡 제목>",
      "relevance_score": <1-10>,
      "reason": "<추천 이유>"
    }}
  ],
  "thematic_keywords": ["<키워드1>", "<키워드2>"]
}}

관련성이 높은 순서로 최대 {limit}곡을 추천해주세요."""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            messages=[{"role": "user", "content": scripture_prompt}]
        )

        response_text = message.content[0].text

        try:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                data = json.loads(response_text[json_start:json_end])
                return data
            raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError):
            return {"scripture_theme": "", "recommended_songs": [], "thematic_keywords": []}

    async def analyze_worship_flow(
        self,
        setlist: list[dict],
        service_type: str = "주일예배"
    ) -> dict:
        """Analyze the worship flow of a setlist and provide feedback."""
        if not self.client:
            raise ValueError("Anthropic API key not configured")

        flow_prompt = f"""다음 송리스트의 예배 흐름을 분석하고 피드백을 제공해주세요.

예배 유형: {service_type}

송리스트:
{json.dumps(setlist, ensure_ascii=False, indent=2)}

다음 관점에서 분석해주세요:
1. 전체 흐름 (시작→경배→고백→선포→응답)
2. 키 전환의 자연스러움
3. 분위기 전환의 적절성
4. BPM/템포 흐름
5. 시간 배분

JSON 형식으로 응답하세요:
{{
  "overall_score": <1-10>,
  "flow_assessment": {{
    "opening": "<시작 평가>",
    "worship": "<경배 구간 평가>",
    "reflection": "<묵상/고백 구간 평가>",
    "declaration": "<선포 구간 평가>",
    "response": "<응답 구간 평가>"
  }},
  "key_flow_analysis": {{
    "score": <1-10>,
    "issues": ["<문제점1>", "<문제점2>"],
    "suggestions": ["<제안1>", "<제안2>"]
  }},
  "mood_flow_analysis": {{
    "score": <1-10>,
    "description": "<분위기 흐름 설명>",
    "suggestions": ["<제안1>"]
  }},
  "tempo_flow_analysis": {{
    "score": <1-10>,
    "description": "<템포 흐름 설명>"
  }},
  "time_balance": {{
    "score": <1-10>,
    "total_minutes": <총 시간>,
    "suggestions": ["<제안>"]
  }},
  "strengths": ["<강점1>", "<강점2>"],
  "improvements": ["<개선점1>", "<개선점2>"],
  "summary": "<종합 평가>"
}}"""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2048,
            messages=[{"role": "user", "content": flow_prompt}]
        )

        response_text = message.content[0].text

        try:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                return json.loads(response_text[json_start:json_end])
            raise ValueError("No JSON found")
        except (json.JSONDecodeError, ValueError):
            return {
                "overall_score": 0,
                "summary": "분석 중 오류가 발생했습니다.",
                "strengths": [],
                "improvements": []
            }

    async def generate(self, prompt: str, max_tokens: int = 1024) -> str:
        """Generic AI generation method."""
        if not self.client:
            raise ValueError("Anthropic API key not configured")

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}]
        )

        return message.content[0].text

    def _calculate_key_distance(self, from_key: str, to_key: str) -> int:
        """Calculate the semitone distance between two keys."""
        key_map = {
            "C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3,
            "E": 4, "F": 5, "F#": 6, "Gb": 6, "G": 7, "G#": 8,
            "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11
        }

        # Handle minor keys (e.g., "Am" -> "A")
        from_base = from_key.replace("m", "").strip()
        to_base = to_key.replace("m", "").strip()

        from_semitone = key_map.get(from_base, 0)
        to_semitone = key_map.get(to_base, 0)

        distance = abs(to_semitone - from_semitone)
        return min(distance, 12 - distance)

    async def extract_chords_from_lyrics(
        self,
        title: str,
        artist: str,
        lyrics: str,
        key: Optional[str] = None
    ) -> dict:
        """Use AI to extract/suggest chords for lyrics."""
        if not self._has_valid_api_key():
            return self._get_demo_chord_extraction(title, lyrics, key)

        chord_prompt = f"""당신은 한국 CCM 및 찬양 코드 전문가입니다.
다음 찬양의 가사를 분석하여 적절한 코드를 배치해주세요.

## 곡 정보
- 제목: {title}
- 아티스트: {artist}
- 키: {key or "분석 필요"}

## 가사
{lyrics}

## 작업 지침
1. 각 가사 라인에 적절한 코드를 배치하세요
2. 한국 CCM/찬양에서 자주 사용되는 코드 진행을 참고하세요
3. 박자와 흐름을 고려하여 코드를 배치하세요
4. ChordPro 형식으로 출력하세요: [G]가사 [D]가사

## 일반적인 코드 진행 참고
- 감사/경배: I - V - vi - IV (예: G - D - Em - C)
- 고백/기도: vi - IV - I - V (예: Em - C - G - D)
- 선포/빌드업: I - IV - V - I (예: G - C - D - G)
- 후렴/절정: IV - V - I (예: C - D - G)

JSON 형식으로 응답하세요:
{{
  "key": "<감지된 키>",
  "time_signature": "<박자 예: 4/4>",
  "chordpro": "<ChordPro 형식의 가사+코드>",
  "chord_progression": ["<사용된 코드 순서>"],
  "unique_chords": ["<사용된 고유 코드들>"],
  "confidence": <1-100 점수>,
  "notes": "<코드 배치 설명>"
}}"""

        message = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": chord_prompt}]
        )

        response_text = message.content[0].text

        try:
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                data = json.loads(response_text[json_start:json_end])
                return {
                    "success": True,
                    "key": data.get("key", key or "G"),
                    "time_signature": data.get("time_signature", "4/4"),
                    "chordpro": data.get("chordpro", ""),
                    "chord_progression": data.get("chord_progression", []),
                    "unique_chords": data.get("unique_chords", []),
                    "confidence": data.get("confidence", 50),
                    "notes": data.get("notes", ""),
                    "source": "ai"
                }
        except json.JSONDecodeError:
            pass

        return {
            "success": False,
            "error": "AI 응답을 파싱하는데 실패했습니다.",
            "source": "ai"
        }

    def _get_demo_chord_extraction(self, title: str, lyrics: str, key: Optional[str]) -> dict:
        """Return demo chord extraction when API key is not configured."""
        lines = lyrics.strip().split('\n')
        demo_chords = ['G', 'D', 'Em', 'C']
        chordpro_lines = []

        for i, line in enumerate(lines):
            if line.strip():
                chord = demo_chords[i % len(demo_chords)]
                chordpro_lines.append(f"[{chord}]{line}")
            else:
                chordpro_lines.append("")

        return {
            "success": True,
            "key": key or "G",
            "time_signature": "4/4",
            "chordpro": "\n".join(chordpro_lines),
            "chord_progression": demo_chords,
            "unique_chords": demo_chords,
            "confidence": 30,
            "notes": "(데모 모드) API 키를 설정하면 AI가 곡에 맞는 정확한 코드를 추출합니다.",
            "source": "demo"
        }


ai_service = AIService()
