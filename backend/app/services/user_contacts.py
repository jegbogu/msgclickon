from sqlalchemy.orm import Session

from app.model.user import User
from app.model.addcontact_model import Contact


def all_user_contacts(db: Session, user_id):
    try:

        existing_user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not existing_user:
            return {
                "success": False,
                "message": "User does not exist"
            }

        contacts = (
            db.query(Contact)
            .filter(Contact.user_id == user_id)
            .all()
        )

        print("contacts", contacts)

        contacts_data = [
            {
                "id": str(c.id),
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
            "success": True,
            "user_id": str(user_id),
            "contacts": contacts_data
        }

    except Exception as e:
        print(f"Retrieving contacts failed: {e}")

        return {
            "success": False,
            "message": str(e)
        }