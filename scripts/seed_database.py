#!/usr/bin/env python3
"""
Database seeding script for WorshipFlow.
Seeds songs and chord charts from JSON files.
"""
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

from app.core.database import Base
from app.models import Song, ChordChart


async def seed_songs(session: AsyncSession, songs_data: list[dict]) -> int:
    """Seed songs into database."""
    created = 0

    for song_data in songs_data:
        # Check if song already exists (by title + artist)
        result = await session.execute(
            select(Song).where(
                Song.title == song_data["title"],
                Song.artist == song_data["artist"]
            )
        )
        existing = result.scalars().first()

        if existing:
            continue

        # Create new song
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

        # Set list properties
        song.mood_tags = song_data.get("mood_tags", [])
        song.service_types = song_data.get("service_types", [])
        song.season_tags = song_data.get("season_tags", [])
        song.min_instruments = song_data.get("min_instruments", [])
        song.scripture_refs = song_data.get("scripture_refs", [])

        session.add(song)
        created += 1

    await session.commit()
    return created


async def seed_chords(session: AsyncSession, chords_data: list[dict]) -> int:
    """Seed chord charts into database."""
    created = 0

    for chart_data in chords_data:
        song_id = chart_data.get("song_id")

        # Check if song exists
        result = await session.execute(select(Song).where(Song.id == song_id))
        song = result.scalars().first()

        if not song:
            print(f"  Warning: Song ID {song_id} not found, skipping chord chart")
            continue

        # Check if chart already exists
        result = await session.execute(
            select(ChordChart).where(
                ChordChart.song_id == song_id,
                ChordChart.key == chart_data["key"]
            )
        )
        existing = result.scalars().first()

        if existing:
            continue

        # Create chord chart
        chart = ChordChart(
            song_id=song_id,
            key=chart_data["key"],
            content=chart_data.get("chordpro_content", ""),
            chordpro_content=chart_data.get("chordpro_content"),
            source=chart_data.get("source", "community"),
            confidence=chart_data.get("confidence"),
        )

        session.add(chart)
        created += 1

    await session.commit()
    return created


async def main():
    """Main seeding function."""
    print("=" * 50)
    print("WorshipFlow Database Seeding")
    print("=" * 50)

    # Load data files
    data_dir = Path(__file__).parent.parent / "data"

    songs_file = data_dir / "songs_seed.json"
    chords_file = data_dir / "chordpro_seed.json"

    # Database URL
    db_url = "sqlite+aiosqlite:///./data/worshipflow.db"

    print(f"\nDatabase: {db_url}")

    # Create engine
    engine = create_async_engine(db_url, echo=False)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Database tables created")

    # Create session
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Seed songs
        if songs_file.exists():
            print(f"\nLoading songs from {songs_file.name}...")
            with open(songs_file, "r", encoding="utf-8") as f:
                songs_data = json.load(f)["songs"]

            print(f"  Found {len(songs_data)} songs in seed file")
            created = await seed_songs(session, songs_data)
            print(f"  ✓ Created {created} new songs")

            # Count total
            result = await session.execute(text("SELECT COUNT(*) FROM songs"))
            total = result.scalar()
            print(f"  Total songs in database: {total}")
        else:
            print(f"Warning: {songs_file} not found")

        # Seed chord charts
        if chords_file.exists():
            print(f"\nLoading chord charts from {chords_file.name}...")
            with open(chords_file, "r", encoding="utf-8") as f:
                chords_data = json.load(f)["chord_charts"]

            print(f"  Found {len(chords_data)} chord charts in seed file")
            created = await seed_chords(session, chords_data)
            print(f"  ✓ Created {created} new chord charts")

            # Count total
            result = await session.execute(text("SELECT COUNT(*) FROM chord_charts"))
            total = result.scalar()
            print(f"  Total chord charts in database: {total}")
        else:
            print(f"Warning: {chords_file} not found")

    await engine.dispose()

    print("\n" + "=" * 50)
    print("Seeding completed!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
