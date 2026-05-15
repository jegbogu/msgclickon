from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.schema.user_schema import RegisterRequest
from app.schema.user_login import LoginRequest
from app.schema.email_verification_schema import VerifyOTPRequest

from app.services.auth_service import register_user
from app.services.user_login import login_user, get_current_user
from app.services.storing_otp import verify_otp

from app.core.db import get_db


router = APIRouter(
    prefix="/api/v1/user",
    tags=["Users Authentication"]
)


@router.post("/register")
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    result = register_user(db, payload, response)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "data": result,
        "email": payload.email
    }


@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    result = login_user(db, payload, response)
    print("result", result)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "data": result,
      
         
    }


@router.post("/storing_otp")
def storing_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    result = verify_otp(db, payload)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "data": result
    }


@router.get("/me")
def me(user=Depends(get_current_user)):
    print("user",user)
    return {
        "success": True,
        "user": user
    }