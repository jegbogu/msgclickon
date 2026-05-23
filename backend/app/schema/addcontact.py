from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date


class AddcontactRequest(BaseModel):
    user_id: str = Field(min_length=10)
    first_name: str = Field(min_length=2)
    last_name: str = Field(min_length=2)

    email: EmailStr

    phone: str = Field(min_length=10)

    birthday: date

    group_name: str = Field(min_length=2)

    @field_validator(
        "first_name",
        "last_name",
        "email",
        "phone",
        "group_name",
        mode="before"
    )
    @classmethod
    def trim_strings(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator(
        "first_name",
        "last_name",
        "email",
        "group_name",
        mode="after"
    )
    @classmethod
    def convert_to_lowercase(cls, v):
        return v.lower() if isinstance(v, str) else v