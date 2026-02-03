"""
API routes for team management.
"""
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.models import User
from app.models.team import (
    Team, TeamMember, TeamInvite, ServiceSchedule, ServiceAssignment,
    TeamRole, InviteStatus, SetlistPracticeStatus, PracticeStatusEnum
)
from app.models.setlist import Setlist, SetlistSong
from app.schemas.team import (
    TeamCreate, TeamUpdate, TeamResponse, TeamDetailResponse, TeamListResponse,
    TeamMemberResponse, TeamMemberUpdate, TeamMemberInstrumentsUpdate,
    TeamInviteCreate, TeamInviteResponse, TeamInviteListResponse,
    ServiceScheduleCreate, ServiceScheduleUpdate, ServiceScheduleResponse, ServiceScheduleListResponse,
    ServiceAssignmentCreate, ServiceAssignmentResponse,
    PracticeStatusCreate, PracticeStatusUpdate, PracticeStatusResponse,
    PracticeStatusListResponse, SetlistReadinessSummary, PracticeStatus
)

router = APIRouter(prefix="/teams", tags=["teams"])


# Helper functions
async def get_team_member(
    db: AsyncSession, team_id: int, user_id: int
) -> TeamMember | None:
    """Get team membership for a user."""
    result = await db.execute(
        select(TeamMember).where(
            TeamMember.team_id == team_id,
            TeamMember.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def require_team_role(
    db: AsyncSession, team_id: int, user_id: int, min_roles: list[str]
) -> TeamMember:
    """Require user to have one of the specified roles in the team."""
    member = await get_team_member(db, team_id, user_id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this team")
    if member.role not in min_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return member


def _team_to_response(team: Team, member_count: int = 0) -> TeamResponse:
    return TeamResponse(
        id=team.id,
        name=team.name,
        description=team.description,
        church_name=team.church_name,
        location=team.location,
        default_service_type=team.default_service_type,
        timezone=team.timezone,
        created_at=team.created_at,
        updated_at=team.updated_at,
        member_count=member_count
    )


def _member_to_response(member: TeamMember) -> TeamMemberResponse:
    return TeamMemberResponse(
        id=member.id,
        user_id=member.user_id,
        user_name=member.user.name,
        user_email=member.user.email,
        role=member.role,
        instruments=member.instruments_list,
        joined_at=member.joined_at
    )


# Team CRUD
@router.get("", response_model=TeamListResponse)
async def get_my_teams(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get teams the current user is a member of."""
    result = await db.execute(
        select(Team, func.count(TeamMember.id).label("member_count"))
        .join(TeamMember, Team.id == TeamMember.team_id)
        .where(TeamMember.user_id == current_user.id)
        .group_by(Team.id)
        .order_by(Team.name)
    )
    rows = result.all()

    teams = [_team_to_response(team, member_count) for team, member_count in rows]
    return TeamListResponse(teams=teams, total=len(teams))


@router.post("", response_model=TeamDetailResponse)
async def create_team(
    team_data: TeamCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new team. The creator becomes the owner."""
    team = Team(
        name=team_data.name,
        description=team_data.description,
        church_name=team_data.church_name,
        location=team_data.location,
        default_service_type=team_data.default_service_type,
        timezone=team_data.timezone
    )
    db.add(team)
    await db.flush()

    # Add creator as owner
    member = TeamMember(
        team_id=team.id,
        user_id=current_user.id,
        role=TeamRole.OWNER.value
    )
    db.add(member)
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(Team.id == team.id)
    )
    team = result.scalar_one()

    return TeamDetailResponse(
        **_team_to_response(team, len(team.members)).model_dump(),
        members=[_member_to_response(m) for m in team.members]
    )


@router.get("/{team_id}", response_model=TeamDetailResponse)
async def get_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get team details. Must be a member."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value, TeamRole.MEMBER.value]
    )

    result = await db.execute(
        select(Team)
        .options(selectinload(Team.members).selectinload(TeamMember.user))
        .where(Team.id == team_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    return TeamDetailResponse(
        **_team_to_response(team, len(team.members)).model_dump(),
        members=[_member_to_response(m) for m in team.members]
    )


@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update team. Requires owner or admin role."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value]
    )

    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    update_data = team_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(team, field, value)

    await db.commit()
    await db.refresh(team)

    # Get member count
    count_result = await db.execute(
        select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team_id)
    )
    member_count = count_result.scalar() or 0

    return _team_to_response(team, member_count)


@router.delete("/{team_id}")
async def delete_team(
    team_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete team. Only owner can delete."""
    await require_team_role(db, team_id, current_user.id, [TeamRole.OWNER.value])

    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    await db.delete(team)
    await db.commit()
    return {"message": "Team deleted successfully"}


# Team Members
@router.put("/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_member(
    team_id: int,
    user_id: int,
    member_data: TeamMemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a member's role and/or instruments. Requires owner or admin role for role changes."""
    # Check if user is updating their own instruments (allowed) or admin action
    is_self = user_id == current_user.id
    current_member = await get_team_member(db, team_id, current_user.id)
    if not current_member:
        raise HTTPException(status_code=403, detail="Not a member of this team")

    is_admin = current_member.role in [TeamRole.OWNER.value, TeamRole.ADMIN.value]

    # Role changes require admin/owner, instruments can be self-updated
    if member_data.role is not None and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can change roles")

    # Get target member
    result = await db.execute(
        select(TeamMember)
        .options(selectinload(TeamMember.user))
        .where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Only admin can update others (except self-updating instruments)
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Handle role update
    if member_data.role is not None:
        # Only owner can change owner role or promote to owner
        if target_member.role == TeamRole.OWNER.value or member_data.role == TeamRole.OWNER:
            if current_member.role != TeamRole.OWNER.value:
                raise HTTPException(status_code=403, detail="Only owner can transfer ownership")
        target_member.role = member_data.role.value

    # Handle instruments update
    if member_data.instruments is not None:
        target_member.instruments = ",".join(member_data.instruments) if member_data.instruments else None

    await db.commit()

    return _member_to_response(target_member)


@router.put("/{team_id}/members/{user_id}/instruments", response_model=TeamMemberResponse)
async def update_member_instruments(
    team_id: int,
    user_id: int,
    instruments_data: TeamMemberInstrumentsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a member's instruments. Users can update their own, or admins can update anyone."""
    is_self = user_id == current_user.id
    current_member = await get_team_member(db, team_id, current_user.id)
    if not current_member:
        raise HTTPException(status_code=403, detail="Not a member of this team")

    is_admin = current_member.role in [TeamRole.OWNER.value, TeamRole.ADMIN.value]

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get target member
    result = await db.execute(
        select(TeamMember)
        .options(selectinload(TeamMember.user))
        .where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    target_member.instruments = ",".join(instruments_data.instruments) if instruments_data.instruments else None
    await db.commit()

    return _member_to_response(target_member)


@router.delete("/{team_id}/members/{user_id}")
async def remove_member(
    team_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from the team. Requires owner/admin or self-removal."""
    current_member = await get_team_member(db, team_id, current_user.id)
    if not current_member:
        raise HTTPException(status_code=403, detail="Not a member of this team")

    # Self-removal or admin action
    is_self = user_id == current_user.id
    is_admin = current_member.role in [TeamRole.OWNER.value, TeamRole.ADMIN.value]

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Get target member
    result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    target_member = result.scalar_one_or_none()
    if not target_member:
        raise HTTPException(status_code=404, detail="Member not found")

    # Owner cannot leave (must transfer ownership first)
    if target_member.role == TeamRole.OWNER.value:
        raise HTTPException(status_code=400, detail="Owner cannot leave. Transfer ownership first.")

    await db.delete(target_member)
    await db.commit()
    return {"message": "Member removed successfully"}


# Team Invites
@router.post("/{team_id}/invites", response_model=TeamInviteResponse)
async def create_invite(
    team_id: int,
    invite_data: TeamInviteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a team invite. Requires owner, admin, or leader role."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    # Get team
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check if user is already a member
    existing_user = await db.execute(
        select(User).where(User.email == invite_data.email)
    )
    user = existing_user.scalar_one_or_none()
    if user:
        existing_member = await get_team_member(db, team_id, user.id)
        if existing_member:
            raise HTTPException(status_code=400, detail="User is already a team member")

    # Check for pending invite
    existing_invite = await db.execute(
        select(TeamInvite).where(
            TeamInvite.team_id == team_id,
            TeamInvite.email == invite_data.email,
            TeamInvite.status == InviteStatus.PENDING.value
        )
    )
    if existing_invite.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Pending invite already exists for this email")

    # Create invite
    invite = TeamInvite(
        team_id=team_id,
        invited_by_id=current_user.id,
        email=invite_data.email,
        role=invite_data.role.value,
        message=invite_data.message,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)

    return TeamInviteResponse(
        id=invite.id,
        team_id=invite.team_id,
        team_name=team.name,
        email=invite.email,
        role=invite.role,
        status=invite.status,
        message=invite.message,
        invited_by_name=current_user.name,
        created_at=invite.created_at,
        expires_at=invite.expires_at
    )


@router.get("/{team_id}/invites", response_model=TeamInviteListResponse)
async def get_team_invites(
    team_id: int,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get team invites. Requires owner, admin, or leader role."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    query = select(TeamInvite).options(
        selectinload(TeamInvite.invited_by)
    ).where(TeamInvite.team_id == team_id)

    if status:
        query = query.where(TeamInvite.status == status)

    query = query.order_by(TeamInvite.created_at.desc())
    result = await db.execute(query)
    invites = result.scalars().all()

    return TeamInviteListResponse(
        invites=[
            TeamInviteResponse(
                id=inv.id,
                team_id=inv.team_id,
                team_name=team.name,
                email=inv.email,
                role=inv.role,
                status=inv.status,
                message=inv.message,
                invited_by_name=inv.invited_by.name,
                created_at=inv.created_at,
                expires_at=inv.expires_at
            )
            for inv in invites
        ],
        total=len(invites)
    )


@router.delete("/{team_id}/invites/{invite_id}")
async def cancel_invite(
    team_id: int,
    invite_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a pending invite."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    result = await db.execute(
        select(TeamInvite).where(
            TeamInvite.id == invite_id,
            TeamInvite.team_id == team_id
        )
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.status != InviteStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Only pending invites can be cancelled")

    await db.delete(invite)
    await db.commit()
    return {"message": "Invite cancelled"}


@router.post("/invites/{token}/accept")
async def accept_invite(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept a team invite."""
    result = await db.execute(
        select(TeamInvite)
        .options(selectinload(TeamInvite.team))
        .where(TeamInvite.token == token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.status != InviteStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Invite is no longer valid")

    if datetime.utcnow() > invite.expires_at:
        invite.status = InviteStatus.EXPIRED.value
        await db.commit()
        raise HTTPException(status_code=400, detail="Invite has expired")

    # Check email matches (case-insensitive)
    if invite.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="This invite is for a different email address")

    # Check if already a member
    existing = await get_team_member(db, invite.team_id, current_user.id)
    if existing:
        invite.status = InviteStatus.ACCEPTED.value
        invite.responded_at = datetime.utcnow()
        await db.commit()
        raise HTTPException(status_code=400, detail="You are already a member of this team")

    # Add to team
    member = TeamMember(
        team_id=invite.team_id,
        user_id=current_user.id,
        role=invite.role
    )
    db.add(member)

    invite.status = InviteStatus.ACCEPTED.value
    invite.responded_at = datetime.utcnow()
    await db.commit()

    return {"message": f"Successfully joined {invite.team.name}"}


@router.post("/invites/{token}/decline")
async def decline_invite(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Decline a team invite."""
    result = await db.execute(
        select(TeamInvite).where(TeamInvite.token == token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")

    if invite.status != InviteStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Invite is no longer valid")

    if invite.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=403, detail="This invite is for a different email address")

    invite.status = InviteStatus.DECLINED.value
    invite.responded_at = datetime.utcnow()
    await db.commit()

    return {"message": "Invite declined"}


# Service Schedules
@router.get("/{team_id}/schedules", response_model=ServiceScheduleListResponse)
async def get_schedules(
    team_id: int,
    upcoming_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get team service schedules."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value, TeamRole.MEMBER.value]
    )

    query = select(ServiceSchedule).options(
        selectinload(ServiceSchedule.assignments).selectinload(ServiceAssignment.user)
    ).where(ServiceSchedule.team_id == team_id)

    if upcoming_only:
        query = query.where(ServiceSchedule.date >= datetime.utcnow())

    query = query.order_by(ServiceSchedule.date)
    result = await db.execute(query)
    schedules = result.scalars().unique().all()

    return ServiceScheduleListResponse(
        schedules=[
            ServiceScheduleResponse(
                id=s.id,
                team_id=s.team_id,
                setlist_id=s.setlist_id,
                title=s.title,
                service_type=s.service_type,
                date=s.date,
                description=s.description,
                location=s.location,
                is_confirmed=s.is_confirmed,
                assignments=[
                    ServiceAssignmentResponse(
                        id=a.id,
                        user_id=a.user_id,
                        user_name=a.user.name,
                        position=a.position,
                        notes=a.notes,
                        is_confirmed=a.is_confirmed,
                        confirmed_at=a.confirmed_at
                    )
                    for a in s.assignments
                ],
                created_at=s.created_at,
                updated_at=s.updated_at
            )
            for s in schedules
        ],
        total=len(schedules)
    )


@router.post("/{team_id}/schedules", response_model=ServiceScheduleResponse)
async def create_schedule(
    team_id: int,
    schedule_data: ServiceScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a service schedule. Requires leader or higher role."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    schedule = ServiceSchedule(
        team_id=team_id,
        title=schedule_data.title,
        service_type=schedule_data.service_type,
        date=schedule_data.date,
        description=schedule_data.description,
        location=schedule_data.location,
        setlist_id=schedule_data.setlist_id
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    return ServiceScheduleResponse(
        id=schedule.id,
        team_id=schedule.team_id,
        setlist_id=schedule.setlist_id,
        title=schedule.title,
        service_type=schedule.service_type,
        date=schedule.date,
        description=schedule.description,
        location=schedule.location,
        is_confirmed=schedule.is_confirmed,
        assignments=[],
        created_at=schedule.created_at,
        updated_at=schedule.updated_at
    )


@router.put("/{team_id}/schedules/{schedule_id}", response_model=ServiceScheduleResponse)
async def update_schedule(
    team_id: int,
    schedule_id: int,
    schedule_data: ServiceScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a service schedule."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    result = await db.execute(
        select(ServiceSchedule)
        .options(selectinload(ServiceSchedule.assignments).selectinload(ServiceAssignment.user))
        .where(ServiceSchedule.id == schedule_id, ServiceSchedule.team_id == team_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    update_data = schedule_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(schedule, field, value)

    await db.commit()

    # Reload with relationships to get fresh data
    result = await db.execute(
        select(ServiceSchedule)
        .options(selectinload(ServiceSchedule.assignments).selectinload(ServiceAssignment.user))
        .where(ServiceSchedule.id == schedule_id)
    )
    schedule = result.scalar_one()

    return ServiceScheduleResponse(
        id=schedule.id,
        team_id=schedule.team_id,
        setlist_id=schedule.setlist_id,
        title=schedule.title,
        service_type=schedule.service_type,
        date=schedule.date,
        description=schedule.description,
        location=schedule.location,
        is_confirmed=schedule.is_confirmed,
        assignments=[
            ServiceAssignmentResponse(
                id=a.id,
                user_id=a.user_id,
                user_name=a.user.name,
                position=a.position,
                notes=a.notes,
                is_confirmed=a.is_confirmed,
                confirmed_at=a.confirmed_at
            )
            for a in schedule.assignments
        ],
        created_at=schedule.created_at,
        updated_at=schedule.updated_at
    )


@router.delete("/{team_id}/schedules/{schedule_id}")
async def delete_schedule(
    team_id: int,
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a service schedule."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    result = await db.execute(
        select(ServiceSchedule).where(
            ServiceSchedule.id == schedule_id,
            ServiceSchedule.team_id == team_id
        )
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await db.delete(schedule)
    await db.commit()
    return {"message": "Schedule deleted"}


# Service Assignments
@router.post("/{team_id}/schedules/{schedule_id}/assignments", response_model=ServiceAssignmentResponse)
async def create_assignment(
    team_id: int,
    schedule_id: int,
    assignment_data: ServiceAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a member to a service."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    # Verify schedule exists
    result = await db.execute(
        select(ServiceSchedule).where(
            ServiceSchedule.id == schedule_id,
            ServiceSchedule.team_id == team_id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Verify user is a team member
    member = await get_team_member(db, team_id, assignment_data.user_id)
    if not member:
        raise HTTPException(status_code=400, detail="User is not a team member")

    # Get user
    user_result = await db.execute(select(User).where(User.id == assignment_data.user_id))
    user = user_result.scalar_one()

    assignment = ServiceAssignment(
        schedule_id=schedule_id,
        user_id=assignment_data.user_id,
        position=assignment_data.position,
        notes=assignment_data.notes
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return ServiceAssignmentResponse(
        id=assignment.id,
        user_id=assignment.user_id,
        user_name=user.name,
        position=assignment.position,
        notes=assignment.notes,
        is_confirmed=assignment.is_confirmed,
        confirmed_at=assignment.confirmed_at
    )


@router.delete("/{team_id}/schedules/{schedule_id}/assignments/{assignment_id}")
async def remove_assignment(
    team_id: int,
    schedule_id: int,
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from a service assignment."""
    await require_team_role(
        db, team_id, current_user.id,
        [TeamRole.OWNER.value, TeamRole.ADMIN.value, TeamRole.LEADER.value]
    )

    result = await db.execute(
        select(ServiceAssignment)
        .join(ServiceSchedule)
        .where(
            ServiceAssignment.id == assignment_id,
            ServiceSchedule.id == schedule_id,
            ServiceSchedule.team_id == team_id
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()
    return {"message": "Assignment removed"}


@router.post("/{team_id}/schedules/{schedule_id}/assignments/{assignment_id}/confirm")
async def confirm_assignment(
    team_id: int,
    schedule_id: int,
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Confirm own assignment to a service."""
    result = await db.execute(
        select(ServiceAssignment)
        .join(ServiceSchedule)
        .where(
            ServiceAssignment.id == assignment_id,
            ServiceSchedule.id == schedule_id,
            ServiceSchedule.team_id == team_id,
            ServiceAssignment.user_id == current_user.id
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.is_confirmed = True
    assignment.confirmed_at = datetime.utcnow()
    await db.commit()

    return {"message": "Assignment confirmed"}


# Practice Status Management
@router.get("/setlists/{setlist_id}/practice-status", response_model=PracticeStatusListResponse)
async def get_practice_statuses(
    setlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get practice statuses for all songs in a setlist."""
    # Verify setlist exists and user has access
    setlist_result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs))
        .where(Setlist.id == setlist_id)
    )
    setlist = setlist_result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    # Get practice statuses
    result = await db.execute(
        select(SetlistPracticeStatus)
        .options(selectinload(SetlistPracticeStatus.assignee))
        .where(SetlistPracticeStatus.setlist_id == setlist_id)
    )
    statuses = result.scalars().all()

    ready_count = sum(1 for s in statuses if s.status == PracticeStatusEnum.READY.value)
    in_progress_count = sum(1 for s in statuses if s.status == PracticeStatusEnum.IN_PROGRESS.value)

    return PracticeStatusListResponse(
        statuses=[
            PracticeStatusResponse(
                id=s.id,
                setlist_id=s.setlist_id,
                setlist_song_id=s.setlist_song_id,
                status=s.status,
                assigned_to=s.assigned_to,
                assigned_name=s.assignee.name if s.assignee else None,
                notes=s.notes,
                updated_at=s.updated_at
            )
            for s in statuses
        ],
        total=len(statuses),
        ready_count=ready_count,
        in_progress_count=in_progress_count
    )


@router.put("/setlists/{setlist_id}/practice-status/{setlist_song_id}", response_model=PracticeStatusResponse)
async def update_practice_status(
    setlist_id: int,
    setlist_song_id: int,
    status_data: PracticeStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update practice status for a song. Creates if not exists."""
    # Verify setlist song exists
    song_result = await db.execute(
        select(SetlistSong).where(
            SetlistSong.id == setlist_song_id,
            SetlistSong.setlist_id == setlist_id
        )
    )
    if not song_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Setlist song not found")

    # Get or create practice status
    result = await db.execute(
        select(SetlistPracticeStatus).where(
            SetlistPracticeStatus.setlist_id == setlist_id,
            SetlistPracticeStatus.setlist_song_id == setlist_song_id
        )
    )
    practice_status = result.scalar_one_or_none()

    if not practice_status:
        # Create new
        practice_status = SetlistPracticeStatus(
            setlist_id=setlist_id,
            setlist_song_id=setlist_song_id
        )
        db.add(practice_status)

    # Update fields
    if status_data.status is not None:
        practice_status.status = status_data.status.value
    if status_data.assigned_to is not None:
        practice_status.assigned_to = status_data.assigned_to if status_data.assigned_to > 0 else None
    if status_data.notes is not None:
        practice_status.notes = status_data.notes if status_data.notes else None

    await db.commit()

    # Reload with assignee
    await db.refresh(practice_status)
    if practice_status.assigned_to:
        assignee_result = await db.execute(
            select(User).where(User.id == practice_status.assigned_to)
        )
        assignee = assignee_result.scalar_one_or_none()
    else:
        assignee = None

    return PracticeStatusResponse(
        id=practice_status.id,
        setlist_id=practice_status.setlist_id,
        setlist_song_id=practice_status.setlist_song_id,
        status=practice_status.status,
        assigned_to=practice_status.assigned_to,
        assigned_name=assignee.name if assignee else None,
        notes=practice_status.notes,
        updated_at=practice_status.updated_at
    )


@router.post("/setlists/{setlist_id}/practice-status/bulk", response_model=PracticeStatusListResponse)
async def bulk_update_practice_status(
    setlist_id: int,
    statuses: list[PracticeStatusCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bulk update/create practice statuses for multiple songs."""
    # Verify setlist exists
    setlist_result = await db.execute(select(Setlist).where(Setlist.id == setlist_id))
    if not setlist_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Setlist not found")

    updated_statuses = []
    for status_data in statuses:
        # Get or create
        result = await db.execute(
            select(SetlistPracticeStatus).where(
                SetlistPracticeStatus.setlist_id == setlist_id,
                SetlistPracticeStatus.setlist_song_id == status_data.setlist_song_id
            )
        )
        practice_status = result.scalar_one_or_none()

        if not practice_status:
            practice_status = SetlistPracticeStatus(
                setlist_id=setlist_id,
                setlist_song_id=status_data.setlist_song_id
            )
            db.add(practice_status)

        practice_status.status = status_data.status.value
        practice_status.assigned_to = status_data.assigned_to
        practice_status.notes = status_data.notes
        updated_statuses.append(practice_status)

    await db.commit()

    # Reload all with assignees
    result = await db.execute(
        select(SetlistPracticeStatus)
        .options(selectinload(SetlistPracticeStatus.assignee))
        .where(SetlistPracticeStatus.setlist_id == setlist_id)
    )
    all_statuses = result.scalars().all()

    ready_count = sum(1 for s in all_statuses if s.status == PracticeStatusEnum.READY.value)
    in_progress_count = sum(1 for s in all_statuses if s.status == PracticeStatusEnum.IN_PROGRESS.value)

    return PracticeStatusListResponse(
        statuses=[
            PracticeStatusResponse(
                id=s.id,
                setlist_id=s.setlist_id,
                setlist_song_id=s.setlist_song_id,
                status=s.status,
                assigned_to=s.assigned_to,
                assigned_name=s.assignee.name if s.assignee else None,
                notes=s.notes,
                updated_at=s.updated_at
            )
            for s in all_statuses
        ],
        total=len(all_statuses),
        ready_count=ready_count,
        in_progress_count=in_progress_count
    )


@router.get("/setlists/{setlist_id}/readiness", response_model=SetlistReadinessSummary)
async def get_setlist_readiness(
    setlist_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall readiness summary for a setlist."""
    # Get setlist with songs
    setlist_result = await db.execute(
        select(Setlist)
        .options(selectinload(Setlist.songs))
        .where(Setlist.id == setlist_id)
    )
    setlist = setlist_result.scalar_one_or_none()
    if not setlist:
        raise HTTPException(status_code=404, detail="Setlist not found")

    total_songs = len(setlist.songs)

    # Get practice statuses
    result = await db.execute(
        select(SetlistPracticeStatus)
        .where(SetlistPracticeStatus.setlist_id == setlist_id)
    )
    statuses = result.scalars().all()

    ready_count = sum(1 for s in statuses if s.status == PracticeStatusEnum.READY.value)
    in_progress_count = sum(1 for s in statuses if s.status == PracticeStatusEnum.IN_PROGRESS.value)
    not_started_count = total_songs - ready_count - in_progress_count

    return SetlistReadinessSummary(
        setlist_id=setlist_id,
        total_songs=total_songs,
        ready_count=ready_count,
        in_progress_count=in_progress_count,
        not_started_count=not_started_count,
        ready_percentage=(ready_count / total_songs * 100) if total_songs > 0 else 0.0,
        is_fully_ready=ready_count == total_songs and total_songs > 0
    )
