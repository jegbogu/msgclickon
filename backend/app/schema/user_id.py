from pydantic import BaseModel, EmailStr, Field, field_validator

class UserIdUsage(BaseModel):
    user_id: str = Field(min_length=12)
    

    