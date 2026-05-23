from sqlalchemy.orm import Session
 
from app.model.addcontact_model import Contact
 



def add_contact(db:Session, payload):
    try:
        print("payload", payload)
        existing_user = db.query(Contact).filter(Contact.email== payload.email).first()
        if existing_user:
            return{"success":False, "message":"Email already exist"}
        
        existing_user = db.query(Contact).filter(Contact.phone== payload.phone).first()
        if existing_user:
            return{"success":False, "message":"Phone already exist"}
        
        new_contact = Contact(
            user_id=payload.user_id,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
            email = payload.email,
            birthday=payload.birthday,
            group_name=payload.group_name,
            
            
        )
        print("new_contact", new_contact)
        db.add(new_contact)
        db.commit()
        db.refresh(new_contact)
    
        
        return{"success":True, "message":"Registration is Successful"}
        
        
    except Exception as e:
        db.rollback()
        print(f"Saving Data failed :{e}")
        return {"success":False, "message":f"{e}"}