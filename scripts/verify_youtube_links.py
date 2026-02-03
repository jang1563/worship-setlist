#!/usr/bin/env python3
"""
YouTube 링크 검증 및 수정 스크립트

깨진 YouTube 링크를 찾아서 대체 링크로 업데이트합니다.
"""

import sqlite3
import subprocess
import json
import sys
import time
import os

# 플러시 출력
def log(msg):
    print(msg, flush=True)

def extract_video_id(url):
    """URL에서 YouTube video ID 추출"""
    import re
    if 'youtu.be' in url:
        parts = url.split('/')
        return parts[-1].split('?')[0] if parts else None
    elif 'youtube.com' in url:
        match = re.search(r'[?&]v=([a-zA-Z0-9_-]{11})', url)
        if match:
            return match.group(1)
    return None

def check_video_available(url):
    """yt-dlp를 사용해 비디오 사용 가능 여부 확인"""
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

def search_replacement(title, artist=""):
    """대체 YouTube 링크 검색"""
    query = f"{title} {artist} worship"
    try:
        result = subprocess.run(
            ['yt-dlp', '--skip-download', '--no-warnings', '-j', f'ytsearch1:{query}'],
            capture_output=True,
            text=True,
            timeout=15
        )
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout)
            return f"https://www.youtube.com/watch?v={data['id']}", data.get('title', '')
    except:
        pass
    return None, None

def main():
    db_path = os.path.join(os.path.dirname(__file__), '../backend/data/worshipflow.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all songs with youtube URLs
    cursor.execute('''
        SELECT id, title, artist, youtube_url
        FROM songs
        WHERE youtube_url IS NOT NULL AND youtube_url != ""
        ORDER BY id
    ''')
    songs = cursor.fetchall()

    log(f"총 {len(songs)}개 YouTube URL 확인 중...")

    working = 0
    broken = []

    # Step 1: Check all URLs
    for i, (song_id, title, artist, url) in enumerate(songs):
        if (i + 1) % 20 == 0:
            log(f"진행: {i+1}/{len(songs)}...")

        if check_video_available(url):
            working += 1
        else:
            broken.append((song_id, title, artist, url))

    log(f"\n결과: {working}개 정상, {len(broken)}개 오류 (총 {len(songs)}개 중)")

    if not broken:
        log("모든 링크가 정상입니다!")
        return

    # Step 2: Try to fix broken URLs
    log(f"\n{len(broken)}개 깨진 링크 수정 시도 중...")
    updated = 0
    cleared = 0

    for song_id, title, artist, old_url in broken:
        new_url, new_title = search_replacement(title, artist)

        if new_url:
            cursor.execute('UPDATE songs SET youtube_url = ? WHERE id = ?', (new_url, song_id))
            updated += 1
            log(f"✓ 업데이트: {title}")
        else:
            # Clear broken link
            cursor.execute('UPDATE songs SET youtube_url = NULL WHERE id = ?', (song_id,))
            cleared += 1
            log(f"✗ 링크 제거: {title}")

        time.sleep(0.3)

    conn.commit()
    conn.close()

    log(f"\n완료: {updated}개 업데이트, {cleared}개 링크 제거")

if __name__ == "__main__":
    main()
