from app.core.db import Base
from sqlalchemy import Column, String, Boolean, DateTime
from datetime import datetime
import uuid

class user(Base):
    __tablename__ = "users"
    
    id = Column(String(50), primary_key=True, default=lambda: str(uuid.uuid4()) )
    name = Column(String(100),nullable=False)
    email = Column(String(150), nullable=False, unique=True)
    password_hash = Column(String(225), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default =datetime.utcnow)