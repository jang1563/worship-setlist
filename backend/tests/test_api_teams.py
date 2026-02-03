"""
API tests for teams endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.fixture
def sample_team_data() -> dict:
    """Sample team data for testing."""
    return {
        "name": "테스트 찬양팀",
        "description": "테스트용 찬양팀입니다",
        "church_name": "테스트 교회",
        "location": "서울",
        "default_service_type": "주일예배",
        "timezone": "Asia/Seoul"
    }


@pytest.fixture
async def created_team(client: AsyncClient, sample_team_data: dict, auth_headers: dict) -> dict:
    """Create a team and return its data."""
    response = await client.post("/api/teams", json=sample_team_data, headers=auth_headers)
    return response.json()


@pytest.mark.asyncio
class TestGetMyTeams:
    """Tests for GET /api/teams"""

    async def test_get_my_teams_empty(self, client: AsyncClient, auth_headers: dict):
        """Should return empty list when user has no teams."""
        response = await client.get("/api/teams", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["teams"] == []
        assert data["total"] == 0

    async def test_get_my_teams_with_teams(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should return user's teams."""
        response = await client.get("/api/teams", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["teams"][0]["name"] == created_team["name"]

    async def test_get_my_teams_unauthorized(self, client: AsyncClient):
        """Should reject unauthenticated request."""
        response = await client.get("/api/teams")
        assert response.status_code == 401


@pytest.mark.asyncio
class TestCreateTeam:
    """Tests for POST /api/teams"""

    async def test_create_team_success(
        self, client: AsyncClient, sample_team_data: dict, auth_headers: dict
    ):
        """Should create team and set creator as owner."""
        response = await client.post("/api/teams", json=sample_team_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == sample_team_data["name"]
        assert len(data["members"]) == 1
        assert data["members"][0]["role"] == "owner"

    async def test_create_team_minimal(self, client: AsyncClient, auth_headers: dict):
        """Should create team with minimal data."""
        response = await client.post(
            "/api/teams",
            json={"name": "Minimal Team"},
            headers=auth_headers
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Minimal Team"

    async def test_create_team_unauthorized(
        self, client: AsyncClient, sample_team_data: dict
    ):
        """Should reject unauthenticated request."""
        response = await client.post("/api/teams", json=sample_team_data)
        assert response.status_code == 401


@pytest.mark.asyncio
class TestGetTeam:
    """Tests for GET /api/teams/{team_id}"""

    async def test_get_team_success(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should return team details."""
        response = await client.get(
            f"/api/teams/{created_team['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_team["id"]
        assert data["name"] == created_team["name"]
        assert "members" in data

    async def test_get_team_not_member(
        self, client: AsyncClient, created_team: dict
    ):
        """Should reject non-member access."""
        # Create a different user
        from app.models import User
        from app.core.security import get_password_hash, create_access_token
        from app.api.deps import get_db
        from app.main import app

        db_gen = app.dependency_overrides[get_db]()
        db = await db_gen.__anext__()

        other_user = User(
            email="other@example.com",
            name="Other User",
            hashed_password=get_password_hash("password123")
        )
        db.add(other_user)
        await db.commit()
        await db.refresh(other_user)
        other_token = create_access_token(data={"sub": str(other_user.id)})

        response = await client.get(
            f"/api/teams/{created_team['id']}",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert response.status_code == 403


@pytest.mark.asyncio
class TestUpdateTeam:
    """Tests for PUT /api/teams/{team_id}"""

    async def test_update_team_success(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should update team (owner)."""
        response = await client.put(
            f"/api/teams/{created_team['id']}",
            json={"name": "Updated Team", "church_name": "새교회"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Team"
        assert data["church_name"] == "새교회"

    async def test_update_team_partial(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should allow partial updates."""
        original_name = created_team["name"]
        response = await client.put(
            f"/api/teams/{created_team['id']}",
            json={"description": "New description"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "New description"
        assert data["name"] == original_name


@pytest.mark.asyncio
class TestDeleteTeam:
    """Tests for DELETE /api/teams/{team_id}"""

    async def test_delete_team_success(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should delete team (owner only)."""
        response = await client.delete(
            f"/api/teams/{created_team['id']}",
            headers=auth_headers
        )
        assert response.status_code == 200

        # Verify deletion
        get_response = await client.get(
            f"/api/teams/{created_team['id']}",
            headers=auth_headers
        )
        assert get_response.status_code == 403  # Not a member anymore


@pytest.mark.asyncio
class TestTeamInvites:
    """Tests for team invite endpoints."""

    async def test_create_invite(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should create team invite."""
        response = await client.post(
            f"/api/teams/{created_team['id']}/invites",
            json={"email": "newmember@example.com", "role": "member"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newmember@example.com"
        assert data["role"] == "member"
        assert data["status"] == "pending"

    async def test_create_invite_duplicate(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should reject duplicate pending invite."""
        # Create first invite
        await client.post(
            f"/api/teams/{created_team['id']}/invites",
            json={"email": "dup@example.com", "role": "member"},
            headers=auth_headers
        )

        # Try to create duplicate
        response = await client.post(
            f"/api/teams/{created_team['id']}/invites",
            json={"email": "dup@example.com", "role": "member"},
            headers=auth_headers
        )
        assert response.status_code == 400

    async def test_get_invites(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should list team invites."""
        # Create invite (use different email than test user to avoid "already a member" error)
        await client.post(
            f"/api/teams/{created_team['id']}/invites",
            json={"email": "invitee@example.com"},
            headers=auth_headers
        )

        response = await client.get(
            f"/api/teams/{created_team['id']}/invites",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1


@pytest.mark.asyncio
class TestServiceSchedules:
    """Tests for service schedule endpoints."""

    async def test_create_schedule(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should create service schedule."""
        response = await client.post(
            f"/api/teams/{created_team['id']}/schedules",
            json={
                "title": "주일 오전 예배",
                "service_type": "주일예배",
                "date": "2024-01-21T10:00:00",
                "location": "본당"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "주일 오전 예배"
        assert data["service_type"] == "주일예배"

    async def test_get_schedules(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should list team schedules."""
        # Create schedule
        await client.post(
            f"/api/teams/{created_team['id']}/schedules",
            json={
                "title": "Test Service",
                "service_type": "주일예배",
                "date": "2024-02-01T10:00:00"
            },
            headers=auth_headers
        )

        response = await client.get(
            f"/api/teams/{created_team['id']}/schedules",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    async def test_update_schedule(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should update schedule."""
        # Create schedule
        create_response = await client.post(
            f"/api/teams/{created_team['id']}/schedules",
            json={
                "title": "Original Title",
                "service_type": "주일예배",
                "date": "2024-02-01T10:00:00"
            },
            headers=auth_headers
        )
        schedule_id = create_response.json()["id"]

        # Update schedule
        response = await client.put(
            f"/api/teams/{created_team['id']}/schedules/{schedule_id}",
            json={"title": "Updated Title", "is_confirmed": True},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert data["is_confirmed"] is True

    async def test_delete_schedule(
        self, client: AsyncClient, created_team: dict, auth_headers: dict
    ):
        """Should delete schedule."""
        # Create schedule
        create_response = await client.post(
            f"/api/teams/{created_team['id']}/schedules",
            json={
                "title": "To Delete",
                "service_type": "주일예배",
                "date": "2024-02-01T10:00:00"
            },
            headers=auth_headers
        )
        schedule_id = create_response.json()["id"]

        # Delete schedule
        response = await client.delete(
            f"/api/teams/{created_team['id']}/schedules/{schedule_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
