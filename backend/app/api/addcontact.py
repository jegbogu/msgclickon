from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.schema.addcontact import AddcontactRequest
from app.services.addcontact_service import add_contact
from app.core.db import get_db

router = APIRouter(
    prefix="/api/v1/user",
    tags=["Add Contact"]
)

@router.post("/addcontact")
def addcontact(payload: AddcontactRequest, db: Session = Depends(get_db)):
    print("router")
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
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed"
        )

    content = await file.read()

    try:
        df = pd.read_csv(
            StringIO(content.decode("utf-8"))
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV file"
        )

    headers = set(df.columns)

    if headers != EXPECTED_HEADERS:
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain exactly: {list(EXPECTED_HEADERS)}"
        )

    inserted = 0

    for _, row in df.iterrows():

        contact = Contact(
            first_name=str(row["first_name"]).strip(),
            last_name=str(row["last_name"]).strip(),
            email=str(row["email"]).strip(),
            phone=str(row["phone"]).strip(),
            birthday=None
            if pd.isna(row["birthday"])
            else str(row["birthday"]),
            group_name=str(row["group"]).strip()
        )

        db.add(contact)
        inserted += 1

    db.commit()

    return {
        "success": True,
        "inserted": inserted
    }