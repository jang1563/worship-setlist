"""
Pydantic schemas for Team API.
"""
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional
from enum import Enum


class TeamRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    LEADER = "leader"
    MEMBER = "member"


class InviteStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"


# Team Schemas
class TeamCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    church_name: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    default_service_type: str = Field("주일예배", max_length=50)
    timezone: str = Field("Asia/Seoul", max_length=50)


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    church_name: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    default_service_type: Optional[str] = Field(None, max_length=50)
    timezone: Optional[str] = Field(None, max_length=50)


class TeamMemberResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    user_email: str
    role: str
    instruments: list[str] = []
    joined_at: datetime

    class Config:
        from_attributes = True


class TeamResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    church_name: Optional[str]
    location: Optional[str]
    default_service_type: str
    timezone: str
    created_at: datetime
    updated_at: datetime
    member_count: int = 0

    class Config:
        from_attributes = True


class TeamDetailResponse(TeamResponse):
    members: list[TeamMemberResponse] = []


class TeamListResponse(BaseModel):
    teams: list[TeamResponse]
    total: int


# Team Member Schemas
class TeamMemberUpdate(BaseModel):
    role: Optional[TeamRole] = None
    instruments: Optional[list[str]] = None


class TeamMemberInstrumentsUpdate(BaseModel):
    instruments: list[str] = Field(default_factory=list)


# Team Invite Schemas
class TeamInviteCreate(BaseModel):
    email: EmailStr
    role: TeamRole = TeamRole.MEMBER
    message: Optional[str] = Field(None, max_length=500)


class TeamInviteResponse(BaseModel):
    id: int
    team_id: int
    team_name: str
    email: str
    role: str
    status: str
    message: Optional[str]
    invited_by_name: str
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class TeamInviteListResponse(BaseModel):
    invites: list[TeamInviteResponse]
    total: int


# Service Schedule Schemas
class ServiceScheduleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    service_type: str = Field(..., min_length=1, max_length=50)
    date: datetime
    description: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=255)
    setlist_id: Optional[int] = None


class ServiceScheduleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    service_type: Optional[str] = Field(None, min_length=1, max_length=50)
    date: Optional[datetime] = None
    description: Optional[str] = Field(None, max_length=1000)
    location: Optional[str] = Field(None, max_length=255)
    setlist_id: Optional[int] = None
    is_confirmed: Optional[bool] = None


class ServiceAssignmentCreate(BaseModel):
    user_id: int
    position: str = Field(..., min_length=1, max_length=50)
    notes: Optional[str] = Field(None, max_length=500)


class ServiceAssignmentResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    position: str
    notes: Optional[str]
    is_confirmed: bool
    confirmed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ServiceScheduleResponse(BaseModel):
    id: int
    team_id: int
    setlist_id: Optional[int]
    title: str
    service_type: str
    date: datetime
    description: Optional[str]
    location: Optional[str]
    is_confirmed: bool
    assignments: list[ServiceAssignmentResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ServiceScheduleListResponse(BaseModel):
    schedules: list[ServiceScheduleResponse]
    total: int


# Practice Status Schemas
class PracticeStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    READY = "ready"


class PracticeStatusCreate(BaseModel):
    setlist_song_id: int
    status: PracticeStatus = PracticeStatus.NOT_STARTED
    assigned_to: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)


class PracticeStatusUpdate(BaseModel):
    status: Optional[PracticeStatus] = None
    assigned_to: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)


class PracticeStatusResponse(BaseModel):
    id: int
    setlist_id: int
    setlist_song_id: int
    status: str
    assigned_to: Optional[int]
    assigned_name: Optional[str]
    notes: Optional[str]
    updated_at: datetime

    class Config:
        from_attributes = True


class PracticeStatusListResponse(BaseModel):
    statuses: list[PracticeStatusResponse]
    total: int
    ready_count: int
    in_progress_count: int


class SetlistReadinessSummary(BaseModel):
    setlist_id: int
    total_songs: int
    ready_count: int
    in_progress_count: int
    not_started_count: int
    ready_percentage: float
    is_fully_ready: bool
