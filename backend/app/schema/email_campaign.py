from datetime import time
from typing import Optional

from pydantic import BaseModel, Field


class CreateEmailCampaignRequest(BaseModel):

    user_id: str

    name: str = Field(
        min_length=1,
        max_length=255,
    )

    campaign_type: str = "birthday"

    subject: Optional[str] = None

    content: str

    signature: Optional[str] = None

    header_image_url: Optional[str] = None

    footer_image_url: Optional[str] = None
    
    status: Optional[str] = None

    send_time: Optional[time] = None

    timezone: Optional[str] = "Africa/Johannesburg"

    days_before_birthday: int = 0

    contact_ids: list[str]