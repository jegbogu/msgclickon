from pydantic import BaseModel, EmailStr, Field, field_validator

class LoginRequest(BaseModel):
    
    email: EmailStr = Field(min_length=6)
    password: str = Field(min_length=6)
    

    @field_validator( "email", "password",  mode="before")
    @classmethod
    def trim_strings(cls, v: str):
        return v.strip()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str):
        return v.lower()