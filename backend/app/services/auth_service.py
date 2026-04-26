from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.model.user import User
from app.services.registration_otp import generate_and_send_otp



def register_user(db:Session, payload):
    try:
        
        existing_user = db.query(User).filter(User.email== payload.email).first()
        if existing_user:
            return{"success":False, "message":"Email already exist"}
        
        if payload.agreement == False:
            return{"success":False, "message":"You have to agree to the Terms and Policy of using this service"}
        
        
        
        
        
        password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        password_hash = password_context.hash(payload.password)
        
    
        
        new_user = User(
            fullname=payload.fullname,
            email=payload.email,
            password_hash=password_hash
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        generate_and_send_otp(db, payload.email)
        
        return{"success":True, "message":"Registration is Successful"}
        
        
    except Exception as e:
        db.rollback()
        print(f"Saving Data failed :{e}")
        return {"success":False, "message":f"{e}"}