# WorshipFlow 기술 스펙 (Technical Specification)

## 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                  React + TypeScript + PWA                    │
├─────────────────────────────────────────────────────────────┤
│  • 대화형 UI (채팅 인터페이스)                                │
│  • 송리스트 편집기 (react-dnd)                               │
│  • ChordSheetJS (코드 파싱/트랜스포즈)                       │
│  • Tone.js (MIDI 재생)                                      │
│  • YouTube IFrame API (연습 플레이어)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API / WebSocket
┌─────────────────────┴───────────────────────────────────────┐
│                        Backend                               │
│                    Python FastAPI                            │
├─────────────────────────────────────────────────────────────┤
│  • Claude API (송리스트 생성)                                │
│  • Ollama (로컬 LLM 옵션)                                   │
│  • autochord (코드 추출)                                    │
│  • yt-dlp (유튜브 오디오)                                   │
│  • pretty_midi (MIDI 생성)                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                       Database                               │
│              SQLite (로컬) → PostgreSQL (확장)               │
└─────────────────────────────────────────────────────────────┘
```

---

## 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| React | 18.x | UI 프레임워크 |
| TypeScript | 5.x | 타입 안전성 |
| Vite | 5.x | 빌드 도구 |
| TailwindCSS | 3.x | 스타일링 |
| react-dnd | 16.x | 드래그앤드롭 |
| ChordSheetJS | 10.x | 코드 파싱/포매팅 |
| Tone.js | 14.x | MIDI/오디오 재생 |
| zustand | 4.x | 상태 관리 |
| react-query | 5.x | 서버 상태 관리 |

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| Python | 3.11+ | 런타임 |
| FastAPI | 0.109+ | API 프레임워크 |
| SQLAlchemy | 2.x | ORM |
| Pydantic | 2.x | 데이터 검증 |
| anthropic | 0.18+ | Claude API |
| yt-dlp | 2024.x | 유튜브 다운로드 |
| librosa | 0.10+ | 오디오 분석 |
| pretty_midi | 0.2+ | MIDI 생성 |

---

## 프로젝트 구조

```
worshipflow/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/           # 대화 UI
│   │   │   ├── setlist/        # 송리스트 편집
│   │   │   ├── player/         # 연습 플레이어
│   │   │   ├── presenter/      # 프레젠테이션
│   │   │   └── common/         # 공통 컴포넌트
│   │   ├── hooks/
│   │   ├── stores/             # zustand stores
│   │   ├── services/           # API 클라이언트
│   │   ├── utils/
│   │   │   ├── chordpro.ts     # ChordPro 유틸
│   │   │   ├── transpose.ts    # 트랜스포즈
│   │   │   └── midi.ts         # MIDI 유틸
│   │   ├── types/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── songs.py
│   │   │   │   ├── setlists.py
│   │   │   │   ├── ai.py
│   │   │   │   ├── chords.py
│   │   │   │   └── auth.py
│   │   │   └── deps.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/             # SQLAlchemy 모델
│   │   ├── schemas/            # Pydantic 스키마
│   │   ├── services/
│   │   │   ├── ai_service.py
│   │   │   ├── chord_extractor.py
│   │   │   ├── midi_generator.py
│   │   │   └── youtube_service.py
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── data/
│   ├── seeds/
│   │   ├── songs.json
│   │   ├── hymns.json
│   │   └── translations.json
│   └── prompts/
│       ├── setlist_generation.txt
│       └── transition_guide.txt
│
├── docs/
├── docker-compose.yml
└── README.md
```

---

## API 엔드포인트

### 인증
```
POST /api/auth/register     # 회원가입
POST /api/auth/login        # 로그인
POST /api/auth/refresh      # 토큰 갱신
GET  /api/auth/me           # 현재 사용자
```

### 찬양 (Songs)
```
GET    /api/songs                    # 목록 (필터, 페이징)
GET    /api/songs/{id}               # 상세
POST   /api/songs                    # 생성 (관리자)
PUT    /api/songs/{id}               # 수정
DELETE /api/songs/{id}               # 삭제

GET    /api/songs/{id}/chord-chart   # 코드차트 조회
PUT    /api/songs/{id}/chord-chart   # 코드차트 수정
```

### 송리스트 (Setlists)
```
GET    /api/setlists                 # 목록
GET    /api/setlists/{id}            # 상세
POST   /api/setlists                 # 생성
PUT    /api/setlists/{id}            # 수정
DELETE /api/setlists/{id}            # 삭제

POST   /api/setlists/{id}/export     # 내보내기 (PPT, JSON)
```

### AI
```
POST   /api/ai/generate-setlist      # 송리스트 생성
POST   /api/ai/refine-setlist        # 송리스트 조정 (대화)
POST   /api/ai/suggest-transition    # 전환 가이드 생성
POST   /api/ai/extract-chords        # 코드 추출 (유튜브 URL)
```

### 유틸리티
```
GET    /api/youtube/search-mr        # MR 검색
GET    /api/sheet/search             # 악보 링크 검색
POST   /api/midi/generate            # MIDI 생성
```

---

## 환경 변수

```bash
# .env.example

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
YOUTUBE_API_KEY=...

# Database
DATABASE_URL=sqlite:///./data/worshipflow.db
# DATABASE_URL=postgresql://user:pass@localhost/worshipflow

# Auth
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256

# 옵션: 로컬 LLM
OLLAMA_HOST=http://localhost:11434
USE_LOCAL_LLM=false
```

---

## 외부 라이브러리 활용 예시

### ChordSheetJS (Frontend)
```typescript
import { ChordProParser, HtmlDivFormatter, Song } from 'chordsheetjs';

// 파싱
const parser = new ChordProParser();
const song: Song = parser.parse(chordProText);

// 트랜스포즈
const transposedSong = song.transpose(2); // 반음 2개 올림

// HTML 출력
const formatter = new HtmlDivFormatter();
const html = formatter.format(transposedSong);
```

### autochord (Backend)
```python
import autochord

# 코드 인식
chords = autochord.recognize('audio.wav', lab_fn='output.lab')
# 결과: [('0.0', '5.2', 'G'), ('5.2', '10.1', 'C'), ...]
```

### pretty_midi (Backend)
```python
import pretty_midi

# MIDI 생성
midi = pretty_midi.PrettyMIDI()
piano = pretty_midi.Instrument(program=0)

# 코드 추가 (C major: C, E, G)
for note_number in [60, 64, 67]:
    note = pretty_midi.Note(
        velocity=100,
        pitch=note_number,
        start=0.0,
        end=2.0
    )
    piano.notes.append(note)

midi.instruments.append(piano)
midi.write('output.mid')
```

### YouTube IFrame API (Frontend)
```typescript
// 유튜브 플레이어 초기화
const player = new YT.Player('player', {
  videoId: 'VIDEO_ID',
  events: {
    onReady: (event) => {},
    onStateChange: (event) => {}
  }
});

// 속도 조절
player.setPlaybackRate(0.75);

// 구간 반복
function loopSection(startSec: number, endSec: number) {
  player.seekTo(startSec);
  player.playVideo();
  
  const checkLoop = () => {
    if (player.getCurrentTime() >= endSec) {
      player.seekTo(startSec);
    }
    requestAnimationFrame(checkLoop);
  };
  checkLoop();
}
```

---

## 배포 구성

### Docker Compose (개발)
```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite:///./data/worshipflow.db
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

### 프로덕션
- Frontend: Vercel
- Backend: Railway / Fly.io
- Database: Supabase (PostgreSQL)
