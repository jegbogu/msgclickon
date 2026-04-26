from sqlalchemy import Column,text,  String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.core.db import Base

class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    code_hash = Column(String, nullable=False)

    expires_at = Column(
    DateTime,
    nullable=False,
    server_default=text("NOW() + INTERVAL '5 minutes'")
    )

    attempts = Column(Integer, default=0)

    max_attempts = Column(Integer, default=5)

    created_at = Column(DateTime, server_default=func.now())