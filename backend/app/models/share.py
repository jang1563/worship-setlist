from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ShareToken(Base):
    """
    Share tokens for sharing setlists via unique links.
    Replaces the previous in-memory storage for persistence.
    """
    __tablename__ = "share_tokens"
    __table_args__ = (
        Index("ix_share_tokens_token", "token", unique=True),
        Index("ix_share_tokens_setlist_id", "setlist_id"),
        Index("ix_share_tokens_expires_at", "expires_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, nullable=False)
    setlist_id = Column(Integer, ForeignKey("setlists.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    setlist = relationship("Setlist", backref="share_tokens")
