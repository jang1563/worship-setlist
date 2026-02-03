#!/usr/bin/env python3
"""
Add trending worship songs popular with Korean 20s-30s demographic.
Verifies YouTube links using yt-dlp before adding.
"""

import json
import subprocess
import sys
import time
from typing import Optional, List

# Songs to add - curated for 20s-30s Korean worship preference
# Format: (title, artist, key, tempo, themes, search_queries)
NEW_SONGS = [
    # SHAKE (신흥 인기 워십팀)
    ("물댄동산", "SHAKE", "G", "medium", ["은혜", "회복"], ["물댄동산 SHAKE", "물댄동산 원웨이싱어즈"]),
    ("예수 우리 왕이여", "SHAKE", "A", "medium", ["경배", "찬양"], ["예수 우리 왕이여 SHAKE", "Raise A Hallelujah 한국어"]),
    ("주가 일하시네", "SHAKE", "G", "medium", ["신뢰", "은혜"], ["주가 일하시네 찬양", "God is working 한국어"]),

    # 마커스워십 (추가곡)
    ("나 무엇과도", "마커스워십", "A", "slow", ["헌신", "경배"], ["나 무엇과도 마커스", "나 무엇과도 바꿀 수 없네"]),
    ("주의 음성을 듣고", "마커스워십", "D", "slow", ["기도", "순종"], ["주의 음성을 듣고 마커스", "주의 음성을 듣고"]),
    ("예수 그 이름", "마커스워십", "G", "medium", ["찬양", "예수"], ["예수 그 이름 마커스", "예수 그 이름 찬양"]),
    ("나의 가장 깊은 곳", "마커스워십", "D", "slow", ["기도", "친밀"], ["나의 가장 깊은 곳 마커스", "나의 가장 깊은 곳에서"]),
    ("다시 나의 처음 그 자리", "마커스워십", "G", "slow", ["회개", "헌신"], ["다시 나의 처음 그 자리", "처음 사랑 마커스"]),

    # 어노인팅 (추가곡)
    ("예배의 회복", "어노인팅", "A", "medium", ["예배", "회복"], ["예배의 회복 어노인팅", "예배 회복 찬양"]),
    ("주 사랑해요", "어노인팅", "G", "medium", ["사랑", "고백"], ["주 사랑해요 어노인팅", "주 사랑합니다"]),
    ("주의 이름 찬양", "어노인팅", "D", "fast", ["찬양", "선포"], ["주의 이름 찬양 어노인팅", "주의 이름 찬양"]),

    # 제이어스 (추가곡)
    ("주님은 우리의 치료자", "제이어스 (J-US)", "E", "medium", ["치유", "신뢰"], ["주님은 우리의 치료자 제이어스", "치료자 제이어스"]),
    ("일어나라 빛을 발하라", "제이어스 (J-US)", "D", "fast", ["부흥", "선포"], ["일어나라 빛을 발하라", "Arise shine 한국어"]),
    ("주님과 같이", "제이어스 (J-US)", "G", "medium", ["동행", "신뢰"], ["주님과 같이 제이어스", "주님과 같이 찬양"]),

    # 원지 (인기 워십리더)
    ("주님 한 분 만으로", "원지", "G", "slow", ["헌신", "만족"], ["주님 한 분 만으로 원지", "주님 한분만으로"]),
    ("오직 주만", "원지", "A", "medium", ["헌신", "경배"], ["오직 주만 원지", "오직 주만 찬양"]),

    # 뉴젠
    ("다 와서 찬양해", "뉴젠", "D", "fast", ["찬양", "기쁨"], ["다 와서 찬양해", "O Come Let Us Adore Him 한국어"]),
    ("성령이여 오소서", "뉴젠", "E", "medium", ["성령", "기도"], ["성령이여 오소서", "Holy Spirit 한국어"]),

    # 히즈윌 (His Will)
    ("아버지의 마음", "히즈윌", "G", "slow", ["사랑", "위로"], ["아버지의 마음 히즈윌", "아버지의 마음 찬양"]),
    ("주의 사랑이 나를", "히즈윌", "D", "medium", ["사랑", "은혜"], ["주의 사랑이 나를 히즈윌", "주의 사랑이 나를"]),

    # 국제 워십 (한국어 버전) - 20-30대 인기곡
    ("선한 능력으로", "본회퍼", "D", "slow", ["신뢰", "평안"], ["선한 능력으로 찬양", "Von guten Mächten 한국어"]),
    ("만 가지 이유", "매트레드먼", "G", "medium", ["찬양", "감사"], ["만 가지 이유 찬양", "10000 Reasons 한국어"]),
    ("아름다운 이름", "힐송워십", "D", "medium", ["찬양", "예수"], ["아름다운 이름 힐송", "What A Beautiful Name 한국어"]),
    ("주님이 말씀하신 나", "힐송워십", "E", "medium", ["정체성", "자유"], ["주님이 말씀하신 나 힐송", "Who You Say I Am 한국어"]),
    ("무모한 사랑", "코리아슨", "C", "medium", ["사랑", "은혜"], ["무모한 사랑 찬양", "Reckless Love 한국어"]),
    ("길을 만드시는 분", "시네치", "E", "medium", ["기적", "신뢰"], ["길을 만드시는 분", "Way Maker 한국어"]),
    ("내 삶을 지으소서", "하우스파이어스", "D", "slow", ["헌신", "경배"], ["내 삶을 지으소서", "Build My Life 한국어"]),

    # 캠퍼스워십 (추가)
    ("주 이름 높이세", "캠퍼스워십", "D", "medium", ["찬양", "선포"], ["주 이름 높이세 캠퍼스", "주 이름 높이세 찬양"]),
    ("우리의 찬양이", "캠퍼스워십", "G", "medium", ["찬양", "예배"], ["우리의 찬양이 캠퍼스", "우리의 찬양이 찬양"]),

    # 예수전도단 (인기곡)
    ("주만 높이세", "예수전도단", "D", "medium", ["찬양", "경배"], ["주만 높이세 YWAM", "주만 높이세 찬양"]),
    ("날 사랑하심", "예수전도단", "G", "slow", ["사랑", "확신"], ["날 사랑하심 예수전도단", "날 사랑하심 찬양"]),

    # 인기 클래식 CCM
    ("사랑하는 나의 아버지", "주찬양", "G", "slow", ["사랑", "친밀"], ["사랑하는 나의 아버지 주찬양", "사랑하는 나의 아버지"]),
    ("내게 강 같은 평화", "찬송가", "F", "slow", ["평안", "믿음"], ["내게 강 같은 평화", "It is well 한국어"]),
    ("하늘 가는 밝은 길이", "찬송가", "G", "medium", ["소망", "천국"], ["하늘 가는 밝은 길이 찬송가", "하늘 가는 밝은 길이"]),

    # 추가 인기곡
    ("주의 음성을 내가 들으니", "찬송가", "D", "medium", ["순종", "부름"], ["주의 음성을 내가 들으니", "Here I am Lord 한국어"]),
    ("내 영혼아 여호와를 송축하라", "CCM", "G", "fast", ["찬양", "송축"], ["내 영혼아 여호와를 송축하라", "Bless the Lord 한국어"]),
    ("은혜 아니면", "CCM", "E", "slow", ["은혜", "겸손"], ["은혜 아니면 찬양", "은혜 아니면"]),
    ("나 주를 멀리 떠났을 때", "CCM", "D", "slow", ["회복", "사랑"], ["나 주를 멀리 떠났을 때", "I come to you 한국어"]),
    ("온 땅이여 주를 외쳐 찬양", "CCM", "D", "fast", ["찬양", "선포"], ["온 땅이여 주를 외쳐 찬양", "Shout to the Lord 한국어"]),

    # 추가 20-30대 인기곡
    ("주의 친절함", "마커스워십", "G", "slow", ["사랑", "은혜"], ["주의 친절함 마커스", "주의 친절함 찬양"]),
    ("주님 다시 나를 보시네", "어노인팅", "D", "slow", ["회복", "사랑"], ["주님 다시 나를 보시네", "어노인팅 주님 다시"]),
    ("나의 눈 주를 향해", "어노인팅", "E", "medium", ["기도", "집중"], ["나의 눈 주를 향해 어노인팅", "나의 눈 주를 향해"]),

    # 최신 인기 찬양
    ("그 사랑", "마커스워십", "D", "slow", ["사랑", "십자가"], ["그 사랑 마커스워십", "그 사랑 심종호"]),
    ("오직 예수 뿐이네", "마커스워십", "A", "medium", ["예수", "고백"], ["오직 예수 뿐이네 마커스", "오직 예수"]),
    ("주 여기 계시네", "제이어스 (J-US)", "G", "slow", ["임재", "친밀"], ["주 여기 계시네 제이어스", "주 여기 계시네 찬양"]),
    ("찬양하리 내 영혼", "CCM", "D", "fast", ["찬양", "기쁨"], ["찬양하리 내 영혼", "Praise My Soul"]),
]


def verify_youtube_link(search_queries: List[str]) -> Optional[dict]:
    """Search YouTube using yt-dlp and verify the link."""
    for query in search_queries:
        try:
            result = subprocess.run(
                [
                    'yt-dlp',
                    f'ytsearch5:{query}',
                    '--dump-json',
                    '--no-download',
                    '--quiet',
                    '--ignore-errors',
                    '--socket-timeout', '20'
                ],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                continue

            lines = result.stdout.strip().split('\n')
            for line in lines:
                if not line.strip():
                    continue
                try:
                    video = json.loads(line)
                    if video.get('_type') == 'video' or 'id' in video:
                        video_id = video.get('id')
                        title = video.get('title', '')
                        channel = video.get('channel', video.get('uploader', ''))
                        duration = video.get('duration', 0)

                        # Skip very short (<1min) or very long (>15min) videos
                        if duration and (duration < 60 or duration > 900):
                            continue

                        # Skip if it looks like a playlist or compilation
                        if any(x in title.lower() for x in ['playlist', '모음', '1시간', '2시간', '연속듣기']):
                            continue

                        return {
                            'url': f'https://www.youtube.com/watch?v={video_id}',
                            'title': title,
                            'channel': channel,
                            'duration': duration
                        }
                except json.JSONDecodeError:
                    continue

        except subprocess.TimeoutExpired:
            print(f"    Timeout for: {query}")
            continue
        except Exception as e:
            print(f"    Error: {e}")
            continue

        time.sleep(0.5)

    return None


def load_existing_songs():
    """Load existing songs from seed file."""
    with open('data/songs_seed.json', 'r') as f:
        data = json.load(f)
    return data


def get_next_id(songs):
    """Get the next available song ID."""
    max_id = max(song['id'] for song in songs)
    return max_id + 1


def song_exists(songs, title, artist):
    """Check if a song already exists."""
    title_clean = title.replace(' ', '').lower()
    for song in songs:
        existing_clean = song['title'].replace(' ', '').lower()
        if existing_clean == title_clean:
            return True
        # Partial match for similar titles
        if len(title_clean) > 5:
            if title_clean in existing_clean or existing_clean in title_clean:
                return True
    return False


def main():
    print("=" * 60)
    print("Adding Trending Worship Songs (20s-30s demographic)")
    print("=" * 60)

    # Load existing data
    data = load_existing_songs()
    songs = data['songs']
    next_id = get_next_id(songs)

    print(f"\nExisting songs: {len(songs)}")
    print(f"Songs to check: {len(NEW_SONGS)}")
    print(f"Starting ID: {next_id}\n")

    added = []
    skipped_exists = []
    skipped_no_link = []

    for i, (title, artist, key, tempo, themes, search_queries) in enumerate(NEW_SONGS, 1):
        print(f"[{i}/{len(NEW_SONGS)}] {title} - {artist}")

        # Check if exists
        if song_exists(songs, title, artist):
            print(f"  → Already exists, skipping")
            skipped_exists.append((title, artist))
            continue

        # Search for YouTube link
        print(f"  Searching...")
        result = verify_youtube_link(search_queries)

        if result:
            print(f"  ✓ Found: {result['title'][:50]}")
            print(f"    Channel: {result['channel']}")

            # Create new song entry
            new_song = {
                "id": next_id,
                "title": title,
                "artist": artist,
                "key": key,
                "tempo": tempo,
                "themes": themes,
                "youtube_url": result['url'],
                "lyrics_url": "",
                "chord_chart_url": ""
            }

            songs.append(new_song)
            added.append((title, artist, result['url']))
            next_id += 1

            # Save after each addition
            data['songs'] = songs
            with open('data/songs_seed.json', 'w') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            print(f"  ✗ No suitable video found")
            skipped_no_link.append((title, artist))

        time.sleep(1)  # Rate limit
        sys.stdout.flush()

    print("\n" + "=" * 60)
    print("Results")
    print("=" * 60)
    print(f"✓ Added: {len(added)}")
    print(f"→ Already existed: {len(skipped_exists)}")
    print(f"✗ No link found: {len(skipped_no_link)}")
    print(f"\nTotal songs now: {len(songs)}")

    if added:
        print("\nNewly added songs:")
        for title, artist, url in added:
            print(f"  + {title} - {artist}")

    if skipped_no_link:
        print("\nSongs without links (manual search needed):")
        for title, artist in skipped_no_link:
            print(f"  - {title} ({artist})")


if __name__ == '__main__':
    main()
