"""Seed database with initial song data."""

import asyncio
import json
from pathlib import Path

from sqlalchemy import select
from app.core.database import async_session_maker, create_tables
from app.models import Song


async def seed_songs():
    """Insert seed songs from data/songs_seed.json"""
    await create_tables()

    # Load seed data
    seed_file = Path(__file__).parent.parent.parent / "data" / "songs_seed.json"
    if not seed_file.exists():
        print(f"Seed file not found: {seed_file}")
        return

    with open(seed_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    songs_data = data.get("songs", [])

    async with async_session_maker() as session:
        # Check if songs already exist
        result = await session.execute(select(Song).limit(1))
        if result.scalar_one_or_none():
            print("Database already has songs. Skipping seed.")
            return

        for song_data in songs_data:
            song = Song(
                title=song_data["title"],
                title_en=song_data.get("title_en"),
                title_original=song_data.get("title_original"),
                artist=song_data["artist"],
                album=song_data.get("album"),
                year=song_data.get("year"),
                default_key=song_data["default_key"],
                bpm=song_data.get("bpm"),
                duration_sec=song_data.get("duration_sec"),
                difficulty=song_data.get("difficulty", "medium"),
                vocal_range_low=song_data.get("vocal_range_low"),
                vocal_range_high=song_data.get("vocal_range_high"),
                scripture_connection=song_data.get("scripture_connection"),
                youtube_url=song_data.get("youtube_url"),
                hymn_number=song_data.get("hymn_number"),
            )
            song.mood_tags = song_data.get("mood_tags", [])
            song.service_types = song_data.get("service_types", [])
            song.season_tags = song_data.get("season_tags", [])
            song.min_instruments = song_data.get("min_instruments", [])
            song.scripture_refs = song_data.get("scripture_refs", [])

            session.add(song)

        await session.commit()
        print(f"Seeded {len(songs_data)} songs successfully!")


if __name__ == "__main__":
    asyncio.run(seed_songs())
