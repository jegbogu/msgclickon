import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.db import Base


class EmailCampaignContact(Base):
    __tablename__ = "email_campaign_contact"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "email_campaign.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    contact_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "contact.id",
            ondelete="CASCADE",
        ),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )