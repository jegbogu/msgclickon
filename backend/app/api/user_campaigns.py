from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.services.user_campaigns import all_user_campaigns, set_campaign_status
from app.core.db import get_db


router = APIRouter(
    prefix="/api/v1/user",
    tags=["User campaigns"],
)


class UserCampaignsRequest(BaseModel):
    user_id: str


class CampaignStatusRequest(BaseModel):
    user_id: str
    status: Literal["draft", "active"]


# ============================================================
# LIST CAMPAIGNS
# ============================================================

@router.post("/campaigns")
def get_user_campaigns(
    body: UserCampaignsRequest,
    db: Session = Depends(get_db),
):
    result = all_user_campaigns(db, body.user_id)

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["message"],
        )

    return {
        "status": "success",
        "data": result,
    }


# ============================================================
# PAUSE (-> draft) / RESUME (-> active)
# ============================================================

@router.patch("/campaigns/{campaign_id}/status")
def update_campaign_status(
    campaign_id: str,
    body: CampaignStatusRequest,
    db: Session = Depends(get_db),
):
    try:
        user_uuid = UUID(body.user_id)
        campaign_uuid = UUID(campaign_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid user or campaign ID",
        )

    result = set_campaign_status(db, user_uuid, campaign_uuid, body.status)

    if not result["success"]:
        status_code = 404 if result["message"] == "Campaign not found" else 400
        raise HTTPException(
            status_code=status_code,
            detail=result["message"],
        )

    return {
        "status": "success",
        "data": result,
    }