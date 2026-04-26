from pydantic import BaseModel, EmailStr, Field
from datetime import date

class RegisterRequest(BaseModel):
    fullname: str = Field(min_length=4)
    email: EmailStr = Field(min_length=6)
    password: str = Field(min_length=6)
    agreement: bool


    