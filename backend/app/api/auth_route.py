from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schema.user_schema import RegisterRequest
from app.schema.email_verification_schema import VerifyOTPRequest
from app.services.auth_service import register_user
from app.services.storing_otp import verify_otp
from app.core.db import get_db
router = APIRouter(
    prefix="/api/v1/user",
    tags=["Users Authentication"]
    
)

@router.post("/register")
def register(payload:RegisterRequest, db: Session = Depends(get_db)):
    result =  register_user(db, payload)
  
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return{
        "status":"success",
        "data": result,
        "email":payload.email,
        
    }
@router.post("/storing_otp")
def storing_otp(payload:VerifyOTPRequest, db:Session = Depends(get_db)):
    result = verify_otp(db, payload)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return{
        "status":"success",
        "data":result
    }