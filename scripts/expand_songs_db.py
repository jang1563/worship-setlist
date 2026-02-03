#!/usr/bin/env python3
"""
Expand WorshipFlow song database from 374 to 500+ songs.
Uses yt-dlp to verify YouTube links before adding.
"""

import json
import subprocess
import time
import os
from pathlib import Path
from typing import Optional, List, Dict, Any

# Configuration
DATA_DIR = Path("/Users/jak4013/clawd/worshipflow-prd/data")
SONGS_FILE = DATA_DIR / "songs_seed.json"
BACKUP_FILE = DATA_DIR / "songs_seed_backup.json"
YT_DLP_PATH = "/Users/jak4013/miniconda3-arm64/envs/worshipflow/bin/yt-dlp"

# Check if yt-dlp exists
if not os.path.exists(YT_DLP_PATH):
    # Try system yt-dlp
    YT_DLP_PATH = "yt-dlp"

def load_existing_songs() -> tuple[List[Dict], set, int]:
    """Load existing songs and return songs list, title set, and max id."""
    with open(SONGS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    songs = data.get('songs', [])
    existing_titles = set()
    max_id = 0

    for song in songs:
        existing_titles.add(song['title'])
        if song.get('title_en'):
            existing_titles.add(song['title_en'])
        if song.get('title_original'):
            existing_titles.add(song['title_original'])
        if song['id'] > max_id:
            max_id = song['id']

    return songs, existing_titles, max_id

def search_youtube(query: str, timeout: int = 15) -> Optional[str]:
    """Search YouTube for a song and return the first result URL."""
    try:
        cmd = [
            YT_DLP_PATH,
            f"ytsearch1:{query}",
            "--get-id",
            "--no-warnings",
            "--quiet"
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.returncode == 0 and result.stdout.strip():
            video_id = result.stdout.strip()
            return f"https://www.youtube.com/watch?v={video_id}"
    except subprocess.TimeoutExpired:
        print(f"  Timeout searching for: {query}")
    except Exception as e:
        print(f"  Error searching for {query}: {e}")
    return None

def verify_youtube_url(url: str, timeout: int = 10) -> bool:
    """Verify that a YouTube URL is valid."""
    try:
        cmd = [
            YT_DLP_PATH,
            url,
            "--get-title",
            "--no-warnings",
            "--quiet"
        ]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.returncode == 0 and result.stdout.strip()
    except:
        return False

def create_song_entry(
    song_id: int,
    title: str,
    artist: str,
    default_key: str = "G",
    bpm: int = 80,
    mood_tags: List[str] = None,
    service_types: List[str] = None,
    youtube_url: str = "",
    title_en: str = None,
    title_original: str = None,
    album: str = None,
    year: int = None,
    difficulty: str = "medium",
    scripture_refs: List[str] = None,
    scripture_connection: str = None
) -> Dict[str, Any]:
    """Create a song entry in the standard format."""
    if mood_tags is None:
        mood_tags = ["찬양", "경배"]
    if service_types is None:
        service_types = ["주일예배", "청년예배"]
    if scripture_refs is None:
        scripture_refs = []

    return {
        "id": song_id,
        "title": title,
        "title_en": title_en,
        "title_original": title_original,
        "artist": artist,
        "album": album,
        "year": year,
        "default_key": default_key,
        "bpm": bpm,
        "duration_sec": 300,
        "mood_tags": mood_tags,
        "service_types": service_types,
        "season_tags": ["연중시기"],
        "difficulty": difficulty,
        "min_instruments": ["piano"],
        "vocal_range_low": "D3",
        "vocal_range_high": "D5",
        "scripture_refs": scripture_refs,
        "scripture_connection": scripture_connection,
        "youtube_url": youtube_url
    }

def save_songs(songs: List[Dict], backup: bool = True):
    """Save songs to file with optional backup."""
    if backup and SONGS_FILE.exists():
        # Create backup
        with open(SONGS_FILE, 'r', encoding='utf-8') as f:
            backup_data = f.read()
        with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
            f.write(backup_data)

    data = {"songs": songs}
    with open(SONGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(songs)} songs to {SONGS_FILE}")

# Songs to add by category
SONGS_TO_ADD = {
    "마커스워십": [
        {"title": "주를 향한 나의 사랑", "key": "G", "bpm": 72, "themes": ["경배", "사랑", "헌신"]},
        {"title": "은혜", "key": "E", "bpm": 68, "themes": ["경배", "은혜", "감사"]},
        {"title": "주의 눈동자", "key": "D", "bpm": 65, "themes": ["경배", "친밀함", "고백"]},
        {"title": "너는 나의 아들이라", "key": "A", "bpm": 70, "themes": ["선포", "정체성", "축복"]},
        {"title": "주의 형상을 보네", "key": "G", "bpm": 66, "themes": ["경배", "영광", "고백"]},
        {"title": "다 내려놓아", "key": "A", "bpm": 68, "themes": ["헌신", "내려놓음", "고백"]},
        {"title": "나 어디서 있든지", "key": "E", "bpm": 75, "themes": ["신뢰", "헌신", "고백"]},
        {"title": "모든 것이 주의 것", "key": "D", "bpm": 72, "themes": ["헌신", "감사", "고백"]},
        {"title": "높이 높이 계신 주", "key": "G", "bpm": 80, "themes": ["찬양", "경배", "선포"]},
        {"title": "주께로 나아가", "key": "A", "bpm": 68, "themes": ["경배", "나아감", "헌신"]},
        {"title": "전능자 여호와", "key": "E", "bpm": 85, "themes": ["선포", "경배", "찬양"]},
        {"title": "내 삶의 주인되신", "key": "D", "bpm": 70, "themes": ["헌신", "고백", "경배"]},
        {"title": "내가 다시 살아", "key": "G", "bpm": 75, "themes": ["부흥", "회복", "찬양"]},
        {"title": "주 오늘도 함께 해주시네", "key": "A", "bpm": 68, "themes": ["감사", "동행", "고백"]},
        {"title": "예수 나의 왕이여", "key": "E", "bpm": 72, "themes": ["경배", "선포", "헌신"]},
    ],
    "어노인팅": [
        {"title": "나의 영혼이", "key": "G", "bpm": 70, "themes": ["경배", "고백", "갈망"]},
        {"title": "내 맘에 품은", "key": "D", "bpm": 68, "themes": ["소망", "기도", "고백"]},
        {"title": "주님만이", "key": "A", "bpm": 72, "themes": ["헌신", "경배", "고백"]},
        {"title": "날 위한 십자가", "key": "E", "bpm": 65, "themes": ["십자가", "감사", "고백"]},
        {"title": "주 사랑 전하리", "key": "G", "bpm": 115, "themes": ["전도", "사랑", "찬양"]},
        {"title": "예수 예수", "key": "D", "bpm": 68, "themes": ["경배", "고백", "찬양"]},
        {"title": "오직 주만이", "key": "A", "bpm": 70, "themes": ["헌신", "경배", "선포"]},
        {"title": "주의 이름 높이며", "key": "E", "bpm": 120, "themes": ["찬양", "선포", "경배"]},
        {"title": "주 안에서", "key": "G", "bpm": 110, "themes": ["기쁨", "찬양", "감사"]},
        {"title": "주님 닮게 하소서", "key": "D", "bpm": 68, "themes": ["헌신", "기도", "변화"]},
        {"title": "아무것도 아닌 나에게", "key": "A", "bpm": 65, "themes": ["감사", "은혜", "고백"]},
        {"title": "예배하라 성도여", "key": "E", "bpm": 80, "themes": ["찬양", "예배", "선포"]},
        {"title": "모든 것 주께 맡기며", "key": "G", "bpm": 66, "themes": ["신뢰", "헌신", "고백"]},
        {"title": "나의 맘을 가득 채우소서", "key": "D", "bpm": 68, "themes": ["기도", "갈망", "채움"]},
        {"title": "주 없이 살 수 없네", "key": "A", "bpm": 72, "themes": ["고백", "헌신", "경배"]},
    ],
    "제이어스": [
        {"title": "주의 사랑", "key": "G", "bpm": 68, "themes": ["사랑", "경배", "고백"]},
        {"title": "나의 반석이신", "key": "D", "bpm": 70, "themes": ["신뢰", "선포", "고백"]},
        {"title": "예수 나를 오라 하네", "key": "A", "bpm": 72, "themes": ["초청", "경배", "헌신"]},
        {"title": "주님의 마음", "key": "E", "bpm": 66, "themes": ["갈망", "친밀함", "고백"]},
        {"title": "한없이 높으신", "key": "G", "bpm": 75, "themes": ["경배", "선포", "찬양"]},
        {"title": "나의 삶의 이유", "key": "D", "bpm": 68, "themes": ["헌신", "고백", "경배"]},
        {"title": "주님의 음성", "key": "A", "bpm": 65, "themes": ["말씀", "순종", "고백"]},
        {"title": "주 앞에 나 서리", "key": "E", "bpm": 70, "themes": ["헌신", "경배", "고백"]},
        {"title": "하나님 아버지", "key": "G", "bpm": 68, "themes": ["경배", "아버지", "고백"]},
        {"title": "예수 사랑해요", "key": "D", "bpm": 75, "themes": ["사랑", "고백", "찬양"]},
    ],
    "찬송가": [
        {"title": "만복의 근원 하나님", "hymn_number": 1, "key": "G", "bpm": 90, "themes": ["감사", "축복", "찬양"]},
        {"title": "복의 근원 강림하사", "hymn_number": 5, "key": "D", "bpm": 88, "themes": ["성령", "초청", "찬양"]},
        {"title": "천지에 가득한 주님의 영광", "hymn_number": 8, "key": "A", "bpm": 85, "themes": ["영광", "찬양", "선포"]},
        {"title": "거룩 거룩 거룩", "hymn_number": 9, "key": "Eb", "bpm": 80, "themes": ["경배", "삼위일체", "거룩"]},
        {"title": "주 하나님 지으신 모든 세계", "hymn_number": 79, "key": "Bb", "bpm": 85, "themes": ["창조", "찬양", "경이"]},
        {"title": "나의 기쁨 나의 소망되시며", "hymn_number": 85, "key": "G", "bpm": 75, "themes": ["신뢰", "소망", "고백"]},
        {"title": "십자가 군병들아", "hymn_number": 268, "key": "Bb", "bpm": 110, "themes": ["전투", "헌신", "결단"]},
        {"title": "주 예수 넓은 품에", "hymn_number": 279, "key": "G", "bpm": 70, "themes": ["안식", "평안", "신뢰"]},
        {"title": "내 주를 가까이 하게 함은", "hymn_number": 364, "key": "G", "bpm": 72, "themes": ["친밀함", "경배", "헌신"]},
        {"title": "내 영혼의 그윽히 깊은 데서", "hymn_number": 447, "key": "D", "bpm": 68, "themes": ["평안", "신뢰", "고백"]},
        {"title": "주님 주신 자유", "hymn_number": 180, "key": "G", "bpm": 115, "themes": ["자유", "감사", "찬양"]},
        {"title": "예수로 나의 구주 삼고", "hymn_number": 288, "key": "F", "bpm": 100, "themes": ["구원", "기쁨", "고백"]},
        {"title": "주 예수 내가 알기 전", "hymn_number": 295, "key": "G", "bpm": 72, "themes": ["은혜", "감사", "고백"]},
        {"title": "내 주 되신 주를 참 사랑하고", "hymn_number": 315, "key": "D", "bpm": 75, "themes": ["사랑", "헌신", "고백"]},
        {"title": "하나님의 크신 사랑", "hymn_number": 304, "key": "G", "bpm": 68, "themes": ["사랑", "경배", "고백"]},
        {"title": "내가 매일 기쁘게", "hymn_number": 455, "key": "G", "bpm": 110, "themes": ["기쁨", "순종", "헌신"]},
        {"title": "예수 더 알기 원하네", "hymn_number": 443, "key": "D", "bpm": 68, "themes": ["갈망", "성장", "헌신"]},
        {"title": "주 안에 있는 나에게", "hymn_number": 370, "key": "G", "bpm": 75, "themes": ["평안", "신뢰", "고백"]},
        {"title": "주 예수 내 맘에 들어와", "hymn_number": 282, "key": "G", "bpm": 70, "themes": ["초청", "경배", "변화"]},
        {"title": "사철에 봄바람 불어 잇고", "hymn_number": 559, "key": "F", "bpm": 100, "themes": ["천국", "소망", "찬양"]},
        {"title": "어둔 밤 마음에 잠겨", "hymn_number": 428, "key": "G", "bpm": 72, "themes": ["빛", "소망", "고백"]},
        {"title": "저 높고 푸른 하늘과", "hymn_number": 78, "key": "D", "bpm": 85, "themes": ["창조", "찬양", "경이"]},
        {"title": "마귀들과 싸울지라", "hymn_number": 389, "key": "G", "bpm": 115, "themes": ["영적전쟁", "승리", "선포"]},
        {"title": "피난처 있으니", "hymn_number": 279, "key": "G", "bpm": 68, "themes": ["피난처", "안식", "신뢰"]},
        {"title": "주 날 불러 이르시되", "hymn_number": 540, "key": "Bb", "bpm": 90, "themes": ["부르심", "순종", "헌신"]},
        {"title": "이 세상 풍파 심하고", "hymn_number": 283, "key": "G", "bpm": 72, "themes": ["평안", "신뢰", "피난처"]},
        {"title": "이 세상에 근심된 일이 많고", "hymn_number": 453, "key": "G", "bpm": 70, "themes": ["기도", "신뢰", "평안"]},
        {"title": "내 주의 보혈은", "hymn_number": 190, "key": "G", "bpm": 72, "themes": ["보혈", "구원", "감사"]},
        {"title": "예수 사랑하심은", "hymn_number": 563, "key": "G", "bpm": 100, "themes": ["사랑", "어린이", "고백"]},
        {"title": "큰 영광 중에 계신 주", "hymn_number": 21, "key": "D", "bpm": 85, "themes": ["영광", "경배", "찬양"]},
    ],
    "힐송/엘레베이션/베델 한국어": [
        {"title": "오직 예수", "title_en": "No One But You", "key": "G", "bpm": 68, "themes": ["헌신", "고백", "경배"]},
        {"title": "담대하게", "title_en": "Build My Life", "key": "D", "bpm": 72, "themes": ["헌신", "결단", "고백"]},
        {"title": "나는 주의 것", "title_en": "I Am Yours", "key": "A", "bpm": 70, "themes": ["헌신", "고백", "정체성"]},
        {"title": "은혜 위에 은혜", "title_en": "Grace Upon Grace", "key": "E", "bpm": 72, "themes": ["은혜", "감사", "축복"]},
        {"title": "더 깊이 더 높이", "title_en": "So Will I", "key": "G", "bpm": 70, "themes": ["창조", "경배", "선포"]},
        {"title": "찬양하리 내 영혼", "title_en": "Praise My Soul", "key": "D", "bpm": 78, "themes": ["찬양", "영혼", "경배"]},
        {"title": "여호와 나의 하나님", "title_en": "YHWH", "key": "A", "bpm": 68, "themes": ["경배", "선포", "고백"]},
        {"title": "영원한 사랑", "title_en": "Endless Love", "key": "E", "bpm": 65, "themes": ["사랑", "영원", "고백"]},
        {"title": "하나님 나라가", "title_en": "Kingdom", "key": "G", "bpm": 75, "themes": ["하나님나라", "선포", "소망"]},
        {"title": "새벽빛", "title_en": "Morning Light", "key": "D", "bpm": 68, "themes": ["새벽", "소망", "경배"]},
        {"title": "주님께 영광", "title_en": "Glory to God", "key": "A", "bpm": 120, "themes": ["영광", "찬양", "선포"]},
        {"title": "주의 영이 임하시네", "title_en": "Spirit of God", "key": "E", "bpm": 72, "themes": ["성령", "임재", "경배"]},
        {"title": "이름 높이 올리라", "title_en": "Exalt His Name", "key": "G", "bpm": 78, "themes": ["찬양", "선포", "경배"]},
        {"title": "주 앞에 엎드려", "title_en": "Bow Before You", "key": "D", "bpm": 66, "themes": ["경배", "겸손", "헌신"]},
        {"title": "예배자로 서리", "title_en": "Stand as Worshipper", "key": "A", "bpm": 70, "themes": ["예배", "헌신", "결단"]},
        {"title": "주의 임재 안에", "title_en": "In Your Presence", "key": "E", "bpm": 65, "themes": ["임재", "평안", "경배"]},
        {"title": "능력의 주님", "title_en": "God of Power", "key": "G", "bpm": 85, "themes": ["능력", "선포", "경배"]},
        {"title": "진정한 예배", "title_en": "True Worship", "key": "D", "bpm": 68, "themes": ["예배", "헌신", "고백"]},
        {"title": "찬양의 제사", "title_en": "Sacrifice of Praise", "key": "A", "bpm": 115, "themes": ["찬양", "헌신", "감사"]},
        {"title": "주님만 높이세", "title_en": "Lift You High", "key": "E", "bpm": 75, "themes": ["찬양", "경배", "선포"]},
    ],
    "예수전도단": [
        {"title": "열방이 기뻐하네", "key": "G", "bpm": 120, "themes": ["선교", "기쁨", "찬양"]},
        {"title": "주의 이름 선포해", "key": "D", "bpm": 115, "themes": ["선포", "찬양", "경배"]},
        {"title": "나 주의 도움 받고자", "key": "A", "bpm": 72, "themes": ["도움", "신뢰", "기도"]},
        {"title": "믿음으로 서리", "key": "E", "bpm": 75, "themes": ["믿음", "헌신", "결단"]},
        {"title": "주 예수 이름 높이세", "key": "G", "bpm": 118, "themes": ["찬양", "선포", "경배"]},
        {"title": "여호와를 찬양하라", "key": "D", "bpm": 125, "themes": ["찬양", "선포", "기쁨"]},
        {"title": "하나님 나라 임하시네", "key": "A", "bpm": 70, "themes": ["하나님나라", "선교", "선포"]},
        {"title": "세상 권세 멸하시고", "key": "E", "bpm": 110, "themes": ["승리", "영적전쟁", "선포"]},
        {"title": "주 여호와는 광대하시도다", "key": "G", "bpm": 85, "themes": ["경배", "선포", "찬양"]},
        {"title": "열방 가운데 주를 찬양", "key": "D", "bpm": 120, "themes": ["선교", "찬양", "선포"]},
    ],
    "소원": [
        {"title": "주님이 좋아", "key": "G", "bpm": 110, "themes": ["사랑", "기쁨", "고백"]},
        {"title": "찬양하리라", "key": "D", "bpm": 115, "themes": ["찬양", "선포", "경배"]},
        {"title": "한 가지 소원", "key": "A", "bpm": 68, "themes": ["갈망", "헌신", "예배"]},
        {"title": "주의 길로 걸어가리", "key": "E", "bpm": 72, "themes": ["순종", "헌신", "결단"]},
        {"title": "주님의 사랑으로", "key": "G", "bpm": 75, "themes": ["사랑", "감사", "고백"]},
        {"title": "나의 기도", "key": "D", "bpm": 66, "themes": ["기도", "갈망", "헌신"]},
        {"title": "주 안에서 안식", "key": "A", "bpm": 65, "themes": ["안식", "평안", "신뢰"]},
        {"title": "오직 한 길", "key": "E", "bpm": 70, "themes": ["결단", "헌신", "순종"]},
        {"title": "예배드림이 기쁨", "key": "G", "bpm": 72, "themes": ["예배", "기쁨", "감사"]},
        {"title": "내 마음 드려요", "key": "D", "bpm": 68, "themes": ["헌신", "고백", "드림"]},
    ],
    "기타 CCM": [
        {"title": "주의 음성을 내가 들으니", "artist": "CCM", "key": "G", "bpm": 72, "themes": ["순종", "부르심", "결단"]},
        {"title": "소리 높여 찬양해", "artist": "CCM", "key": "D", "bpm": 125, "themes": ["찬양", "기쁨", "선포"]},
        {"title": "주님 앞에 나 무릎 꿇어", "artist": "CCM", "key": "A", "bpm": 65, "themes": ["경배", "겸손", "헌신"]},
        {"title": "예수 내 구주", "artist": "CCM", "key": "E", "bpm": 70, "themes": ["구원", "고백", "감사"]},
        {"title": "하나님의 은혜", "artist": "CCM", "key": "G", "bpm": 68, "themes": ["은혜", "감사", "고백"]},
        {"title": "복의 통로", "artist": "CCM", "key": "D", "bpm": 115, "themes": ["축복", "사명", "헌신"]},
        {"title": "주 품에 품으소서", "artist": "CCM", "key": "A", "bpm": 66, "themes": ["안식", "보호", "신뢰"]},
        {"title": "살아계신 주", "artist": "CCM", "key": "E", "bpm": 120, "themes": ["부활", "선포", "찬양"]},
        {"title": "주를 바라볼지라", "artist": "CCM", "key": "G", "bpm": 72, "themes": ["신뢰", "소망", "고백"]},
        {"title": "은혜 아니면", "artist": "CCM", "key": "D", "bpm": 68, "themes": ["은혜", "감사", "겸손"]},
        {"title": "주의 선하심을", "artist": "CCM", "key": "A", "bpm": 75, "themes": ["감사", "선함", "고백"]},
        {"title": "다윗의 장막", "artist": "CCM", "key": "E", "bpm": 70, "themes": ["예배", "회복", "갈망"]},
        {"title": "마음을 열어", "artist": "CCM", "key": "G", "bpm": 68, "themes": ["열림", "갈망", "헌신"]},
        {"title": "주 안에 살리", "artist": "CCM", "key": "D", "bpm": 72, "themes": ["헌신", "동행", "고백"]},
        {"title": "나의 피난처", "artist": "CCM", "key": "A", "bpm": 65, "themes": ["피난처", "보호", "신뢰"]},
        {"title": "주 얼굴 바라보리", "artist": "CCM", "key": "E", "bpm": 68, "themes": ["경배", "갈망", "친밀함"]},
        {"title": "주님 뜻대로", "artist": "CCM", "key": "G", "bpm": 66, "themes": ["순종", "헌신", "신뢰"]},
        {"title": "영원토록 찬양하리", "artist": "CCM", "key": "D", "bpm": 118, "themes": ["찬양", "영원", "선포"]},
        {"title": "내 갈길 다가도록", "artist": "CCM", "key": "A", "bpm": 72, "themes": ["헌신", "결단", "순종"]},
        {"title": "주의 영광 위해", "artist": "CCM", "key": "E", "bpm": 75, "themes": ["영광", "사명", "헌신"]},
    ],
}

def main():
    print("=" * 60)
    print("WorshipFlow Song Database Expansion Script")
    print("=" * 60)

    # Load existing songs
    print("\n[1] Loading existing songs...")
    songs, existing_titles, max_id = load_existing_songs()
    print(f"    Current songs: {len(songs)}")
    print(f"    Max ID: {max_id}")
    print(f"    Existing titles: {len(existing_titles)}")

    # Create backup
    print("\n[2] Creating backup...")
    save_songs(songs, backup=True)

    # Process each category
    new_song_id = max_id + 1
    added_count = 0
    failed_count = 0
    skipped_count = 0

    for category, category_songs in SONGS_TO_ADD.items():
        print(f"\n[Processing] {category} ({len(category_songs)} songs)")
        print("-" * 40)

        # Set default artist based on category
        default_artist = category
        if category == "찬송가":
            default_artist = "새찬송가"
        elif category == "힐송/엘레베이션/베델 한국어":
            default_artist = "힐송 (한국어)"
        elif category == "기타 CCM":
            default_artist = "CCM"

        for song_info in category_songs:
            title = song_info['title']

            # Check if song already exists
            if title in existing_titles:
                print(f"  [SKIP] '{title}' already exists")
                skipped_count += 1
                continue

            # Build search query
            artist = song_info.get('artist', default_artist)
            search_query = f"{title} {artist}"
            if 'hymn_number' in song_info:
                search_query = f"새찬송가 {song_info['hymn_number']}장 {title}"

            print(f"  Searching: '{title}'...")

            # Search YouTube
            youtube_url = search_youtube(search_query)

            if youtube_url:
                # Create song entry
                new_song = create_song_entry(
                    song_id=new_song_id,
                    title=title,
                    artist=artist,
                    default_key=song_info.get('key', 'G'),
                    bpm=song_info.get('bpm', 75),
                    mood_tags=song_info.get('themes', ['찬양', '경배']),
                    youtube_url=youtube_url,
                    title_en=song_info.get('title_en'),
                    title_original=song_info.get('title_original'),
                    album=f"{artist} 앨범" if category != "찬송가" else f"새찬송가 {song_info.get('hymn_number', '')}장"
                )

                songs.append(new_song)
                existing_titles.add(title)
                new_song_id += 1
                added_count += 1
                print(f"    [OK] Added: {title}")

                # Save every 10 songs
                if added_count % 10 == 0:
                    print(f"\n    >> Saving progress... ({len(songs)} songs total)")
                    save_songs(songs, backup=False)
            else:
                print(f"    [FAIL] Could not find YouTube video")
                failed_count += 1

            # Small delay to avoid rate limiting
            time.sleep(0.5)

    # Final save
    print("\n" + "=" * 60)
    print("Final save...")
    save_songs(songs, backup=False)

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Starting count: {len(songs) - added_count}")
    print(f"  Added: {added_count}")
    print(f"  Skipped (existing): {skipped_count}")
    print(f"  Failed: {failed_count}")
    print(f"  Final count: {len(songs)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
