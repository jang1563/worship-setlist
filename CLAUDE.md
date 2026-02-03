# CLAUDE.md - WorshipFlow 프로젝트 가이드

이 파일은 Claude Code가 WorshipFlow 프로젝트를 이해하고 개발하는 데 필요한 컨텍스트를 제공합니다.

## 프로젝트 개요

**WorshipFlow** (찬양설계)는 AI 기반 한국 교회 예배 찬양 설계 도구입니다.

### 핵심 가치
- AI 대화형 송리스트 생성 (핵심 혁신)
- 한국 CCM + 찬송가 특화
- 무료/오픈소스
- 준비 → 연습 → 실행 통합 워크플로우

### 타겟 사용자
- 워십 리더 / 찬양 인도자
- 찬양팀 멤버
- 소규모 교회

---

## 기술 스택

### Frontend
- React 18 + TypeScript
- Vite (빌드)
- TailwindCSS (스타일링)
- ChordSheetJS (코드 파싱/트랜스포즈)
- Tone.js (MIDI 재생)
- react-dnd (드래그앤드롭)
- zustand (상태관리)

### Backend
- Python 3.11+
- FastAPI
- SQLAlchemy 2.x
- Pydantic 2.x
- Claude API (anthropic 패키지)
- yt-dlp (유튜브)
- autochord (코드 추출)

### Database
- 개발: SQLite
- 프로덕션: PostgreSQL (Supabase)

---

## 개발 환경 설정

### Conda 환경 (권장)

ARM64 네이티브 conda 환경이 구성되어 있습니다 (M3 최적화):

```bash
# 환경 활성화 (프로젝트 루트에서)
source activate.sh

# 또는 직접 활성화
conda activate worshipflow

# 환경 재생성 (필요시)
conda env create -f environment.yml
```

**환경 정보:**
- Python: 3.11
- Node.js: 20
- Conda 경로: `/Users/jak4013/miniconda3-arm64/envs/worshipflow`

---

## 프로젝트 구조

```
worshipflow/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # 대화 UI (AI 인터페이스)
│   │   │   ├── setlist/        # 송리스트 편집기
│   │   │   ├── player/         # 연습 플레이어
│   │   │   ├── presenter/      # 프레젠테이션 모드
│   │   │   └── common/         # 공통 컴포넌트
│   │   ├── hooks/
│   │   ├── stores/             # zustand
│   │   ├── services/           # API 클라이언트
│   │   └── utils/
│   │       ├── chordpro.ts     # ChordPro 유틸
│   │       └── transpose.ts    # 트랜스포즈
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/routes/         # API 엔드포인트
│   │   ├── core/               # 설정, 보안, DB
│   │   ├── models/             # SQLAlchemy 모델
│   │   ├── schemas/            # Pydantic 스키마
│   │   └── services/           # 비즈니스 로직
│   │       ├── ai_service.py   # Claude API 연동
│   │       ├── chord_extractor.py
│   │       └── midi_generator.py
│   └── requirements.txt
│
├── data/
│   ├── seeds/                  # 초기 데이터
│   └── prompts/                # AI 프롬프트
│
└── docs/                       # PRD, 기술문서
```

---

## 개발 페이즈

### Phase 1: MVP (현재 목표)
- [ ] 프로젝트 셋업 (Vite + FastAPI)
- [ ] 기본 UI 레이아웃
- [ ] 찬양 DB CRUD
- [ ] AI 송리스트 생성 (핵심)
- [ ] 키 전환 체크
- [ ] 전환 가이드

### Phase 2: 코드 & 악보
- [ ] AI 코드 추출 (autochord)
- [ ] ChordPro 편집기
- [ ] 악보 링크 검색
- [ ] PPT/PDF 내보내기

### Phase 3: 연습 도구
- [ ] 유튜브 MR 플레이어
- [ ] 속도 조절 + 구간 반복
- [ ] 코드 동기화 표시
- [ ] MIDI 연습 가이드

### Phase 4: 실시간 예배
- [ ] 가사 프로젝터 모드
- [ ] 인도자 대시보드
- [ ] 스테이지 모니터

### Phase 5: 커뮤니티
- [ ] 인증/팀 기능
- [ ] 코드차트 공유
- [ ] 클라우드 배포

---

## 주요 API 엔드포인트

```
POST /api/ai/generate-setlist    # 핵심 기능
POST /api/ai/refine-setlist
POST /api/ai/suggest-transition
POST /api/ai/extract-chords

GET  /api/songs
GET  /api/songs/{id}
POST /api/setlists
GET  /api/setlists/{id}
```

---

## 환경 변수

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./data/worshipflow.db
JWT_SECRET=your-secret
```

---

## 코딩 컨벤션

### Python (Backend)
- Type hints 필수
- Pydantic으로 입출력 검증
- async/await 사용
- 에러 처리: HTTPException

```python
@router.post("/generate-setlist", response_model=SetlistResponse)
async def generate_setlist(
    request: SetlistRequest,
    db: Session = Depends(get_db)
) -> SetlistResponse:
    ...
```

### TypeScript (Frontend)
- 함수형 컴포넌트 + hooks
- 타입 명시적 정의
- 컴포넌트 파일명: PascalCase
- 유틸 파일명: camelCase

```typescript
interface SetlistProps {
  songs: Song[];
  onReorder: (songs: Song[]) => void;
}

const SetlistEditor: React.FC<SetlistProps> = ({ songs, onReorder }) => {
  ...
}
```

---

## 핵심 알고리즘

### 키 호환성 체크
```python
def check_key_compatibility(from_key: str, to_key: str) -> str:
    """
    Returns: "자연스러움" | "괜찮음" | "어색함"
    
    자연스러움: 같은 키, ±2반음, 4도/5도 관계
    괜찮음: ±3반음, 상대 장/단조
    어색함: ±4반음 이상
    """
```

### AI 프롬프트 구조
1. 시스템 프롬프트: 역할 정의, 출력 형식
2. 사용자 프롬프트: 예배 정보, 곡 DB
3. 응답 파싱: JSON → SetlistResponse

---

## 테스트 전략

### Backend
```bash
pytest tests/
pytest tests/test_ai_service.py -v
```

### Frontend
```bash
npm test
npm run test:e2e
```

---

## 배포

### 개발
```bash
# Backend
cd backend && uvicorn app.main:app --reload

# Frontend
cd frontend && npm run dev
```

### Docker
```bash
docker-compose up -d
```

### 프로덕션
- Frontend: Vercel
- Backend: Railway / Fly.io
- DB: Supabase

---

## 중요 참고사항

### 저작권
- 악보 이미지 직접 호스팅 ❌
- 음원/MR 직접 제공 ❌
- 외부 링크 제공 ✅
- 커뮤니티 코드차트 ✅

### 안내 문구 (필수)
> "이 추천은 참고용입니다. 예배의 최종 결정은 성령의 인도하심과 인도자의 분별을 통해 이루어집니다."

---

## 도움이 필요한 작업

현재 MVP 단계에서 우선순위:

1. **프로젝트 초기 셋업** - Vite + FastAPI 보일러플레이트
2. **AI 서비스 구현** - Claude API 연동, 프롬프트 최적화
3. **찬양 DB 모델** - SQLAlchemy 모델, 시드 데이터 삽입
4. **대화 UI** - 채팅 인터페이스 컴포넌트
5. **송리스트 편집기** - 드래그앤드롭 UI

---

## 문서 위치

- PRD: `docs/01_PRD.md`
- 기술 스펙: `docs/02_TECH_SPEC.md`
- DB 스키마: `docs/03_DATABASE.md`
- AI 프롬프트: `docs/04_AI_PROMPTS.md`
- 시드 데이터: `data/songs_seed.json`
- 번안곡 매핑: `data/translations.json`
