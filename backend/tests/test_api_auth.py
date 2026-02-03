"""
API tests for authentication endpoints.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestRegister:
    """Tests for POST /api/auth/register"""

    async def test_register_success(self, client: AsyncClient, sample_user_data: dict):
        """Should register new user successfully."""
        response = await client.post("/api/auth/register", json=sample_user_data)
        assert response.status_code == 201
        data = response.json()
        assert "user" in data
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == sample_user_data["email"]
        assert data["user"]["name"] == sample_user_data["name"]

    async def test_register_duplicate_email(self, client: AsyncClient, sample_user_data: dict):
        """Should reject duplicate email."""
        # First registration
        await client.post("/api/auth/register", json=sample_user_data)

        # Second registration with same email
        response = await client.post("/api/auth/register", json=sample_user_data)
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    async def test_register_missing_email(self, client: AsyncClient):
        """Should reject missing email."""
        response = await client.post("/api/auth/register", json={
            "name": "Test User",
            "password": "testpass123"
        })
        assert response.status_code == 422  # Validation error

    async def test_register_missing_password(self, client: AsyncClient):
        """Should reject missing password."""
        response = await client.post("/api/auth/register", json={
            "email": "test@example.com",
            "name": "Test User"
        })
        assert response.status_code == 422

    async def test_register_invalid_email(self, client: AsyncClient):
        """Should reject invalid email format."""
        response = await client.post("/api/auth/register", json={
            "email": "not-an-email",
            "name": "Test User",
            "password": "testpass123"
        })
        assert response.status_code == 422


@pytest.mark.asyncio
class TestLogin:
    """Tests for POST /api/auth/login"""

    async def test_login_success(self, client: AsyncClient, sample_user_data: dict):
        """Should login with valid credentials."""
        # Register first
        await client.post("/api/auth/register", json=sample_user_data)

        # Login
        response = await client.post("/api/auth/login", data={
            "username": sample_user_data["email"],
            "password": sample_user_data["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient, sample_user_data: dict):
        """Should reject wrong password."""
        # Register
        await client.post("/api/auth/register", json=sample_user_data)

        # Login with wrong password
        response = await client.post("/api/auth/login", data={
            "username": sample_user_data["email"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    async def test_login_nonexistent_user(self, client: AsyncClient):
        """Should reject nonexistent user."""
        response = await client.post("/api/auth/login", data={
            "username": "nonexistent@example.com",
            "password": "testpass123"
        })
        assert response.status_code == 401

    async def test_login_empty_password(self, client: AsyncClient, sample_user_data: dict):
        """Should reject empty password with validation error."""
        await client.post("/api/auth/register", json=sample_user_data)

        response = await client.post("/api/auth/login", data={
            "username": sample_user_data["email"],
            "password": ""
        })
        # 422 because FastAPI validates OAuth2 form data before endpoint logic
        assert response.status_code == 422


@pytest.mark.asyncio
class TestGetMe:
    """Tests for GET /api/auth/me"""

    async def test_get_me_success(self, client: AsyncClient, sample_user_data: dict):
        """Should return current user info."""
        # Register and get token
        register_response = await client.post("/api/auth/register", json=sample_user_data)
        token = register_response.json()["access_token"]

        # Get current user
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == sample_user_data["email"]
        assert data["name"] == sample_user_data["name"]

    async def test_get_me_no_token(self, client: AsyncClient):
        """Should reject request without token."""
        response = await client.get("/api/auth/me")
        assert response.status_code == 401

    async def test_get_me_invalid_token(self, client: AsyncClient):
        """Should reject invalid token."""
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401

    async def test_get_me_expired_token(self, client: AsyncClient):
        """Should reject malformed token."""
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.xyz"}
        )
        assert response.status_code == 401
