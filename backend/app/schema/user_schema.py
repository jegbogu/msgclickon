from pydantic import BaseModel, EmailStr, Field, field_validator

class RegisterRequest(BaseModel):
    fullname: str = Field(min_length=4)
    email: EmailStr = Field(min_length=6)
    password: str = Field(min_length=6)
    agreement: bool

    @field_validator("fullname", "email", "password")
    @classmethod
    def trim_strings(cls, v: str):
        return v.strip()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str):
        return v.lower()