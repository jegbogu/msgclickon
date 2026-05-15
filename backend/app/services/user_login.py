from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.model.user import User
from datetime import timedelta, datetime
from jose import jwt, JWTError
import os
from dotenv import load_dotenv
from fastapi import Response, Request, HTTPException

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def login_user(db: Session, payload, response: Response):
    try:
        existing_user = db.query(User).filter(User.email == payload.email).first()

        if not existing_user:
            return {"success": False, "message": "Email or Password is not correct"}

        verify_password = pwd_context.verify(
            payload.password, existing_user.password_hash
        )

        if not verify_password:
            return {"success": False, "message": "Email or Password is not correct"}

        # Generate JWT token
        access_token = create_access_token(
            data={
                "email": existing_user.email, 
                "id": str(existing_user.id),
                "fullname": existing_user.fullname,
                
                }
        )

        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,      # Not accessible from JS
            secure=False,       # True in production (HTTPS)
            samesite="lax",     # "none" in production if frontend is separate domain
            max_age=60 * 60
        )

        return {
            "success": True,
            "message": "Login successful",
            "token_type": "bearer",
            "user": {
                "id": existing_user.id,
                "email": existing_user.email,
                "fullname": existing_user.fullname,
                "role": "User"
            }
        }

    except Exception as e:
        return {"success": False, "message": str(e)}


def get_current_user(request: Request):
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("payload", payload)
        return payload

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")