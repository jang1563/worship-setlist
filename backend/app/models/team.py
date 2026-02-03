"""
Team models for collaboration features.
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class TeamRole(str, enum.Enum):
    """Team member roles."""
    OWNER = "owner"
    ADMIN = "admin"
    LEADER = "leader"  # Worship leader
    MEMBER = "member"


class InviteStatus(str, enum.Enum):
    """Team invite status."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


class Team(Base):
    """A worship team or church group."""
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Church/organization info
    church_name = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)

    # Settings
    default_service_type = Column(String(50), default="주일예배")
    timezone = Column(String(50), default="Asia/Seoul")

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    invites = relationship("TeamInvite", back_populates="team", cascade="all, delete-orphan")
    schedules = relationship("ServiceSchedule", back_populates="team", cascade="all, delete-orphan")


class TeamMember(Base):
    """Team membership."""
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    role = Column(String(20), default=TeamRole.MEMBER.value)

    # Instruments (comma-separated list: "피아노,기타,보컬")
    instruments = Column(String(500), nullable=True)

    # Member-specific settings
    notifications_enabled = Column(Boolean, default=True)

    # Timestamps
    joined_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")

    @property
    def instruments_list(self) -> list[str]:
        """Get instruments as a list."""
        if not self.instruments:
            return []
        return [i.strip() for i in self.instruments.split(",") if i.strip()]

    @instruments_list.setter
    def instruments_list(self, value: list[str]):
        """Set instruments from a list."""
        self.instruments = ",".join(value) if value else None


class TeamInvite(Base):
    """Team invitation."""
    __tablename__ = "team_invites"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    invited_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Invite details
    email = Column(String(255), nullable=False)
    role = Column(String(20), default=TeamRole.MEMBER.value)
    token = Column(String(100), nullable=False, unique=True, index=True)
    status = Column(String(20), default=InviteStatus.PENDING.value)

    # Message
    message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=False)
    responded_at = Column(DateTime, nullable=True)

    # Relationships
    team = relationship("Team", back_populates="invites")
    invited_by = relationship("User")


class ServiceSchedule(Base):
    """Scheduled worship service."""
    __tablename__ = "service_schedules"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    setlist_id = Column(Integer, ForeignKey("setlists.id"), nullable=True)

    # Service details
    title = Column(String(255), nullable=False)
    service_type = Column(String(50), nullable=False)
    date = Column(DateTime, nullable=False)
    description = Column(Text, nullable=True)

    # Location
    location = Column(String(255), nullable=True)

    # Status
    is_confirmed = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    team = relationship("Team", back_populates="schedules")
    setlist = relationship("Setlist")
    assignments = relationship("ServiceAssignment", back_populates="schedule", cascade="all, delete-orphan")


class ServiceAssignment(Base):
    """Team member assignment to a service."""
    __tablename__ = "service_assignments"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("service_schedules.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Role in this service
    position = Column(String(50), nullable=False)  # "worship_leader", "vocalist", "pianist", etc.
    notes = Column(Text, nullable=True)

    # Confirmation
    is_confirmed = Column(Boolean, default=False)
    confirmed_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    schedule = relationship("ServiceSchedule", back_populates="assignments")
    user = relationship("User")


class PracticeStatusEnum(str, enum.Enum):
    """Practice status for a song in a setlist."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    READY = "ready"


class SetlistPracticeStatus(Base):
    """Track practice readiness for each song in a setlist."""
    __tablename__ = "setlist_practice_status"

    id = Column(Integer, primary_key=True, index=True)
    setlist_id = Column(Integer, ForeignKey("setlists.id"), nullable=False)
    setlist_song_id = Column(Integer, ForeignKey("setlist_songs.id"), nullable=False)

    # Practice status
    status = Column(String(20), default=PracticeStatusEnum.NOT_STARTED.value)

    # Assigned team member (optional)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Notes for this song's practice
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    setlist = relationship("Setlist")
    setlist_song = relationship("SetlistSong")
    assignee = relationship("User")
