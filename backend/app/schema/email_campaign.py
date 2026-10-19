from datetime import time
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class CreateEmailCampaignRequest(BaseModel):

    user_id: str

    name: str = Field(
        min_length=1,
        max_length=255,
    )

    company_name: Optional[str] = Field(
        default=None,
        max_length=255,
    )

    campaign_type: str = "birthday"

    subject: Optional[str] = None

    content: str

    signature: Optional[str] = None

    header_image_url: Optional[str] = None

    footer_image_url: Optional[str] = None

    status: Literal["draft", "active"] = "draft"

    send_time: Optional[time] = None

    timezone: Optional[str] = None

    days_before_birthday: int = Field(default=0, ge=0)

    contact_ids: list[str] = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Campaign name cannot be blank")
        return value

    @field_validator("company_name")
    @classmethod
    def strip_company_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None

    @field_validator("contact_ids")
    @classmethod
    def unique_contact_ids(cls, value: list[str]) -> list[str]:
        # Drop duplicates but keep order
        return list(dict.fromkeys(value))