from pydantic import BaseModel, EmailStr, Field

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)