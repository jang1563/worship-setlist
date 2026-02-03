#!/usr/bin/env python3
"""
YouTube Link Fixer v3 - Using yt-dlp (no API quota issues)
Prioritizes accurate Korean worship song matching.
"""
import json
import subprocess
import time
import re
import sys
from pathlib import Path
from difflib import SequenceMatcher

# Trusted Korean worship channels
TRUSTED_CHANNELS = {
    'MARKERS WORSHIP': 100,
    '마커스워십': 100,
    'markers': 80,
    'ANOINTING': 100,
    '어노인팅': 100,
    'J-US Ministry': 100,
    'J-US': 90,
    '제이어스': 100,
    'Beecompany 비컴퍼니': 100,
    'Beecompany': 90,
    '비컴퍼니': 100,
    '캠퍼스워십': 90,
    'YWAM': 80,
    '새벽날개': 90,
    '예수전도단': 90,
    '옹기장이': 90,
    '소리엘': 90,
    '어바인온누리': 80,
    '할렐루야찬양대': 80,
    '갓피플': 70,
    '뉴제너레이션워십': 90,
    '아이자야씩스티원': 90,
    'Isaiah6tyOne': 90,
    '파워스테이션': 80,
    'Powerstation': 80,
}


def has_korean(text: str) -> bool:
    """Check if text contains Korean characters."""
    return any('\uac00' <= c <= '\ud7af' for c in text)


def normalize_title(title: str) -> str:
    """Normalize title for comparison."""
    # Remove common suffixes and prefixes
    patterns = [
        r'\s*[-–|]\s*(마커스|어노인팅|제이어스|비컴퍼니|official|MV|Live|라이브).*$',
        r'\s*[\(\[].*?[\)\]]',  # Remove parenthetical content
        r'\s*(official|MV|Live|라이브|가사|lyrics).*$',
        r'^\d+\.\s*',  # Remove track numbers
    ]
    result = title.lower().strip()
    for pattern in patterns:
        result = re.sub(pattern, '', result, flags=re.IGNORECASE)
    return result.strip()


def title_similarity(title1: str, title2: str) -> float:
    """Calculate similarity between two titles."""
    t1 = normalize_title(title1)
    t2 = normalize_title(title2)
    return SequenceMatcher(None, t1, t2).ratio()


def get_channel_score(channel_name: str) -> int:
    """Get score for a channel based on trust level."""
    channel_lower = channel_name.lower()
    for trusted, score in TRUSTED_CHANNELS.items():
        if trusted.lower() in channel_lower:
            return score
    return 0


def search_youtube_ytdlp(query: str, max_results: int = 5) -> list:
    """Search YouTube using yt-dlp."""
    try:
        cmd = [
            'yt-dlp',
            f'ytsearch{max_results}:{query}',
            '--flat-playlist',
            '--dump-json',
            '--no-warnings',
            '--quiet'
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        results = []
        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    data = json.loads(line)
                    results.append({
                        'video_id': data.get('id', ''),
                        'title': data.get('title', ''),
                        'channel': data.get('channel', data.get('uploader', '')),
                        'duration': data.get('duration', 0)
                    })
                except json.JSONDecodeError:
                    continue
        return results
    except subprocess.TimeoutExpired:
        print("  Search timeout")
        return []
    except Exception as e:
        print(f"  Search error: {e}")
        return []


def verify_video_exists(video_id: str) -> bool:
    """Verify video exists using yt-dlp."""
    try:
        cmd = ['yt-dlp', '--skip-download', '--no-warnings', '-q',
               f'https://www.youtube.com/watch?v={video_id}']
        result = subprocess.run(cmd, capture_output=True, timeout=10)
        return result.returncode == 0
    except:
        return False


def find_best_match(song_title: str, artist: str, is_hymn: bool = False) -> dict | None:
    """Find the best YouTube match for a song."""

    # Build search queries based on song type
    if is_hymn:
        queries = [
            f"새찬송가 {song_title}",
            f"{song_title} 찬송가 비컴퍼니",
            f"{song_title} 새찬송가 official",
        ]
    else:
        queries = [
            f"{song_title} {artist} 찬양",
            f"{song_title} 마커스워십",
            f"{song_title} 어노인팅",
            f"{song_title} 찬양 official",
        ]

    best_match = None
    best_score = 0

    for query in queries:
        print(f"    Searching: {query[:40]}...")
        results = search_youtube_ytdlp(query)

        for result in results:
            score = 0

            # Channel trust score
            channel_score = get_channel_score(result['channel'])
            score += channel_score

            # Title similarity score (0-100)
            similarity = title_similarity(song_title, result['title'])
            score += int(similarity * 100)

            # Korean bonus
            if has_korean(result['title']):
                score += 20
            if has_korean(result['channel']):
                score += 10

            # Duration check (worship songs typically 3-10 min)
            duration = result.get('duration', 0)
            if 180 <= duration <= 600:
                score += 20
            elif duration > 600:
                score -= 10  # Might be a compilation

            # Penalty for clearly wrong content
            lower_title = result['title'].lower()
            if any(x in lower_title for x in ['english ver', 'eng ver', 'instrumental only', 'karaoke']):
                score -= 50

            # Exact title match bonus
            if normalize_title(song_title) in normalize_title(result['title']):
                score += 50

            result['score'] = score
            result['similarity'] = similarity

            if score > best_score and similarity >= 0.4:
                best_score = score
                best_match = result

        time.sleep(0.5)  # Rate limit

        # If we found a very good match, stop searching
        if best_score >= 200:
            break

    return best_match


def load_broken_links() -> list:
    """Load broken links from file."""
    try:
        with open('/tmp/broken_links.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def load_already_fixed() -> set:
    """Load IDs of already fixed songs (both v1 and v3)."""
    fixed_ids = set()
    # Load v1 fixed
    try:
        with open('/tmp/fixed_links.json', 'r') as f:
            data = json.load(f)
            fixed_ids.update(item['id'] for item in data)
    except FileNotFoundError:
        pass
    # Load v3 fixed
    try:
        with open('/tmp/fixed_links_v3.json', 'r') as f:
            data = json.load(f)
            fixed_ids.update(item['id'] for item in data)
    except FileNotFoundError:
        pass
    return fixed_ids


def load_v3_fixed() -> list:
    """Load v3 fixed links."""
    try:
        with open('/tmp/fixed_links_v3.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def save_fixed_links(fixed: list):
    """Save fixed links to file (append to existing v3)."""
    existing = load_v3_fixed()
    existing_ids = {f['id'] for f in existing}

    # Add new fixes (no duplicates)
    for f in fixed:
        if f['id'] not in existing_ids:
            existing.append(f)
            existing_ids.add(f['id'])

    with open('/tmp/fixed_links_v3.json', 'w') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    return len(existing)


def main():
    print("=" * 60)
    print("YouTube Link Fixer v3 (yt-dlp based)")
    print("=" * 60)

    mode = sys.argv[1] if len(sys.argv) > 1 else 'help'

    if mode == 'fix':
        broken = load_broken_links()
        already_fixed = load_already_fixed()

        # Filter out already fixed
        to_fix = [s for s in broken if s['id'] not in already_fixed]

        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        to_fix = to_fix[:limit]

        print(f"\nTotal broken: {len(broken)}")
        print(f"Already fixed: {len(already_fixed)}")
        print(f"To fix this run: {len(to_fix)}")

        fixed = []
        failed = []

        for i, song in enumerate(to_fix):
            print(f"\n[{i+1}/{len(to_fix)}] {song['title']} - {song['artist']}")

            is_hymn = song['artist'] == '찬송가'
            match = find_best_match(song['title'], song['artist'], is_hymn)

            if match and match['score'] >= 100:
                new_url = f"https://www.youtube.com/watch?v={match['video_id']}"
                print(f"  ✓ Found (score={match['score']}, sim={match['similarity']:.2f})")
                print(f"    Title: {match['title'][:50]}")
                print(f"    Channel: {match['channel']}")

                fixed.append({
                    'id': song['id'],
                    'title': song['title'],
                    'artist': song['artist'],
                    'new_url': new_url,
                    'youtube_title': match['title'],
                    'channel': match['channel'],
                    'score': match['score'],
                    'similarity': match['similarity']
                })
                # Save after each successful fix (prevents data loss)
                total = save_fixed_links(fixed)
                print(f"    [Saved: {total} total]")
            else:
                print(f"  ✗ Not found or low confidence")
                if match:
                    print(f"    Best: {match['title'][:40]} (score={match['score']})")
                failed.append(song)

            time.sleep(1)  # Rate limit
            sys.stdout.flush()  # Force output flush

        # Final save
        total = save_fixed_links(fixed)

        print(f"\n\nResults:")
        print(f"  ✓ Fixed this run: {len(fixed)}")
        print(f"  ✗ Failed: {len(failed)}")
        print(f"  📁 Total in v3: {total}")
        print(f"  Saved to /tmp/fixed_links_v3.json")

        # Summary of quality
        high_conf = sum(1 for f in fixed if f['score'] >= 150)
        trusted = sum(1 for f in fixed if get_channel_score(f['channel']) >= 80)
        print(f"\n  High confidence (score>=150): {high_conf}/{len(fixed)}")
        print(f"  Trusted channels: {trusted}/{len(fixed)}")

    elif mode == 'verify':
        try:
            with open('/tmp/fixed_links_v3.json', 'r') as f:
                fixed = json.load(f)
        except FileNotFoundError:
            print("No fixed_links_v3.json found. Run 'fix' first.")
            return

        print(f"\nVerifying {len(fixed)} links...\n")

        for f in fixed:
            status = '✓' if f['score'] >= 150 else '⚠️' if f['score'] >= 100 else '✗'
            sim = f.get('similarity', 0)
            print(f"{status} ID {f['id']:3} | Score: {f['score']:3} | Sim: {sim:.2f} | {f['title'][:25]:25} | {f['channel'][:20]}")

    elif mode == 'apply':
        try:
            with open('/tmp/fixed_links_v3.json', 'r') as f:
                fixed = json.load(f)
        except FileNotFoundError:
            print("No fixed_links_v3.json found. Run 'fix' first.")
            return

        # Only apply high confidence fixes
        high_conf = [f for f in fixed if f['score'] >= 120 and f.get('similarity', 0) >= 0.5]
        print(f"\nApplying {len(high_conf)} high-confidence fixes...")

        # Load seed file
        seed_path = Path('data/songs_seed.json')
        with open(seed_path, 'r') as f:
            seed_data = json.load(f)

        # Create mapping
        fix_map = {f['id']: f['new_url'] for f in high_conf}

        # Update songs
        updated = 0
        for song in seed_data['songs']:
            if song['id'] in fix_map:
                old_url = song.get('youtube_url', 'None')
                song['youtube_url'] = fix_map[song['id']]
                print(f"  Updated ID {song['id']}: {song['title'][:30]}")
                updated += 1

        # Save
        with open(seed_path, 'w') as f:
            json.dump(seed_data, f, ensure_ascii=False, indent=2)

        print(f"\n✓ Updated {updated} songs in {seed_path}")

    elif mode == 'merge':
        # Merge v3 results with existing fixed_links.json
        try:
            with open('/tmp/fixed_links.json', 'r') as f:
                existing = json.load(f)
        except FileNotFoundError:
            existing = []

        try:
            with open('/tmp/fixed_links_v3.json', 'r') as f:
                new = json.load(f)
        except FileNotFoundError:
            print("No fixed_links_v3.json found.")
            return

        # Merge (v3 takes precedence)
        existing_ids = {f['id'] for f in existing}
        merged = list(existing)

        for item in new:
            if item['id'] not in existing_ids:
                merged.append(item)
            else:
                # Replace with v3 version
                merged = [f for f in merged if f['id'] != item['id']]
                merged.append(item)

        with open('/tmp/fixed_links_merged.json', 'w') as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)

        print(f"Merged: {len(merged)} total ({len(new)} new/updated)")

    else:
        print("\nUsage:")
        print("  python fix_youtube_links_v3.py fix [N]    - Fix N broken links (default 20)")
        print("  python fix_youtube_links_v3.py verify     - Verify fixed links quality")
        print("  python fix_youtube_links_v3.py apply      - Apply high-confidence fixes")
        print("  python fix_youtube_links_v3.py merge      - Merge with existing fixes")


if __name__ == '__main__':
    main()
