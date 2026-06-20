from fastapi import APIRouter, Depends, HTTPException, Response
from app.services.user_contacts import all_user_contacts
from app.schema.user_id import UserIdUsage
from app.core.db import get_db
from sqlalchemy.orm import Session



router = APIRouter(
    prefix="/api/v1/user",
    tags=["User contacts"]
)

@router.post("/contacts")
def usercontacts(payload:UserIdUsage, db: Session = Depends(get_db)):
    result = all_user_contacts(db, payload)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "data": result
    }