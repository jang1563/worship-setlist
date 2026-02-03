"""
API tests for share endpoints.
"""
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta


@pytest.mark.asyncio
class TestCreateShareLink:
    """Tests for POST /api/share/setlists/{setlist_id}"""

    async def test_create_share_link_success(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should create share link for setlist."""
        response = await client.post(
            f"/api/share/setlists/{created_setlist['id']}",
            json={"expires_days": 7}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["setlist_id"] == created_setlist["id"]
        assert data["share_url"] == f"/shared/{data['token']}"
        assert data["expires_at"] is not None

    async def test_create_share_link_no_expiry(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should create share link without expiry."""
        response = await client.post(
            f"/api/share/setlists/{created_setlist['id']}",
            json={"expires_days": None}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["expires_at"] is None

    async def test_create_share_link_default_expiry(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should use default 7-day expiry when not specified."""
        response = await client.post(
            f"/api/share/setlists/{created_setlist['id']}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["expires_at"] is not None

    async def test_create_share_link_setlist_not_found(self, client: AsyncClient):
        """Should return 404 for nonexistent setlist."""
        response = await client.post("/api/share/setlists/99999")
        assert response.status_code == 404


@pytest.mark.asyncio
class TestGetSharedSetlist:
    """Tests for GET /api/share/shared/{token}"""

    async def test_get_shared_setlist_success(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should get shared setlist by token."""
        # Create share link
        share_response = await client.post(
            f"/api/share/setlists/{created_setlist['id']}"
        )
        token = share_response.json()["token"]

        # Get shared setlist
        response = await client.get(f"/api/share/shared/{token}")
        assert response.status_code == 200
        data = response.json()
        assert data["setlist"]["id"] == created_setlist["id"]
        assert data["setlist"]["title"] == created_setlist["title"]
        assert "shared_at" in data

    async def test_get_shared_setlist_invalid_token(self, client: AsyncClient):
        """Should return 404 for invalid token."""
        response = await client.get("/api/share/shared/invalid_token_12345")
        assert response.status_code == 404

    async def test_get_shared_setlist_multiple_tokens(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should allow multiple share tokens for same setlist."""
        # Create first share link
        share1 = await client.post(
            f"/api/share/setlists/{created_setlist['id']}"
        )
        token1 = share1.json()["token"]

        # Create second share link
        share2 = await client.post(
            f"/api/share/setlists/{created_setlist['id']}"
        )
        token2 = share2.json()["token"]

        # Both tokens should work
        response1 = await client.get(f"/api/share/shared/{token1}")
        assert response1.status_code == 200

        response2 = await client.get(f"/api/share/shared/{token2}")
        assert response2.status_code == 200


@pytest.mark.asyncio
class TestRevokeShareLinks:
    """Tests for DELETE /api/share/setlists/{setlist_id}/revoke"""

    async def test_revoke_share_links_success(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should revoke all share links for setlist."""
        # Create share links
        share1 = await client.post(
            f"/api/share/setlists/{created_setlist['id']}"
        )
        token1 = share1.json()["token"]

        share2 = await client.post(
            f"/api/share/setlists/{created_setlist['id']}"
        )
        token2 = share2.json()["token"]

        # Revoke all links
        response = await client.delete(
            f"/api/share/setlists/{created_setlist['id']}/revoke"
        )
        assert response.status_code == 200
        assert "Revoked 2 share link(s)" in response.json()["message"]

        # Tokens should no longer work
        response1 = await client.get(f"/api/share/shared/{token1}")
        assert response1.status_code == 404

        response2 = await client.get(f"/api/share/shared/{token2}")
        assert response2.status_code == 404

    async def test_revoke_share_links_no_links(
        self, client: AsyncClient, created_setlist: dict
    ):
        """Should handle case with no links to revoke."""
        response = await client.delete(
            f"/api/share/setlists/{created_setlist['id']}/revoke"
        )
        assert response.status_code == 200
        assert "Revoked 0 share link(s)" in response.json()["message"]

    async def test_revoke_share_links_setlist_not_found(self, client: AsyncClient):
        """Should return 404 for nonexistent setlist."""
        response = await client.delete("/api/share/setlists/99999/revoke")
        assert response.status_code == 404
