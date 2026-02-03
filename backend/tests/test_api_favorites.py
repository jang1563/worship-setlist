"""
API tests for favorites endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestAddFavorite:
    """Tests for POST /api/favorites/{song_id}"""

    async def test_add_favorite_success(
        self, client: AsyncClient, created_song: dict, auth_headers: dict
    ):
        """Should add song to favorites."""
        response = await client.post(
            f"/api/favorites/{created_song['id']}",
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["song_id"] == created_song["id"]
        assert "created_at" in data

    async def test_add_favorite_duplicate(
        self, client: AsyncClient, created_song: dict, auth_headers: dict
    ):
        """Should reject duplicate favorite."""
        # Add first time
        await client.post(
            f"/api/favorites/{created_song['id']}",
            headers=auth_headers
        )

        # Try to add again
        response = await client.post(
            f"/api/favorites/{created_song['id']}",
            headers=auth_headers
        )
        assert response.status_code == 400
        assert "already in favorites" in response.json()["detail"]

    async def test_add_favorite_song_not_found(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return 404 for nonexistent song."""
        response = await client.post(
            "/api/favorites/99999",
            headers=auth_headers
        )
        assert response.status_code == 404

    async def test_add_favorite_unauthorized(
        self, client: AsyncClient, created_song: dict
    ):
        """Should reject unauthenticated request."""
        response = await client.post(f"/api/favorites/{created_song['id']}")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestRemoveFavorite:
    """Tests for DELETE /api/favorites/{song_id}"""

    async def test_remove_favorite_success(
        self, client: AsyncClient, created_song: dict, auth_headers: dict
    ):
        """Should remove song from favorites."""
        # Add favorite
        await client.post(
            f"/api/favorites/{created_song['id']}",
            headers=auth_headers
        )

        # Remove favorite
        response = await client.delete(
            f"/api/favorites/{created_song['id']}",
            headers=auth_headers
        )
        assert response.status_code == 204

        # Verify removal
        get_response = await client.get("/api/favorites/ids", headers=auth_headers)
        assert created_song["id"] not in get_response.json()

    async def test_remove_favorite_not_found(
        self, client: AsyncClient, created_song: dict, auth_headers: dict
    ):
        """Should return 404 for non-favorited song."""
        response = await client.delete(
            f"/api/favorites/{created_song['id']}",
            headers=auth_headers
        )
        assert response.status_code == 404

    async def test_remove_favorite_unauthorized(
        self, client: AsyncClient, created_song: dict
    ):
        """Should reject unauthenticated request."""
        response = await client.delete(f"/api/favorites/{created_song['id']}")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetFavorites:
    """Tests for GET /api/favorites"""

    async def test_get_favorites_empty(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return empty list when no favorites."""
        response = await client.get("/api/favorites", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["favorites"] == []
        assert data["total"] == 0

    async def test_get_favorites_with_songs(
        self, client: AsyncClient, sample_song_data: dict, auth_headers: dict
    ):
        """Should return favorited songs."""
        # Create songs and add to favorites
        song1_data = sample_song_data.copy()
        song1_data["title"] = "Song 1"
        song1 = await client.post("/api/songs", json=song1_data, headers=auth_headers)
        song1_id = song1.json()["id"]

        song2_data = sample_song_data.copy()
        song2_data["title"] = "Song 2"
        song2 = await client.post("/api/songs", json=song2_data, headers=auth_headers)
        song2_id = song2.json()["id"]

        # Add to favorites
        await client.post(f"/api/favorites/{song1_id}", headers=auth_headers)
        await client.post(f"/api/favorites/{song2_id}", headers=auth_headers)

        # Get favorites
        response = await client.get("/api/favorites", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        assert len(data["favorites"]) == 2

        # Verify order (most recent first)
        titles = [f["title"] for f in data["favorites"]]
        assert "Song 2" in titles
        assert "Song 1" in titles

    async def test_get_favorites_unauthorized(self, client: AsyncClient):
        """Should reject unauthenticated request."""
        response = await client.get("/api/favorites")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetFavoriteIds:
    """Tests for GET /api/favorites/ids"""

    async def test_get_favorite_ids_empty(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Should return empty list when no favorites."""
        response = await client.get("/api/favorites/ids", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    async def test_get_favorite_ids_with_songs(
        self, client: AsyncClient, created_song: dict, auth_headers: dict
    ):
        """Should return list of favorited song IDs."""
        # Add to favorites
        await client.post(
            f"/api/favorites/{created_song['id']}",
            headers=auth_headers
        )

        # Get favorite IDs
        response = await client.get("/api/favorites/ids", headers=auth_headers)
        assert response.status_code == 200
        assert created_song["id"] in response.json()

    async def test_get_favorite_ids_unauthorized(self, client: AsyncClient):
        """Should reject unauthenticated request."""
        response = await client.get("/api/favorites/ids")
        assert response.status_code == 401
