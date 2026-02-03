# WorshipFlow 개발 로드맵 & 체크리스트

## Phase 1: MVP (4주)

### Week 1: 프로젝트 셋업

- [ ] **프로젝트 초기화**
  - [ ] Git 저장소 생성
  - [ ] Frontend: Vite + React + TypeScript 셋업
  - [ ] Backend: FastAPI 보일러플레이트
  - [ ] Docker Compose 구성
  - [ ] ESLint, Prettier 설정

- [ ] **기본 구조 구현**
  - [ ] Frontend 라우팅 (React Router)
  - [ ] Backend API 구조 (/api/v1)
  - [ ] 환경 변수 관리 (.env)
  - [ ] CORS 설정

### Week 2: 찬양 DB & 기본 UI

- [ ] **데이터베이스**
  - [ ] SQLAlchemy 모델 정의 (Song, Setlist, etc.)
  - [ ] Alembic 마이그레이션 셋업
  - [ ] 시드 데이터 삽입 스크립트
  - [ ] 기본 CRUD API

- [ ] **기본 UI**
  - [ ] 레이아웃 컴포넌트 (Header, Sidebar, Main)
  - [ ] 찬양 목록 페이지
  - [ ] 찬양 상세 페이지
  - [ ] TailwindCSS 테마 설정

### Week 3: AI 송리스트 생성 (핵심)

- [ ] **AI 서비스**
  - [ ] Claude API 연동 (anthropic 패키지)
  - [ ] 시스템 프롬프트 최적화
  - [ ] 응답 파싱 (JSON → Pydantic)
  - [ ] 에러 핸들링

- [ ] **대화 UI**
  - [ ] 채팅 인터페이스 컴포넌트
  - [ ] 메시지 입력/표시
  - [ ] 로딩 상태 (스트리밍 옵션)
  - [ ] 송리스트 결과 카드

### Week 4: 편집 & 전환 가이드

- [ ] **송리스트 편집기**
  - [ ] 드래그앤드롭 (react-dnd)
  - [ ] 곡 추가/제거
  - [ ] 키 변경
  - [ ] 순서 변경

- [ ] **키 전환 체크**
  - [ ] 키 호환성 알고리즘
  - [ ] 경고 표시 UI
  - [ ] 전환 가이드 API
  - [ ] 피벗 코드 제안

- [ ] **MVP 마무리**
  - [ ] 버그 수정
  - [ ] 기본 반응형
  - [ ] 사용자 피드백 수집 UI

---

## Phase 2: 코드 & 악보 (3주)

### Week 5: 코드 추출

- [ ] autochord 설치 및 테스트
- [ ] yt-dlp 오디오 추출
- [ ] 코드 추출 API
- [ ] 신뢰도 표시

### Week 6: ChordPro 편집기

- [ ] ChordSheetJS 통합
- [ ] 실시간 미리보기
- [ ] 트랜스포즈 기능
- [ ] 저장/불러오기

### Week 7: 내보내기

- [ ] ChordPro 포맷 내보내기
- [ ] PowerPoint 생성 (python-pptx)
- [ ] FreeShow/OpenLP JSON
- [ ] PDF 내보내기

---

## Phase 3: 연습 도구 (3주)

### Week 8: 유튜브 플레이어

- [ ] YouTube IFrame API 통합
- [ ] MR 자동 검색
- [ ] 커스텀 컨트롤 UI

### Week 9: 연습 기능

- [ ] 속도 조절 (0.25x ~ 2x)
- [ ] A-B 구간 반복
- [ ] 단축키 지원

### Week 10: 코드 동기화

- [ ] 타임스탬프 매핑
- [ ] 현재 코드 하이라이트
- [ ] 자동 스크롤

---

## Phase 4: 실시간 예배 (3주)

### Week 11: 프레젠테이션

- [ ] 전체화면 가사 표시
- [ ] 폰트/배경 커스터마이즈
- [ ] 단축키 슬라이드 전환

### Week 12: 인도자 도구

- [ ] 인도자 대시보드
- [ ] 스테이지 모니터 뷰
- [ ] 듀얼 모니터 지원

### Week 13: 고급 기능

- [ ] 이중 언어 표시
- [ ] 원격 제어 (WebSocket)
- [ ] NDI 출력 (옵션)

---

## Phase 5: 커뮤니티 (3주)

### Week 14: 인증

- [ ] 회원가입/로그인
- [ ] JWT 인증
- [ ] 소셜 로그인 (Google)

### Week 15: 팀 기능

- [ ] 팀 생성/초대
- [ ] 역할 관리
- [ ] 송리스트 공유

### Week 16: 배포 & 공개

- [ ] Vercel 배포 (Frontend)
- [ ] Railway 배포 (Backend)
- [ ] Supabase 마이그레이션
- [ ] GitHub 오픈소스 공개
- [ ] 문서화

---

## 기술 부채 & 개선

### 성능 최적화
- [ ] API 응답 캐싱 (Redis)
- [ ] 이미지 최적화
- [ ] 번들 사이즈 최적화

### 테스트
- [ ] Unit 테스트 (pytest, vitest)
- [ ] E2E 테스트 (Playwright)
- [ ] API 테스트

### 접근성
- [ ] 키보드 네비게이션
- [ ] 스크린 리더 지원
- [ ] 색상 대비 체크

---

## 마일스톤 체크포인트

| 마일스톤 | 목표 | 완료일 |
|---------|------|-------|
| MVP 알파 | AI 송리스트 생성 작동 | Week 3 |
| MVP 베타 | 편집 + 전환 가이드 | Week 4 |
| v0.2 | 코드 추출 + 편집기 | Week 7 |
| v0.3 | 연습 도구 | Week 10 |
| v0.4 | 실시간 예배 | Week 13 |
| v1.0 | 커뮤니티 + 배포 | Week 16 |
