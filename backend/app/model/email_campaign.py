import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Time,
    Integer,
    DateTime,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.db import Base


class EmailCampaign(Base):
    __tablename__ = "email_campaign"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    name = Column(
        String(255),
        nullable=False,
    )

    campaign_type = Column(
        String(50),
        nullable=False,
        default="birthday",
    )

    subject = Column(
        String(500),
        nullable=True,
    )

    content = Column(
        Text,
        nullable=False,
    )

    signature = Column(
        Text,
        nullable=True,
    )

    header_image_url = Column(
        Text,
        nullable=True,
    )

    footer_image_url = Column(
        Text,
        nullable=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="draft",
    )

    send_time = Column(
        Time,
        nullable=True,
    )

    timezone = Column(
        String(100),
        nullable=True,
        default="Africa/Johannesburg",
    )

    days_before_birthday = Column(
        Integer,
        nullable=False,
        default=0,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )