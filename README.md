# WorshipFlow (찬양설계)

> AI 기반 한국 교회 예배 찬양 설계 도구

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 소개

WorshipFlow는 예배 맥락을 대화로 말하면 AI가 찬양 흐름을 설계하고, 곡 전환까지 가이드해주는 한국 교회 특화 오픈소스 도구입니다.

### 주요 기능 (MVP)

- **AI 대화형 송리스트 생성** - 예배 유형, 설교 주제를 말하면 AI가 자동 구성
- **한국 CCM + 찬송가 특화** - 마커스, 제이어스, 어노인팅, 새찬송가 등 20곡 내장
- **키 전환 자동 분석** - 어색한 전환 경고 + 브릿지 코드 제안
- **드래그앤드롭 편집기** - 송리스트 순서/키 자유롭게 조정
- **무료 오픈소스** - Planning Center 대비 비용 장벽 제거

## 시작하기

### 요구사항

- Node.js 18+
- Python 3.11+
- Anthropic API Key (AI 기능 사용 시)

### 빠른 시작

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/worshipflow.git
cd worshipflow

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY 설정

# 3. 셋업 스크립트 실행
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 수동 설치

```bash
# Backend 설정
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 시드 데이터 삽입
cd ..
python -m backend.app.seed

# Frontend 설정
cd frontend
npm install
```

### 실행

**개발 서버 (별도 터미널)**

```bash
# Backend (터미널 1)
cd backend && source venv/bin/activate
uvicorn app.main:app --reload

# Frontend (터미널 2)
cd frontend
npm run dev
```

**Docker로 실행 (개발)**

```bash
docker compose up
```

**Docker로 실행 (프로덕션)**

```bash
# 환경 변수 설정
export ANTHROPIC_API_KEY=your-api-key
export JWT_SECRET=$(openssl rand -hex 32)

# 프로덕션 빌드 및 실행
docker compose -f docker-compose.prod.yml up --build -d
```

브라우저에서 `http://localhost:3000` (개발) 또는 `http://localhost` (프로덕션) 접속

## 사용 예시

```
사용자: "이번 주일 청년예배 25분, 설교 주제는 '성령의 인도하심'이야"

AI: 추천 송리스트를 구성했습니다:

1. 주 안에서 행복 (Key: G, 4:00) - 시작/감사
2. 성령이여 오소서 (Key: A, 5:00) - 경배/간구
   └ 전환: G → A (피아노 2마디 브릿지)
3. 하나님의 세계 (Key: D, 4:30) - 선포
4. 주의 사랑이 나를 놓지 않네 (Key: G, 5:30) - 고백/응답

총 예상 시간: 23분
키 흐름: G → A → D → G ✓ 자연스러움
```

## 기술 스택

| 분야 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, react-dnd |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.x, Pydantic 2.x |
| AI | Claude API (Anthropic) |
| Database | SQLite (aiosqlite) |
| 상태관리 | zustand, TanStack Query |

## 프로젝트 구조

```
worshipflow/
├── frontend/               # React 앱
│   ├── src/
│   │   ├── components/     # UI 컴포넌트
│   │   │   ├── chat/       # AI 대화 UI
│   │   │   ├── setlist/    # 송리스트 편집기
│   │   │   ├── songs/      # 찬양 DB
│   │   │   └── common/     # 공통 컴포넌트
│   │   ├── stores/         # zustand 상태
│   │   ├── services/       # API 클라이언트
│   │   └── types/          # TypeScript 타입
│   └── package.json
├── backend/                # FastAPI 서버
│   └── app/
│       ├── api/routes/     # API 엔드포인트
│       ├── models/         # SQLAlchemy 모델
│       ├── schemas/        # Pydantic 스키마
│       └── services/       # AI, 키 전환 서비스
├── data/                   # 시드 데이터 (353곡 + 코드차트)
├── scripts/                # 셋업/실행 스크립트
└── docker-compose.yml
```

## API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/songs` | 찬양 목록 조회 |
| `POST /api/setlists` | 송리스트 생성 |
| `POST /api/ai/generate-setlist` | AI 송리스트 생성 |
| `POST /api/ai/chat` | AI 대화 |
| `POST /api/ai/check-key-compatibility` | 키 호환성 체크 |
| `POST /api/ai/analyze-key-flow` | 키 흐름 분석 |

## 로드맵

- [x] **Phase 1: MVP** - AI 송리스트 생성, 키 전환 체크, 기본 UI
- [ ] Phase 2: 코드 & 악보 - AI 코드 추출, ChordPro 편집기
- [ ] Phase 3: 연습 도구 - 유튜브 MR, 속도 조절
- [ ] Phase 4: 실시간 예배 - 가사 프로젝터
- [ ] Phase 5: 커뮤니티 - 인증, 팀, 공유

## 기여하기

기여를 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 라이선스

MIT License

---

> **안내**: 이 도구의 추천은 참고용입니다. 예배의 최종 결정은 성령의 인도하심과 인도자의 분별을 통해 이루어집니다.
