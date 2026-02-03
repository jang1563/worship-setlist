from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import get_db

limiter = Limiter(key_func=get_remote_address)
from app.schemas.ai import (
    SetlistGenerateRequest, SetlistGenerateResponse,
    TransitionGuideRequest, TransitionGuideResponse,
    ChatRequest, ChatResponse,
    ChainSongRequest, ChainSongResponse
)
from app.services.ai_service import ai_service
from app.services.key_transition import (
    check_key_compatibility,
    suggest_bridge_progression,
    analyze_setlist_key_flow
)

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/generate-setlist", response_model=SetlistGenerateResponse)
@limiter.limit("10/minute")
async def generate_setlist(
    request: Request,
    body: SetlistGenerateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate a worship setlist based on the request parameters."""
    try:
        result = await ai_service.generate_setlist(body, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/suggest-transition", response_model=TransitionGuideResponse)
async def suggest_transition(
    request: TransitionGuideRequest,
    db: AsyncSession = Depends(get_db)
):
    """Suggest transition methods between two songs."""
    try:
        result = await ai_service.suggest_transition(request, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.post("/check-key-compatibility")
async def check_keys(from_key: str, to_key: str):
    """Check the compatibility of a key transition."""
    compatibility = check_key_compatibility(from_key, to_key)
    bridge = suggest_bridge_progression(from_key, to_key)

    return {
        "from_key": from_key,
        "to_key": to_key,
        "compatibility": compatibility,
        "suggestions": bridge
    }


@router.post("/analyze-key-flow")
async def analyze_keys(keys: list[str]):
    """Analyze the key flow of an entire setlist."""
    result = analyze_setlist_key_flow(keys)
    return result


@router.post("/chain-songs", response_model=ChainSongResponse)
async def recommend_chain_songs(
    request: ChainSongRequest,
    db: AsyncSession = Depends(get_db)
):
    """Recommend songs that chain well from/to a fixed song."""
    try:
        result = await ai_service.recommend_chain_songs(request, db)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chain song recommendation error: {str(e)}")


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """Chat with AI for setlist generation and refinement."""
    # For MVP, we'll use the last user message to determine intent
    if not body.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    last_message = body.messages[-1]
    if last_message.role != "user":
        raise HTTPException(status_code=400, detail="Last message must be from user")

    user_input = last_message.content.lower()
    user_content = last_message.content

    # Check if there's an existing setlist in context (for modification requests)
    current_setlist = None
    if body.context and "currentSetlist" in body.context:
        current_setlist = body.context["currentSetlist"]

    # Keywords indicating modification/refinement request
    modification_keywords = [
        "수정", "변경", "바꿔", "바꾸", "교체", "빼", "빼줘", "제거", "추가",
        "늘려", "줄여", "분으로", "분 분량", "짧게", "길게", "더 빠른", "더 느린",
        "업템포", "다운템포", "분위기", "곡 순서", "조옮김", "키 변경",
        "업데이트", "곡으로", "곡만", "개로", "개만", "다시", "고쳐", "다른",
        "첫 번째", "두 번째", "세 번째", "마지막", "처음", "끝",
        "빼고", "넣어", "넣고", "삭제", "대신"
    ]

    # Also check for number patterns like "2곡", "3곡" when there's a current setlist
    import re
    has_song_count_request = bool(re.search(r'\d+\s*곡', user_input))

    # Detect modification intent when there's a current setlist
    is_modification = current_setlist and (
        any(keyword in user_input for keyword in modification_keywords) or
        has_song_count_request
    )

    if is_modification:
        # Handle modification request
        try:
            # Extract the setlist data from context
            setlist_data = current_setlist.get("setlist", [])

            # Call AI service to refine the setlist
            refined_response = await ai_service.refine_setlist(
                setlist_data,
                user_content,
                db
            )

            response_message = f"""송리스트를 수정했습니다:

{chr(10).join([f"{i+1}. {s.title} (Key: {s.key}) - {s.role}" for i, s in enumerate(refined_response.setlist)])}

총 예상 시간: {refined_response.total_duration_sec // 60}분 {refined_response.total_duration_sec % 60}초
키 흐름: {refined_response.key_flow_assessment}

{refined_response.notes}

추가 수정이 필요하시면 말씀해주세요."""

            return ChatResponse(
                message=response_message,
                setlist=refined_response,
                action="refine"
            )
        except Exception as e:
            return ChatResponse(
                message=f"송리스트 수정 중 오류가 발생했습니다: {str(e)}\n\n다시 시도해주시거나 더 구체적으로 요청해주세요.",
                action="error"
            )

    # Keywords indicating new setlist generation
    generation_keywords = ["송리스트", "추천", "구성", "예배", "찬양"]

    if any(word in user_input for word in generation_keywords):
        # Try to extract parameters from the message
        try:
            # Extract duration from message (e.g., "25분", "30분")
            import re
            duration_match = re.search(r'(\d+)\s*분', user_input)
            duration_minutes = int(duration_match.group(1)) if duration_match else 20

            # Extract service type
            service_type = "주일예배"
            if "청년" in user_input:
                service_type = "청년예배"
            elif "새벽" in user_input:
                service_type = "새벽예배"
            elif "수련회" in user_input:
                service_type = "수련회"
            elif "헌신" in user_input:
                service_type = "헌신예배"

            # Generate a basic setlist request
            generate_request = SetlistGenerateRequest(
                service_type=service_type,
                duration_minutes=duration_minutes,
                sermon_topic=user_content,
                mood_request="자연스럽게"
            )
            setlist_response = await ai_service.generate_setlist(generate_request, db)

            response_message = f"""송리스트를 구성했습니다:

{chr(10).join([f"{i+1}. {s.title} (Key: {s.key}) - {s.role}" for i, s in enumerate(setlist_response.setlist)])}

총 예상 시간: {setlist_response.total_duration_sec // 60}분 {setlist_response.total_duration_sec % 60}초
키 흐름: {setlist_response.key_flow_assessment}

{setlist_response.notes}

수정이 필요하시면 말씀해주세요. (예: "10분 분량으로 줄여줘", "더 잔잔한 곡으로 바꿔줘")"""

            return ChatResponse(
                message=response_message,
                setlist=setlist_response,
                action="generate"
            )
        except Exception as e:
            return ChatResponse(
                message=f"송리스트 생성 중 오류가 발생했습니다: {str(e)}",
                action="error"
            )

    # Default response for other queries
    return ChatResponse(
        message="""안녕하세요! AI 찬양 컨설턴트입니다.

송리스트를 구성하려면 다음 정보를 알려주세요:
- 예배 유형 (주일예배, 청년예배, 새벽예배 등)
- 예상 시간
- 설교 본문/주제 (있다면)
- 원하는 분위기

예: "이번 주일 청년예배 25분, 설교 주제는 '성령의 인도하심'이야"

이 추천은 참고용입니다. 예배의 최종 결정은 성령의 인도하심과 인도자의 분별을 통해 이루어집니다.""",
        action="info"
    )
