from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.model.user import User
from app.model.addcontact_model import Contact

def all_user_contacts(db:Session, payload):
    try:
         
        existing_user = db.query(User).filter(User.id== payload.user_id).first()
        if not existing_user:
            return{"success":False, "message":"User does not exist"}
        
        contacts = db.query(Contact).filter(Contact.user_id == payload.user_id).all()
        print("contacts", contacts)
        contacts_data = [
            {
                "id": c.id,
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "birthday": c.birthday,
                "group_name": c.group_name
            }
            for c in contacts
        ]
        return {
           "success":True,
           "user_id": payload.user_id,
           "contacts": contacts_data
        }
        
    except Exception as e:
        print(f"Retrieving contacts failed :{e}")
        return {"success":False, "message":f"{e}"}
        
        
    