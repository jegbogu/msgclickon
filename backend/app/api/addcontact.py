from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.schema.addcontact import AddcontactRequest
from app.services.addcontact_service import add_contact
from app.core.db import get_db

router = APIRouter(
    prefix="/api/v1/user",
    tags=["Add Contact"]
)

@router.post("/addcontact")
def addcontact(payload: AddcontactRequest, db: Session = Depends(get_db)):
    print("router")
    result = add_contact(db, payload)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "data": result
    }