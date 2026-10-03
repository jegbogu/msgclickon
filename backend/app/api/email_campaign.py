import uuid
from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
)
from sqlalchemy.orm import Session

from app.core.db import get_db

from app.model.email_campaign import EmailCampaign
from app.model.email_campaign_contact import EmailCampaignContact
from app.model.addcontact_model import Contact

from app.schema.email_campaign import CreateEmailCampaignRequest


router = APIRouter(
    prefix="/api/v1/user/email-campaigns",
    tags=["Email Campaigns"],
)


# ============================================================
# IMAGE UPLOAD
# ============================================================

@router.post("/upload-image")
async def upload_campaign_image(
    request: Request,
    file: UploadFile = File(...),
):
    try:
        # ----------------------------------------------------
        # Allowed image types
        # ----------------------------------------------------

        allowed_types = {
            "image/png": ".png",
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/webp": ".webp",
        }

        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Only PNG, JPG, JPEG and WEBP "
                    "images are allowed"
                ),
            )

        # ----------------------------------------------------
        # Read uploaded file
        # ----------------------------------------------------

        contents = await file.read()

        # ----------------------------------------------------
        # 5MB file size limit
        # ----------------------------------------------------

        max_file_size = 5 * 1024 * 1024

        if len(contents) > max_file_size:
            raise HTTPException(
                status_code=400,
                detail="Image must be smaller than 5MB",
            )

        # ----------------------------------------------------
        # Create upload directory
        # ----------------------------------------------------

        upload_dir = Path(
            "uploads/email_campaigns"
        )

        upload_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        # ----------------------------------------------------
        # Generate unique filename
        # ----------------------------------------------------

        extension = allowed_types[
            file.content_type
        ]

        filename = (
            f"{uuid.uuid4()}{extension}"
        )

        file_path = (
            upload_dir / filename
        )

        # ----------------------------------------------------
        # Save file
        # ----------------------------------------------------

        with open(
            file_path,
            "wb",
        ) as buffer:

            buffer.write(contents)

        # ----------------------------------------------------
        # Generate public URL
        # ----------------------------------------------------

        base_url = (
            str(request.base_url)
            .rstrip("/")
        )

        image_url = (
            f"{base_url}"
            f"/uploads/email_campaigns/"
            f"{filename}"
        )

        print(
            f"Campaign image uploaded: "
            f"{image_url}"
        )

        # ----------------------------------------------------
        # Return result
        # ----------------------------------------------------

        return {
            "success": True,
            "message": (
                "Image uploaded successfully"
            ),
            "url": image_url,
            "filename": filename,
        }

    except HTTPException:
        raise

    except Exception as e:

        print(
            "Image upload error:",
            e,
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to upload image",
        )


# ============================================================
# CREATE EMAIL CAMPAIGN
# ============================================================

@router.post("")
def create_email_campaign(
    payload: CreateEmailCampaignRequest,
    db: Session = Depends(get_db),
):
    try:

        # ----------------------------------------------------
        # Validate campaign type
        # ----------------------------------------------------

        if payload.campaign_type != "birthday":

            raise HTTPException(
                status_code=400,
                detail="Invalid campaign type",
            )

        # ----------------------------------------------------
        # Make sure contacts were selected
        # ----------------------------------------------------

        if not payload.contact_ids:

            raise HTTPException(
                status_code=400,
                detail=(
                    "At least one contact "
                    "must be selected"
                ),
            )

        # ----------------------------------------------------
        # Validate user ID
        # ----------------------------------------------------

        if not payload.user_id:

            raise HTTPException(
                status_code=400,
                detail="User ID is required",
            )

        try:

            user_id = UUID(
                str(payload.user_id)
            )

        except (
            ValueError,
            TypeError,
        ):

            raise HTTPException(
                status_code=400,
                detail="Invalid user ID",
            )

        # ----------------------------------------------------
        # Convert contact IDs to UUIDs
        # ----------------------------------------------------

        try:

            contact_ids = [
                UUID(str(contact_id))
                for contact_id
                in payload.contact_ids
            ]

        except (
            ValueError,
            TypeError,
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "One or more contact IDs "
                    "are invalid"
                ),
            )

        # ----------------------------------------------------
        # Get contacts belonging to user
        # ----------------------------------------------------

        contacts = (
            db.query(Contact)
            .filter(
                Contact.id.in_(contact_ids),
                Contact.user_id == user_id,
            )
            .all()
        )

        # ----------------------------------------------------
        # Security / ownership check
        # ----------------------------------------------------

        if len(contacts) != len(
            contact_ids
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "One or more contacts "
                    "do not belong to this user"
                ),
            )

        # ----------------------------------------------------
        # Create campaign
        # ----------------------------------------------------

        campaign = EmailCampaign(

            user_id=user_id,

            name=payload.name,

            campaign_type=(
                payload.campaign_type
            ),

            subject=payload.subject,

            content=payload.content,

            signature=payload.signature,

            # Uploaded header image URL
            header_image_url=(
                payload.header_image_url
            ),

            # Uploaded footer image URL
            footer_image_url=(
                payload.footer_image_url
            ),

            status=payload.status,

            send_time=payload.send_time,

            timezone=payload.timezone,

            days_before_birthday=(
                payload.days_before_birthday
            ),
        )

        # Useful for debugging
        print(
            "Header image:",
            payload.header_image_url,
        )

        print(
            "Footer image:",
            payload.footer_image_url,
        )

        db.add(campaign)

        # ----------------------------------------------------
        # Get campaign ID before creating relationships
        # ----------------------------------------------------

        db.flush()

        # ----------------------------------------------------
        # Add selected contacts to campaign
        # ----------------------------------------------------

        for contact in contacts:

            campaign_contact = (
                EmailCampaignContact(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                )
            )

            db.add(campaign_contact)

        # ----------------------------------------------------
        # Save everything
        # ----------------------------------------------------

        db.commit()

        db.refresh(campaign)

        # ----------------------------------------------------
        # Return campaign
        # ----------------------------------------------------

        return {

            "success": True,

            "message": (
                "Birthday campaign "
                "created successfully"
            ),

            "campaign": {

                "id": str(
                    campaign.id
                ),

                "name": campaign.name,

                "status": campaign.status,

                "campaign_type": (
                    campaign.campaign_type
                ),

                "contacts_count": len(
                    contacts
                ),

                "header_image_url": (
                    campaign.header_image_url
                ),

                "footer_image_url": (
                    campaign.footer_image_url
                ),

                "created_at": (
                    campaign.created_at
                ),
            },
        }

    # --------------------------------------------------------
    # Keep intentional HTTP errors
    # --------------------------------------------------------

    except HTTPException:
        raise

    # --------------------------------------------------------
    # Handle unexpected errors
    # --------------------------------------------------------

    except Exception as e:

        db.rollback()

        print(
            "Creating email campaign failed:",
            e,
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create email campaign: "
                f"{str(e)}"
            ),
        )