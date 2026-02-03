#!/usr/bin/env python3
"""
Script to verify and fix broken YouTube links in the song database.
Uses YouTube Data API v3 to search for correct videos.

Improved version with Korean search prioritization.
"""
import json
import time
import subprocess
import httpx
import os
import sys
from pathlib import Path

# Configuration
YOUTUBE_API_KEY = os.environ.get('YOUTUBE_API_KEY', '')
if not YOUTUBE_API_KEY:
    print("Warning: YOUTUBE_API_KEY not set. Set it in .env or environment.")
API_BASE = 'http://localhost:8000/api'

# Trusted Korean worship channels
TRUSTED_CHANNELS = [
    'MARKERS WORSHIP', '마커스워십', 'markers',
    'ANOINTING', '어노인팅',
    'J-US Ministry', 'J-US', '제이어스',
    'Beecompany 비컴퍼니', 'Beecompany', '비컴퍼니',
    '캠퍼스워십', 'YWAM',
    '새벽날개', '예수전도단',
    '옹기장이', '소리엘',
    '어바인온누리', '할렐루야찬양대',
    '갓피플', '생명의삶',
]

def check_video_exists(video_id: str) -> bool:
    """Check if a YouTube video exists using oEmbed."""
    try:
        result = subprocess.run(
            ['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}',
             f'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json'],
            capture_output=True, text=True, timeout=10
        )
        return result.stdout.strip() == '200'
    except:
        return False

def is_trusted_channel(channel_name: str) -> bool:
    """Check if channel is a trusted Korean worship channel."""
    channel_lower = channel_name.lower()
    for trusted in TRUSTED_CHANNELS:
        if trusted.lower() in channel_lower:
            return True
    return False

def has_korean(text: str) -> bool:
    """Check if text contains Korean characters."""
    return any('\uac00' <= c <= '\ud7af' for c in text)

def search_youtube(query: str, prefer_korean: bool = True) -> list:
    """Search YouTube for a song using the Data API."""
    url = 'https://www.googleapis.com/youtube/v3/search'
    params = {
        'part': 'snippet',
        'q': query,
        'type': 'video',
        'maxResults': 10,  # Get more results to filter
        'key': YOUTUBE_API_KEY,
        'relevanceLanguage': 'ko',
        'regionCode': 'KR'
    }

    try:
        with httpx.Client() as client:
            response = client.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                results = []
                for item in data.get('items', []):
                    result = {
                        'video_id': item['id']['videoId'],
                        'title': item['snippet']['title'],
                        'channel': item['snippet']['channelTitle'],
                        'description': item['snippet'].get('description', '')
                    }

                    # Score the result
                    score = 0
                    if is_trusted_channel(result['channel']):
                        score += 100
                    if has_korean(result['title']):
                        score += 50
                    if has_korean(result['channel']):
                        score += 30
                    # Penalize if clearly English
                    if 'english' in result['title'].lower() or 'eng ver' in result['title'].lower():
                        score -= 50

                    result['score'] = score
                    results.append(result)

                # Sort by score
                results.sort(key=lambda x: x['score'], reverse=True)
                return results
            elif response.status_code == 403:
                print(f"  API Quota Exceeded!")
                return None  # Signal quota exceeded
            else:
                print(f"  API Error: {response.status_code}")
    except Exception as e:
        print(f"  Search error: {e}")
    return []

def get_all_songs():
    """Get all songs from the API."""
    with httpx.Client() as client:
        response = client.get(f'{API_BASE}/songs?per_page=400')
        return response.json()['songs']

def find_broken_links(songs: list) -> list:
    """Find all songs with broken YouTube links."""
    broken = []

    for i, song in enumerate(songs):
        url = song.get('youtube_url')
        if not url:
            continue

        video_id = url.split('v=')[-1].split('&')[0] if 'v=' in url else ''
        if not video_id:
            continue

        if not check_video_exists(video_id):
            broken.append({
                'id': song['id'],
                'title': song['title'],
                'artist': song['artist'],
                'old_url': url
            })

        # Progress
        if (i + 1) % 20 == 0:
            print(f"  Checked {i + 1}/{len(songs)} songs...")

        time.sleep(0.2)  # Rate limit

    return broken

def find_replacement_links(broken_songs: list, limit: int = None) -> tuple:
    """Search for replacement YouTube links for broken songs."""
    fixed = []
    failed = []
    skipped = []

    songs_to_fix = broken_songs[:limit] if limit else broken_songs

    for i, song in enumerate(songs_to_fix):
        print(f"\n[{i+1}/{len(songs_to_fix)}] Searching for: {song['title']} - {song['artist']}")

        # Build search queries - Korean-focused
        queries = [
            f"{song['title']} {song['artist']} 찬양",
            f"{song['title']} 마커스워십",
            f"{song['title']} 어노인팅",
            f"{song['title']} 찬양 MR",
        ]

        # For 찬송가, use specific queries
        if song['artist'] == '찬송가':
            queries = [
                f"새찬송가 {song['title']}",
                f"{song['title']} 찬송가 비컴퍼니",
                f"{song['title']} 새찬송가",
            ]

        found = False
        for query in queries:
            results = search_youtube(query)

            if results is None:  # Quota exceeded
                print("   API quota exceeded! Stopping.")
                # Save progress
                return fixed, failed, songs_to_fix[i:]

            if results:
                # Pick best result (highest score)
                best = results[0]

                # Validate the result
                if best['score'] < 30 and not has_korean(best['title']):
                    print(f"   Low confidence result, skipping: {best['title'][:40]}")
                    continue

                new_url = f"https://www.youtube.com/watch?v={best['video_id']}"
                print(f"   ✓ Found (score={best['score']}): {best['title'][:50]}")
                print(f"     Channel: {best['channel']}")

                fixed.append({
                    'id': song['id'],
                    'title': song['title'],
                    'new_url': new_url,
                    'youtube_title': best['title'],
                    'channel': best['channel'],
                    'score': best['score']
                })
                found = True
                break

            time.sleep(0.3)  # Rate limit between queries

        if not found:
            print(f"   ✗ NOT FOUND or low confidence")
            failed.append(song)

        time.sleep(0.5)  # Rate limit between songs

    return fixed, failed, []

def apply_fixes_to_db(fixed_links: list):
    """Apply fixed links directly to database using API or SQL."""
    # Generate SQL
    print("\nSQL statements to update database:")
    for fix in fixed_links:
        print(f"UPDATE songs SET youtube_url = '{fix['new_url']}' WHERE id = {fix['id']};")

def main():
    print("=" * 60)
    print("YouTube Link Verification & Fix Tool (v2 - Korean Priority)")
    print("=" * 60)

    mode = sys.argv[1] if len(sys.argv) > 1 else 'check'

    if mode == 'check':
        # Get all songs
        print("\n1. Fetching songs from database...")
        songs = get_all_songs()
        print(f"   Found {len(songs)} songs")

        # Find broken links
        print("\n2. Checking YouTube links...")
        broken = find_broken_links(songs)
        print(f"\n   Found {len(broken)} broken links")

        if broken:
            # Save broken links list
            with open('/tmp/broken_links.json', 'w') as f:
                json.dump(broken, f, ensure_ascii=False, indent=2)
            print(f"   Saved to /tmp/broken_links.json")

            print("\n   Sample broken links:")
            for b in broken[:10]:
                print(f"   - ID {b['id']:3}: {b['title'][:30]}")

    elif mode == 'fix':
        # Load broken links
        print("\n1. Loading broken links...")
        with open('/tmp/broken_links.json', 'r') as f:
            broken = json.load(f)
        print(f"   Found {len(broken)} broken links to fix")

        # Limit to avoid API quota issues
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        print(f"\n2. Searching for replacements (limit: {limit})...")

        fixed, failed, remaining = find_replacement_links(broken, limit=limit)

        # Save results
        with open('/tmp/fixed_links.json', 'w') as f:
            json.dump(fixed, f, ensure_ascii=False, indent=2)

        if remaining:
            with open('/tmp/remaining_links.json', 'w') as f:
                json.dump(remaining, f, ensure_ascii=False, indent=2)

        print(f"\n\n3. Results:")
        print(f"   ✓ Fixed: {len(fixed)}")
        print(f"   ✗ Failed: {len(failed)}")
        if remaining:
            print(f"   ⏸ Remaining (quota): {len(remaining)}")
        print(f"   Saved to /tmp/fixed_links.json")

        # Verify results
        print("\n4. Verification of fixed links:")
        trusted_count = sum(1 for f in fixed if f.get('score', 0) >= 100)
        korean_count = sum(1 for f in fixed if has_korean(f.get('youtube_title', '')))
        print(f"   Trusted channels: {trusted_count}/{len(fixed)}")
        print(f"   Korean titles: {korean_count}/{len(fixed)}")

    elif mode == 'apply':
        # Apply fixed links to seed file
        print("\n1. Loading fixed links...")
        with open('/tmp/fixed_links.json', 'r') as f:
            fixed = json.load(f)
        print(f"   Found {len(fixed)} links to apply")

        # Filter only high-confidence results
        high_confidence = [f for f in fixed if f.get('score', 0) >= 50]
        print(f"   High confidence (score >= 50): {len(high_confidence)}")

        # Read seed file and update
        seed_path = Path('data/songs_seed.json')
        with open(seed_path, 'r') as f:
            seed_data = json.load(f)

        # Create mapping
        fix_map = {f['id']: f['new_url'] for f in high_confidence}

        # Update songs
        updated = 0
        for song in seed_data['songs']:
            if song['id'] in fix_map:
                song['youtube_url'] = fix_map[song['id']]
                updated += 1

        # Save updated seed
        with open(seed_path, 'w') as f:
            json.dump(seed_data, f, ensure_ascii=False, indent=2)

        print(f"   Updated {updated} songs in {seed_path}")
        print("\n   Run 'python scripts/seed_data.py' to reload database")

    elif mode == 'verify':
        # Verify fixed links
        print("\n1. Loading fixed links...")
        with open('/tmp/fixed_links.json', 'r') as f:
            fixed = json.load(f)

        print(f"\n2. Verifying {len(fixed)} links...\n")

        for f in fixed:
            score = f.get('score', 0)
            trusted = is_trusted_channel(f.get('channel', ''))
            korean = has_korean(f.get('youtube_title', ''))

            status = '✓' if score >= 50 else '⚠️'
            print(f"{status} ID {f['id']:3} | Score: {score:3} | {f['title'][:25]:25} | {f.get('channel', '')[:20]}")

    else:
        print("Usage:")
        print("  python fix_youtube_links.py check       - Find broken links")
        print("  python fix_youtube_links.py fix [N]     - Search for N replacements")
        print("  python fix_youtube_links.py verify      - Verify fixed links quality")
        print("  python fix_youtube_links.py apply       - Apply high-confidence fixes")

if __name__ == '__main__':
    main()
