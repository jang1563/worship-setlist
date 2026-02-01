# FastAPI 인증 패턴 스킬

MVP와 프로덕션 환경에서의 인증 처리 패턴입니다.

## 인증 의존성 패턴

### 필수 인증 (프로덕션용)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """인증 필수 - 토큰 없으면 401 에러"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    # ... 사용자 조회 로직
    return user
```

### 선택적 인증 (MVP/개발용)

```python
async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """인증 선택적 - 토큰 없어도 None 반환"""
    if token is None:
        return None

    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None
```

## 엔드포인트 적용

### MVP 단계 (인증 선택적)

```python
@router.post("", response_model=SetlistResponse)
async def create_setlist(
    setlist_data: SetlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional)  # 선택적
):
    # current_user가 None이어도 동작
    setlist = Setlist(
        title=setlist_data.title,
        # user_id=current_user.id if current_user else None,  # 선택적 사용자 연결
        ...
    )
```

### 프로덕션 (인증 필수)

```python
@router.post("", response_model=SetlistResponse)
async def create_setlist(
    setlist_data: SetlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 필수
):
    # current_user 보장됨
    setlist = Setlist(
        title=setlist_data.title,
        user_id=current_user.id,
        ...
    )
```

## 마이그레이션 체크리스트

MVP → 프로덕션 전환 시:

- [ ] `get_current_user_optional` → `get_current_user`로 변경
- [ ] `User | None` → `User`로 타입 변경
- [ ] 사용자별 데이터 분리 로직 추가
- [ ] 권한 체크 로직 추가 (본인 데이터만 수정 가능)

## 관련 파일

- `backend/app/api/deps.py` - 인증 의존성 정의
- `backend/app/core/security.py` - JWT 토큰 처리
- `backend/app/api/routes/*.py` - 엔드포인트에서 사용
