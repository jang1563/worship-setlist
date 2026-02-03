"""
YouTube Playlist Service

MVP 구현: watch_videos URL 형식으로 플레이리스트 URL 생성
(OAuth 없이 간단한 URL 생성 방식)

추후 확장: YouTube Data API v3 + OAuth2로 실제 플레이리스트 생성 가능
"""

import re
from typing import Optional
from urllib.parse import urlencode


def extract_video_id(youtube_url: str) -> Optional[str]:
    """
    YouTube URL에서 비디오 ID를 추출합니다.

    지원하는 URL 형식:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://youtube.com/watch?v=VIDEO_ID&feature=...
    """
    if not youtube_url:
        return None

    # youtube.com/watch?v= 형식
    match = re.search(r'[?&]v=([a-zA-Z0-9_-]{11})', youtube_url)
    if match:
        return match.group(1)

    # youtu.be/ 형식
    match = re.search(r'youtu\.be/([a-zA-Z0-9_-]{11})', youtube_url)
    if match:
        return match.group(1)

    # youtube.com/embed/ 형식
    match = re.search(r'youtube\.com/embed/([a-zA-Z0-9_-]{11})', youtube_url)
    if match:
        return match.group(1)

    return None


def generate_playlist_url(video_ids: list[str]) -> Optional[str]:
    """
    YouTube 비디오 ID 리스트로 플레이리스트 URL을 생성합니다.

    watch_videos URL 형식 사용:
    https://www.youtube.com/watch_videos?video_ids=id1,id2,id3

    이 형식은 OAuth 없이도 여러 영상을 연속 재생할 수 있습니다.
    """
    if not video_ids:
        return None

    # 유효한 비디오 ID만 필터링 (11자리 영숫자+_-)
    valid_ids = [
        vid for vid in video_ids
        if vid and re.match(r'^[a-zA-Z0-9_-]{11}$', vid)
    ]

    if not valid_ids:
        return None

    # watch_videos URL 생성
    video_ids_str = ','.join(valid_ids)
    return f"https://www.youtube.com/watch_videos?video_ids={video_ids_str}"


def generate_playlist_embed_url(video_ids: list[str]) -> Optional[str]:
    """
    임베드용 플레이리스트 URL을 생성합니다.

    플레이리스트 형식:
    https://www.youtube.com/embed/FIRST_VIDEO_ID?playlist=id2,id3,id4
    """
    if not video_ids:
        return None

    valid_ids = [
        vid for vid in video_ids
        if vid and re.match(r'^[a-zA-Z0-9_-]{11}$', vid)
    ]

    if not valid_ids:
        return None

    first_id = valid_ids[0]

    if len(valid_ids) == 1:
        return f"https://www.youtube.com/embed/{first_id}"

    # 나머지 비디오 ID로 playlist 파라미터 생성
    remaining_ids = ','.join(valid_ids[1:])
    return f"https://www.youtube.com/embed/{first_id}?playlist={remaining_ids}"


class YouTubePlaylistService:
    """YouTube 플레이리스트 서비스"""

    def generate_from_youtube_urls(self, youtube_urls: list[str]) -> dict:
        """
        YouTube URL 리스트에서 플레이리스트 URL을 생성합니다.

        Args:
            youtube_urls: YouTube URL 리스트

        Returns:
            {
                "playlist_url": str | None,
                "embed_url": str | None,
                "video_ids": list[str],
                "total_count": int,
                "valid_count": int,
                "missing_urls": list[int]  # URL이 없거나 유효하지 않은 인덱스
            }
        """
        video_ids: list[str] = []
        missing_urls: list[int] = []

        for i, url in enumerate(youtube_urls):
            video_id = extract_video_id(url) if url else None
            if video_id:
                video_ids.append(video_id)
            else:
                missing_urls.append(i)

        playlist_url = generate_playlist_url(video_ids)
        embed_url = generate_playlist_embed_url(video_ids)

        return {
            "playlist_url": playlist_url,
            "embed_url": embed_url,
            "video_ids": video_ids,
            "total_count": len(youtube_urls),
            "valid_count": len(video_ids),
            "missing_urls": missing_urls
        }


# 싱글톤 인스턴스
youtube_playlist_service = YouTubePlaylistService()
