"""
Pytest configuration and fixtures for backend tests.
"""
import asyncio
import pytest
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.main import app
from app.api.deps import get_db


# Test database URL - in-memory SQLite
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def test_engine():
    """Create a test database engine for each test function."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session with full isolation."""
    async_session = sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test HTTP client."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def sample_song_data() -> dict:
    """Sample song data for testing."""
    return {
        "title": "테스트 찬양",
        "title_en": "Test Song",
        "artist": "테스트 아티스트",
        "default_key": "G",
        "bpm": 72,
        "duration_sec": 300,
        "mood_tags": ["경배", "찬양"],
        "service_types": ["주일예배"],
        "season_tags": ["연중시기"],
        "difficulty": "medium",
        "min_instruments": ["piano"],
        "scripture_refs": ["시편 100:1-2"]
    }


@pytest.fixture
def sample_chordpro() -> str:
    """Sample ChordPro content for testing."""
    return """{title: 테스트 찬양}
{artist: 테스트 아티스트}
{key: G}

{comment: Verse 1}
[G]주를 찬양합니다 [D]할렐루야
[Em]영원하신 주의 [C]사랑

{comment: Chorus}
[G]높이 높이 [D]찬양해
[Em]예수 그리스도 [C]나의 [G]왕"""


@pytest.fixture
def sample_user_data() -> dict:
    """Sample user data for testing."""
    return {
        "email": "test@example.com",
        "name": "테스트 사용자",
        "password": "testpassword123"
    }


@pytest.fixture
def sample_setlist_data() -> dict:
    """Sample setlist data for testing."""
    return {
        "title": "주일예배 송리스트",
        "service_type": "주일예배",
        "sermon_topic": "하나님의 사랑",
        "sermon_scripture": "요한복음 3:16",
        "notes": "테스트 노트"
    }


@pytest.fixture
async def auth_headers(client: AsyncClient, sample_user_data: dict) -> dict:
    """Create a user and return auth headers."""
    from app.models import User
    from app.core.security import get_password_hash, create_access_token
    from app.api.deps import get_db

    # Get the overridden db session
    db_gen = app.dependency_overrides[get_db]()
    db = await db_gen.__anext__()

    # Create user directly in database
    user = User(
        email=sample_user_data["email"],
        name=sample_user_data["name"],
        hashed_password=get_password_hash(sample_user_data["password"])
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create access token
    token = create_access_token(data={"sub": str(user.id)})

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def created_song(client: AsyncClient, sample_song_data: dict, auth_headers: dict) -> dict:
    """Create a song and return its data."""
    response = await client.post("/api/songs", json=sample_song_data, headers=auth_headers)
    return response.json()


@pytest.fixture
async def created_setlist(client: AsyncClient, sample_setlist_data: dict, auth_headers: dict) -> dict:
    """Create a setlist and return its data."""
    response = await client.post("/api/setlists", json=sample_setlist_data, headers=auth_headers)
    assert response.status_code == 200, f"Failed to create setlist: {response.status_code} - {response.text}"
    return response.json()
