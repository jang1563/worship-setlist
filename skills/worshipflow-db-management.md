# WorshipFlow 데이터베이스 관리 스킬

찬양 DB 관리 및 곡 데이터 처리 패턴입니다.

## 데이터베이스 위치

```
backend/data/worshipflow.db  # SQLite 개발 DB
```

## 곡 데이터 구조

```sql
CREATE TABLE songs (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,           -- 한글 제목
    title_en TEXT,                 -- 영어 제목
    title_original TEXT,           -- 원곡 제목
    artist TEXT,                   -- 아티스트/팀
    album TEXT,
    year INTEGER,
    default_key TEXT,              -- 기본 키 (C, D, E, F, G, A, B + m)
    bpm INTEGER,
    duration_sec INTEGER,
    mood_tags TEXT,                -- JSON: ["경배", "감사", ...]
    service_types TEXT,            -- JSON: ["주일예배", "수요예배", ...]
    season_tags TEXT,              -- JSON: ["부활절", "성탄절", ...]
    difficulty TEXT,               -- easy, medium, hard
    youtube_url TEXT,
    hymn_number INTEGER,           -- 찬송가 번호 (해당시)
    scripture_refs TEXT,           -- JSON: ["시편 23:1", ...]
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 자주 사용하는 쿼리

### 곡 현황 확인

```python
import sqlite3

conn = sqlite3.connect('./backend/data/worshipflow.db')
cursor = conn.cursor()

# 총 곡 수
cursor.execute('SELECT COUNT(*) FROM songs')
total = cursor.fetchone()[0]

# YouTube 링크 있는 곡
cursor.execute('SELECT COUNT(*) FROM songs WHERE youtube_url IS NOT NULL')
with_url = cursor.fetchone()[0]

print(f"총 {total}곡, YouTube 링크: {with_url}곡 ({with_url*100//total}%)")
```

### 특정 조건 곡 검색

```python
# 분위기 태그로 검색
cursor.execute('''
    SELECT title, artist, default_key
    FROM songs
    WHERE mood_tags LIKE '%경배%'
''')

# 예배 유형으로 검색
cursor.execute('''
    SELECT title, artist
    FROM songs
    WHERE service_types LIKE '%주일예배%'
''')

# 시즌 태그로 검색 (크리스마스, 부활절 등)
cursor.execute('''
    SELECT title
    FROM songs
    WHERE season_tags LIKE '%성탄절%'
''')
```

### 곡 일괄 업데이트

```python
# 여러 곡 정보 한번에 업데이트
updates = [
    ('주의 사랑이 나를 놓지 않네', 'https://youtube.com/...', 'C'),
    ('아름다우신', 'https://youtube.com/...', 'G'),
]

for title, youtube_url, key in updates:
    cursor.execute('''
        UPDATE songs
        SET youtube_url = ?, default_key = ?
        WHERE title = ?
    ''', (youtube_url, key, title))

conn.commit()
```

## 시드 데이터 관리

### 시드 파일 위치

```
data/songs_seed.json       # 기본 곡 데이터
data/translations.json     # 번안곡 매핑
```

### 시드 데이터 형식

```json
{
  "songs": [
    {
      "title": "주의 사랑이 나를 놓지 않네",
      "title_en": "Reckless Love",
      "artist": "마커스워십",
      "default_key": "C",
      "bpm": 76,
      "mood_tags": ["경배", "감사"],
      "service_types": ["주일예배"],
      "youtube_url": "https://www.youtube.com/watch?v=..."
    }
  ]
}
```

## 백업 및 복원

```bash
# 백업
cp backend/data/worshipflow.db backend/data/worshipflow_backup_$(date +%Y%m%d).db

# 복원
cp backend/data/worshipflow_backup_YYYYMMDD.db backend/data/worshipflow.db
```

## 주의사항

1. **개발 DB는 SQLite, 프로덕션은 PostgreSQL** - 쿼리 호환성 주의
2. **JSON 필드는 TEXT로 저장** - SQLite에서 JSON 함수 제한적
3. **변경 전 백업 필수** - 실수로 데이터 손실 방지
