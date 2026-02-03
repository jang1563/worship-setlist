#!/usr/bin/env python3
"""
Seed ChordPro data into the database.
Run from project root: python scripts/seed_chords.py
"""
import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from sqlalchemy import select
from app.core.database import async_session_maker, engine
from app.models import Base
from app.models.song import ChordChart


async def seed_chord_charts():
    """Seed chord charts from JSON file."""
    # Load seed data
    seed_file = Path(__file__).parent.parent / "data" / "chordpro_seed.json"

    if not seed_file.exists():
        print(f"Error: Seed file not found: {seed_file}")
        return

    with open(seed_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    charts = data.get("chord_charts", [])
    print(f"Found {len(charts)} chord charts to seed")

    async with async_session_maker() as session:
        added = 0
        skipped = 0

        for chart_data in charts:
            # Check if chart already exists for this song/key
            result = await session.execute(
                select(ChordChart).where(
                    ChordChart.song_id == chart_data["song_id"],
                    ChordChart.key == chart_data["key"]
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                print(f"  Skipping song_id={chart_data['song_id']} key={chart_data['key']} (already exists)")
                skipped += 1
                continue

            # Create new chord chart
            chart = ChordChart(
                song_id=chart_data["song_id"],
                key=chart_data["key"],
                content=chart_data.get("chordpro_content", ""),  # Use chordpro as content
                chordpro_content=chart_data.get("chordpro_content"),
                source=chart_data.get("source", "community"),
                confidence=chart_data.get("confidence")
            )
            session.add(chart)
            print(f"  Added chord chart for song_id={chart_data['song_id']} key={chart_data['key']}")
            added += 1

        await session.commit()
        print(f"\nDone! Added {added} chord charts, skipped {skipped}")


if __name__ == "__main__":
    asyncio.run(seed_chord_charts())
