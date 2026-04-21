from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schema.user_schema import RegisterRequest
from app.services.auth_service import register_user
from app.core.db import get_db
router = APIRouter(
    prefix="/api/v1/user",
    tags=["Users Authentication"]
    
)

@router.post("/register")
def register(payload:RegisterRequest, db: Session = Depends(get_db)):
    result =  register_user(db, payload)
    print("result", result)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return{
        "status":"success",
        "data": result
    }