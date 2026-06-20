from app.schema.addcontact import AddcontactRequest
from app.services.addcontact_service import add_contact
from app.core.db import get_db
from app.model.addcontact_model import Contact   

from fastapi import APIRouter, UploadFile, Form, File, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
from io import StringIO

router = APIRouter(
    prefix="/api/v1/user",
    tags=["Add Contact"]
)

EXPECTED_HEADERS = {
    "first_name",
    "last_name",
    "email",
    "phone",
    "birthday",
    "group_name"   
}
router = APIRouter(
    prefix="/api/v1/user",
    tags=["Add Contact"]
)

@router.post("/addcontact")
def addcontact(payload: AddcontactRequest, db: Session = Depends(get_db)):
   
    result = add_contact(db, payload)

    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "status": "success",
        "data": result
    }
    
@router.post("/contacts/import")
async def import_contacts(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are allowed")

    content = await file.read()
    print("content", content)

    try:
        df = pd.read_csv(StringIO(content.decode("utf-8")))
    except Exception:
        raise HTTPException(400, "Invalid CSV file")

    headers = set(df.columns)

    if headers != EXPECTED_HEADERS:
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain exactly: {list(EXPECTED_HEADERS)}"
        )

    inserted = 0
    errors = []

    for index, row in df.iterrows():

        payload = Contact(
            user_id=user_id,  
            first_name=str(row["first_name"]).strip(),
            last_name=str(row["last_name"]).strip(),
            email=str(row["email"]).strip(),
            phone=str(row["phone"]).strip(),
            birthday=None if pd.isna(row["birthday"]) else str(row["birthday"]),
            group_name=str(row["group_name"]).strip()
        )

        result = add_contact(db, payload)

        if result["success"]:
            inserted += 1
        else:
            errors.append({
                "row": index,
                "email": row["email"],
                "error": result["message"]
            })

    return {
        "status": "success",
        "inserted": inserted,
        "failed": len(errors),
        "errors": errors
    }

    