from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.services.user_contacts import all_user_contacts
from app.schema.user_id import UserIdUsage
from app.core.db import get_db


router = APIRouter(
    prefix="/api/v1/user",
    tags=["User contacts"]
)


# EXISTING — DO NOT REMOVE
@router.post("/contacts")
def usercontacts(
    payload: UserIdUsage,
    db: Session = Depends(get_db)
):
    result = all_user_contacts(db, payload.user_id)

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["message"]
        )

    return {
        "status": "success",
        "data": result
    }


 # FOR SELECT CONTACTS / BIRTHDAY CAMPAIGNS
@router.get("/contacts")
def get_user_contacts(
    user_id: str,
    db: Session = Depends(get_db)
):
    result = all_user_contacts(db, user_id)

    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result["message"]
        )

    return {
        "status": "success",
        "data": result
    }