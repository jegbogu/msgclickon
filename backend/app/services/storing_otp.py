from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.model.user import User
from app.model.email_verification import EmailVerification
from datetime import datetime

otp_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_otp(db: Session, payload):
    try:
        print("payload", payload)
        # 1. Check user
        existing_user = db.query(User).filter(User.email == payload.email).first()
 
        if not existing_user:
            return {"success": False, "message": "Email not found"}
        
        if  existing_user.is_verified:
            return {"success": False, "message": "Email is already verified, please login"}

        # 2. Get OTP record
        record = db.query(EmailVerification).filter(
            EmailVerification.user_id == existing_user.id
        ).first()
 
        if not record:
            return {"success": False, "message": "OTP not found"}

        # 3. Check attempts
        if record.attempts >= record.max_attempts:
            return {"success": False, "message": "Number of attempts exceeded"}

        # 4. Check expiry
        now = datetime.now()
        if now > record.expires_at:
            return {"success": False, "message": "Token has expired"}

        # 5. Verify OTP
        if not otp_context.verify(payload.code, record.code_hash):
            record.attempts += 1
            db.commit()

            return {"success": False, "message": "Wrong OTP"}

        # ✅ 6. SUCCESS
        # reset attempts or delete record
        db.delete(record)

        # mark user as verified (if you have this field)
        existing_user.is_verified = True

        db.commit()

        return {"success": True, "message": "Email verified successfully"}

    except Exception as e:
        return {"success": False, "message": str(e)}