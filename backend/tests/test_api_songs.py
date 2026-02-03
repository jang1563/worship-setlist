"""
API tests for songs endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestGetSongs:
    """Tests for GET /api/songs"""

    async def test_get_songs_empty(self, client: AsyncClient):
        """Should return empty list when no songs."""
        response = await client.get("/api/songs")
        assert response.status_code == 200
        data = response.json()
        assert data["songs"] == []
        assert data["total"] == 0

    async def test_get_songs_pagination(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should respect pagination parameters."""
        # Create some songs
        for i in range(5):
            song_data = sample_song_data.copy()
            song_data["title"] = f"Test Song {i}"
            await client.post("/api/songs", json=song_data, headers=auth_headers)

        # Get first page
        response = await client.get("/api/songs?page=1&per_page=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["songs"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["per_page"] == 2

    async def test_get_songs_search(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should filter by search term."""
        # Create songs
        await client.post("/api/songs", json=sample_song_data, headers=auth_headers)

        other_song = sample_song_data.copy()
        other_song["title"] = "다른 노래"
        other_song["artist"] = "다른 아티스트"  # Different artist to avoid matching "테스트"
        other_song["title_en"] = "Another Song"
        await client.post("/api/songs", json=other_song, headers=auth_headers)

        # Search for "찬양" which only appears in the first song's title
        response = await client.get("/api/songs?search=찬양")
        assert response.status_code == 200
        data = response.json()
        assert len(data["songs"]) == 1
        assert "찬양" in data["songs"][0]["title"]

    async def test_get_songs_filter_by_key(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should filter by key."""
        # Create song in G
        await client.post("/api/songs", json=sample_song_data, headers=auth_headers)

        # Create song in C
        other_song = sample_song_data.copy()
        other_song["title"] = "C key song"
        other_song["default_key"] = "C"
        await client.post("/api/songs", json=other_song, headers=auth_headers)

        # Filter by key
        response = await client.get("/api/songs?key=G")
        assert response.status_code == 200
        data = response.json()
        assert len(data["songs"]) == 1
        assert data["songs"][0]["default_key"] == "G"


@pytest.mark.asyncio
class TestGetSong:
    """Tests for GET /api/songs/{id}"""

    async def test_get_song_success(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should return song by ID."""
        # Create song
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Get song
        response = await client.get(f"/api/songs/{song_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == song_id
        assert data["title"] == sample_song_data["title"]

    async def test_get_song_not_found(self, client: AsyncClient):
        """Should return 404 for nonexistent song."""
        response = await client.get("/api/songs/99999")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestCreateSong:
    """Tests for POST /api/songs"""

    async def test_create_song_success(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should create song successfully."""
        response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == sample_song_data["title"]
        assert data["artist"] == sample_song_data["artist"]
        assert data["default_key"] == sample_song_data["default_key"]
        assert "id" in data

    async def test_create_song_minimal(self, client: AsyncClient, auth_headers: dict):
        """Should create song with minimal data."""
        response = await client.post("/api/songs", json={
            "title": "Minimal Song",
            "artist": "Unknown",
            "default_key": "C"
        }, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["title"] == "Minimal Song"

    async def test_create_song_missing_title(self, client: AsyncClient, auth_headers: dict):
        """Should reject song without title."""
        response = await client.post("/api/songs", json={
            "artist": "Test Artist",
            "default_key": "G"
        }, headers=auth_headers)
        assert response.status_code == 422

    async def test_create_song_with_tags(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should preserve tags."""
        response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "경배" in data["mood_tags"]
        assert "주일예배" in data["service_types"]

    async def test_create_song_unauthorized(self, client: AsyncClient, sample_song_data: dict):
        """Should reject without authentication."""
        response = await client.post("/api/songs", json=sample_song_data)
        assert response.status_code == 401


@pytest.mark.asyncio
class TestUpdateSong:
    """Tests for PUT /api/songs/{id}"""

    async def test_update_song_success(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should update song successfully."""
        # Create song
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Update song
        response = await client.put(f"/api/songs/{song_id}", json={
            "title": "Updated Title",
            "default_key": "A"
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["default_key"] == "A"

    async def test_update_song_partial(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should allow partial updates."""
        # Create song
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Update only BPM
        response = await client.put(f"/api/songs/{song_id}", json={
            "bpm": 100
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["bpm"] == 100
        assert data["title"] == sample_song_data["title"]  # Unchanged

    async def test_update_song_not_found(self, client: AsyncClient, auth_headers: dict):
        """Should return 404 for nonexistent song."""
        response = await client.put("/api/songs/99999", json={"title": "Test"}, headers=auth_headers)
        assert response.status_code == 404

    async def test_update_song_unauthorized(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should reject without authentication."""
        # Create song with auth
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Try to update without auth
        response = await client.put(f"/api/songs/{song_id}", json={"title": "Hacked"})
        assert response.status_code == 401


@pytest.mark.asyncio
class TestDeleteSong:
    """Tests for DELETE /api/songs/{id}"""

    async def test_delete_song_success(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should delete song successfully."""
        # Create song
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Delete song
        response = await client.delete(f"/api/songs/{song_id}", headers=auth_headers)
        assert response.status_code == 200

        # Verify deletion
        get_response = await client.get(f"/api/songs/{song_id}")
        assert get_response.status_code == 404

    async def test_delete_song_not_found(self, client: AsyncClient, auth_headers: dict):
        """Should return 404 for nonexistent song."""
        response = await client.delete("/api/songs/99999", headers=auth_headers)
        assert response.status_code == 404

    async def test_delete_song_unauthorized(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should reject without authentication."""
        # Create song with auth
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Try to delete without auth
        response = await client.delete(f"/api/songs/{song_id}")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestChordCharts:
    """Tests for chord chart endpoints."""

    async def test_get_chord_charts_empty(self, client: AsyncClient, sample_song_data: dict, auth_headers: dict):
        """Should return empty list when no charts."""
        # Create song
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        response = await client.get(f"/api/songs/{song_id}/chord-chart")
        assert response.status_code == 200
        assert response.json() == []

    async def test_create_chord_chart(self, client: AsyncClient, sample_song_data: dict, sample_chordpro: str, auth_headers: dict):
        """Should create chord chart successfully."""
        # Create song
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Create chord chart
        response = await client.post(f"/api/songs/{song_id}/chord-chart", json={
            "key": "G",
            "content": sample_chordpro,
            "source": "community",
            "confidence": 95
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["key"] == "G"
        assert data["source"] == "community"
        assert data["confidence"] == 95

    async def test_create_chord_chart_song_not_found(self, client: AsyncClient, sample_chordpro: str, auth_headers: dict):
        """Should return 404 for nonexistent song."""
        response = await client.post("/api/songs/99999/chord-chart", json={
            "key": "G",
            "content": sample_chordpro,
            "source": "community"
        }, headers=auth_headers)
        assert response.status_code == 404

    async def test_get_chord_charts_after_creation(self, client: AsyncClient, sample_song_data: dict, sample_chordpro: str, auth_headers: dict):
        """Should return created chord charts."""
        # Create song
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Create chord chart
        await client.post(f"/api/songs/{song_id}/chord-chart", json={
            "key": "G",
            "content": sample_chordpro,
            "source": "community"
        }, headers=auth_headers)

        # Get chord charts
        response = await client.get(f"/api/songs/{song_id}/chord-chart")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["key"] == "G"

    async def test_create_chord_chart_unauthorized(self, client: AsyncClient, sample_song_data: dict, sample_chordpro: str, auth_headers: dict):
        """Should reject without authentication."""
        # Create song with auth
        create_response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
        song_id = create_response.json()["id"]

        # Try to create chord chart without auth
        response = await client.post(f"/api/songs/{song_id}/chord-chart", json={
            "key": "G",
            "content": sample_chordpro,
            "source": "community"
        })
        assert response.status_code == 401
