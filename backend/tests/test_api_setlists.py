"""
API tests for setlists endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestGetSetlists:
    """Tests for GET /api/setlists"""

    async def test_get_setlists_empty(self, client: AsyncClient):
        """Should return empty list when no setlists."""
        response = await client.get("/api/setlists")
        assert response.status_code == 200
        data = response.json()
        assert data["setlists"] == []
        assert data["total"] == 0

    async def test_get_setlists_pagination(
        self, client: AsyncClient, sample_setlist_data: dict, auth_headers: dict
    ):
        """Should respect pagination parameters."""
        # Create some setlists
        for i in range(5):
            setlist_data = sample_setlist_data.copy()
            setlist_data["title"] = f"Setlist {i}"
            await client.post("/api/setlists", json=setlist_data, headers=auth_headers)

        # Get first page
        response = await client.get("/api/setlists?page=1&per_page=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["setlists"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["per_page"] == 2


@pytest.mark.asyncio
class TestGetSetlist:
    """Tests for GET /api/setlists/{id}"""

    async def test_get_setlist_success(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should return setlist by ID."""
        response = await client.get(f"/api/setlists/{created_setlist['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_setlist["id"]
        assert data["title"] == created_setlist["title"]

    async def test_get_setlist_not_found(self, client: AsyncClient):
        """Should return 404 for nonexistent setlist."""
        response = await client.get("/api/setlists/99999")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestCreateSetlist:
    """Tests for POST /api/setlists"""

    async def test_create_setlist_success(
        self, client: AsyncClient, sample_setlist_data: dict, auth_headers: dict
    ):
        """Should create setlist successfully."""
        response = await client.post(
            "/api/setlists", json=sample_setlist_data, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == sample_setlist_data["title"]
        assert data["service_type"] == sample_setlist_data["service_type"]
        assert "id" in data

    async def test_create_setlist_with_songs(
        self, client: AsyncClient, sample_setlist_data: dict,
        created_song: dict, auth_headers: dict
    ):
        """Should create setlist with songs."""
        setlist_data = sample_setlist_data.copy()
        setlist_data["songs"] = [{
            "song_id": created_song["id"],
            "order": 1,
            "key": "G",
            "role": "시작"
        }]

        response = await client.post(
            "/api/setlists", json=setlist_data, headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["songs"]) == 1
        assert data["songs"][0]["song_id"] == created_song["id"]
        assert data["songs"][0]["key"] == "G"

    async def test_create_setlist_missing_title(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should reject setlist without title."""
        response = await client.post(
            "/api/setlists",
            json={"service_type": "주일예배"},
            headers=auth_headers
        )
        assert response.status_code == 422

    async def test_create_setlist_unauthorized(
        self, client: AsyncClient, sample_setlist_data: dict
    ):
        """Should reject unauthenticated request."""
        response = await client.post("/api/setlists", json=sample_setlist_data)
        assert response.status_code == 401


@pytest.mark.asyncio
class TestUpdateSetlist:
    """Tests for PUT /api/setlists/{id}"""

    async def test_update_setlist_success(
        self, client: AsyncClient, created_setlist: dict, auth_headers: dict
    ):
        """Should update setlist successfully."""
        response = await client.put(
            f"/api/setlists/{created_setlist['id']}",
            json={"title": "Updated Title", "sermon_topic": "새로운 주제"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["sermon_topic"] == "새로운 주제"

    async def test_update_setlist_partial(
        self, client: AsyncClient, created_setlist: dict, auth_headers: dict
    ):
        """Should allow partial updates."""
        original_title = created_setlist["title"]
        response = await client.put(
            f"/api/setlists/{created_setlist['id']}",
            json={"notes": "새 노트"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "새 노트"
        assert data["title"] == original_title

    async def test_update_setlist_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return 404 for nonexistent setlist."""
        response = await client.put(
            "/api/setlists/99999",
            json={"title": "Test"},
            headers=auth_headers
        )
        assert response.status_code == 404

    async def test_update_setlist_unauthorized(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should reject unauthenticated request."""
        response = await client.put(
            f"/api/setlists/{created_setlist['id']}",
            json={"title": "Test"}
        )
        assert response.status_code == 401


@pytest.mark.asyncio
class TestDeleteSetlist:
    """Tests for DELETE /api/setlists/{id}"""

    async def test_delete_setlist_success(
        self, client: AsyncClient, created_setlist: dict, auth_headers: dict
    ):
        """Should delete setlist successfully."""
        response = await client.delete(
            f"/api/setlists/{created_setlist['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200

        # Verify deletion
        get_response = await client.get(f"/api/setlists/{created_setlist['id']}")
        assert get_response.status_code == 404

    async def test_delete_setlist_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return 404 for nonexistent setlist."""
        response = await client.delete("/api/setlists/99999", headers=auth_headers)
        assert response.status_code == 404

    async def test_delete_setlist_unauthorized(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should reject unauthenticated request."""
        response = await client.delete(f"/api/setlists/{created_setlist['id']}")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestUpdateSetlistSongs:
    """Tests for PUT /api/setlists/{id}/songs"""

    async def test_update_setlist_songs_success(
        self, client: AsyncClient, created_setlist: dict,
        created_song: dict, auth_headers: dict
    ):
        """Should update setlist songs successfully."""
        songs = [{
            "song_id": created_song["id"],
            "order": 1,
            "key": "A",
            "role": "경배"
        }]

        response = await client.put(
            f"/api/setlists/{created_setlist['id']}/songs",
            json=songs,
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["songs"]) == 1
        assert data["songs"][0]["key"] == "A"
        assert data["songs"][0]["role"] == "경배"

    async def test_update_setlist_songs_replace_all(
        self, client: AsyncClient, created_setlist: dict,
        sample_song_data: dict, auth_headers: dict
    ):
        """Should replace all songs when updating."""
        # Create two songs
        song1_data = sample_song_data.copy()
        song1_data["title"] = "Song 1"
        song1_resp = await client.post(
            "/api/songs", json=song1_data, headers=auth_headers
        )
        song1_id = song1_resp.json()["id"]

        song2_data = sample_song_data.copy()
        song2_data["title"] = "Song 2"
        song2_resp = await client.post(
            "/api/songs", json=song2_data, headers=auth_headers
        )
        song2_id = song2_resp.json()["id"]

        # Add first song to setlist
        await client.put(
            f"/api/setlists/{created_setlist['id']}/songs",
            json=[{"song_id": song1_id, "order": 1, "key": "G"}],
            headers=auth_headers
        )

        # Replace with second song
        response = await client.put(
            f"/api/setlists/{created_setlist['id']}/songs",
            json=[{"song_id": song2_id, "order": 1, "key": "C"}],
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["songs"]) == 1
        assert data["songs"][0]["song_id"] == song2_id

    async def test_update_setlist_songs_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return 404 for nonexistent setlist."""
        response = await client.put(
            "/api/setlists/99999/songs",
            json=[],
            headers=auth_headers
        )
        assert response.status_code == 404

    async def test_update_setlist_songs_unauthorized(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should reject unauthenticated request."""
        response = await client.put(
            f"/api/setlists/{created_setlist['id']}/songs",
            json=[]
        )
        assert response.status_code == 401
