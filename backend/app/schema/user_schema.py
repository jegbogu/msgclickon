from pydantic import BaseModel, EmailStr, Field
from datetime import date

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


    