# YouTube CCM 링크 관리 스킬

한국 CCM/찬양곡의 YouTube 링크를 검증하고 업데이트하는 스킬입니다.

## 신뢰할 수 있는 한국 CCM YouTube 채널

찬양곡 YouTube 링크를 찾을 때 우선적으로 검색해야 할 채널:

| 채널명 | 특징 |
|--------|------|
| 마커스워십 (Markers Worship) | 현대 워십, 라이브 세션 |
| 제이어스 (J-US) | CCM, 워십 |
| 어노인팅 (Anointing) | 전통 워십, 찬양 |
| 아이자야식스티원 (Isaiah 6tyOne) | 현대 워십 |
| 히즈윌 (His Will) | CCM |
| 다윗의장막 | 워십, 기도음악 |
| 소원 (SMYS) | CCM |
| 예수전도단 (YWAM) | 워십 |

## YouTube 링크 검증 방법

### yt-dlp를 사용한 검증

```bash
# 단일 URL 검증
yt-dlp --skip-download --no-warnings -j "URL"

# 반환 코드가 0이면 유효, 아니면 무효
```

### Python 스크립트로 대량 검증

```python
import subprocess
import sqlite3

def check_video_available(url):
    """YouTube 비디오 유효성 확인"""
    try:
        result = subprocess.run(
            ['yt-dlp', '--skip-download', '--no-warnings', '-j', url],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except:
        return False

# DB에서 모든 곡 검증
conn = sqlite3.connect('./backend/data/worshipflow.db')
cursor = conn.cursor()
cursor.execute('SELECT id, title, youtube_url FROM songs WHERE youtube_url IS NOT NULL')
for song_id, title, url in cursor.fetchall():
    if not check_video_available(url):
        print(f"깨진 링크: {title}")
```

## 링크 업데이트 패턴

```python
# 검증된 링크 일괄 업데이트
verified_links = {
    '곡 제목': 'https://www.youtube.com/watch?v=VIDEO_ID',
    # ...
}

for title, url in verified_links.items():
    cursor.execute('UPDATE songs SET youtube_url = ? WHERE title = ?', (url, title))
conn.commit()
```

## 주의사항

1. **자동 검색보다 수동 검증이 안정적** - `ytsearch`로 찾은 링크는 관련 없는 영상일 수 있음
2. **시간이 지나면 링크가 깨질 수 있음** - 정기적 검증 필요
3. **저작권 주의** - 공식 채널 또는 합법적 업로드 영상만 사용
