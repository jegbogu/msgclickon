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

from app.model.campaigns_model import Email_campaign
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

        upload_dir = Path("uploads/email_campaigns")

        upload_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        # ----------------------------------------------------
        # Generate unique filename
        # ----------------------------------------------------

        extension = allowed_types[file.content_type]

        filename = f"{uuid.uuid4()}{extension}"

        file_path = upload_dir / filename

        # ----------------------------------------------------
        # Save file
        # ----------------------------------------------------

        with open(file_path, "wb") as buffer:
            buffer.write(contents)

        # ----------------------------------------------------
        # Generate public URL
        # ----------------------------------------------------

        base_url = str(request.base_url).rstrip("/")

        image_url = (
            f"{base_url}"
            f"/uploads/email_campaigns/"
            f"{filename}"
        )

        print(f"Campaign image uploaded: {image_url}")

        # ----------------------------------------------------
        # Return result
        # ----------------------------------------------------

        return {
            "success": True,
            "message": "Image uploaded successfully",
            "url": image_url,
            "filename": filename,
        }

    except HTTPException:
        raise

    except Exception as e:

        print("Image upload error:", e)

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
                detail="At least one contact must be selected",
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
            user_id = UUID(str(payload.user_id))

        except (ValueError, TypeError):

            raise HTTPException(
                status_code=400,
                detail="Invalid user ID",
            )

        # ----------------------------------------------------
        # Convert contact IDs to UUIDs (de-duplicated, order kept)
        # ----------------------------------------------------

        try:
            contact_ids = list(
                dict.fromkeys(
                    UUID(str(contact_id))
                    for contact_id in payload.contact_ids
                )
            )

        except (ValueError, TypeError):

            raise HTTPException(
                status_code=400,
                detail="One or more contact IDs are invalid",
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

        if len(contacts) != len(contact_ids):

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

        campaign = Email_campaign(

            user_id=user_id,

            name=payload.name,

            company_name=payload.company_name,

            campaign_type=payload.campaign_type,

            subject=payload.subject,

            content=payload.content,

            signature=payload.signature,

            header_image_url=payload.header_image_url,

            footer_image_url=payload.footer_image_url,

            status=payload.status,

            send_time=payload.send_time,

            timezone=payload.timezone,

            days_before_birthday=payload.days_before_birthday,

            # Derived on the server, never trusted from the client
            contacts=len(contacts),

            number_of_sent_msg=0,

            # Set later by the scheduler
            next_run=None,
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

            db.add(
                EmailCampaignContact(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                )
            )

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

            "message": "Birthday campaign created successfully",

            "campaign": {

                "id": str(campaign.id),

                "name": campaign.name,

                "company_name": campaign.company_name,

                "status": campaign.status,

                "campaign_type": campaign.campaign_type,

                "contacts": campaign.contacts,

                "number_of_sent_msg": campaign.number_of_sent_msg,

                "next_run": (
                    campaign.next_run.isoformat()
                    if campaign.next_run
                    else None
                ),

                "header_image_url": campaign.header_image_url,

                "footer_image_url": campaign.footer_image_url,

                "created_at": (
                    campaign.created_at.isoformat()
                    if campaign.created_at
                    else None
                ),
            },
        }

    # --------------------------------------------------------
    # Keep intentional HTTP errors
    # --------------------------------------------------------

    except HTTPException:
        db.rollback()
        raise

    # --------------------------------------------------------
    # Handle unexpected errors
    # --------------------------------------------------------

    except Exception as e:

        db.rollback()

        print("Creating email campaign failed:", e)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create email campaign: {str(e)}",
        )


# ============================================================
# GET ONE CAMPAIGN (used to prefill the edit form)
# ============================================================

@router.get("/{campaign_id}")
def get_email_campaign(
    campaign_id: str,
    user_id: str,
    db: Session = Depends(get_db),
):
    try:
        campaign_uuid = UUID(campaign_id)
        user_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid campaign or user ID")

    campaign = (
        db.query(Email_campaign)
        .filter(
            Email_campaign.id == campaign_uuid,
            Email_campaign.user_id == user_uuid,
        )
        .first()
    )

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    links = (
        db.query(EmailCampaignContact)
        .filter(EmailCampaignContact.campaign_id == campaign.id)
        .all()
    )

    return {
        "success": True,
        "campaign": {
            "id": str(campaign.id),
            "name": campaign.name,
            "company_name": campaign.company_name,
            "campaign_type": campaign.campaign_type,
            "subject": campaign.subject,
            "content": campaign.content,
            "signature": campaign.signature,
            "header_image_url": campaign.header_image_url,
            "footer_image_url": campaign.footer_image_url,
            "status": campaign.status,
            "send_time": (
                campaign.send_time.strftime("%H:%M")
                if campaign.send_time
                else None
            ),
            "timezone": campaign.timezone,
            "days_before_birthday": campaign.days_before_birthday,
            "contact_ids": [str(link.contact_id) for link in links],
        },
    }


# ============================================================
# UPDATE EMAIL CAMPAIGN
# ============================================================

@router.put("/{campaign_id}")
def update_email_campaign(
    campaign_id: str,
    payload: CreateEmailCampaignRequest,
    db: Session = Depends(get_db),
):
    try:
        if payload.campaign_type != "birthday":
            raise HTTPException(status_code=400, detail="Invalid campaign type")

        try:
            campaign_uuid = UUID(campaign_id)
            user_id = UUID(str(payload.user_id))
            contact_ids = list(
                dict.fromkeys(
                    UUID(str(contact_id)) for contact_id in payload.contact_ids
                )
            )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="Invalid campaign, user or contact ID",
            )

        # Only the owner can edit
        campaign = (
            db.query(Email_campaign)
            .filter(
                Email_campaign.id == campaign_uuid,
                Email_campaign.user_id == user_id,
            )
            .first()
        )

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        contacts = (
            db.query(Contact)
            .filter(
                Contact.id.in_(contact_ids),
                Contact.user_id == user_id,
            )
            .all()
        )

        if len(contacts) != len(contact_ids):
            raise HTTPException(
                status_code=403,
                detail="One or more contacts do not belong to this user",
            )

        # Update the campaign fields
        campaign.name = payload.name
        campaign.company_name = payload.company_name
        campaign.campaign_type = payload.campaign_type
        campaign.subject = payload.subject
        campaign.content = payload.content
        campaign.signature = payload.signature
        campaign.header_image_url = payload.header_image_url
        campaign.footer_image_url = payload.footer_image_url
        campaign.status = payload.status
        campaign.send_time = payload.send_time
        campaign.timezone = payload.timezone
        campaign.days_before_birthday = payload.days_before_birthday
        campaign.contacts = len(contacts)

        # number_of_sent_msg is NOT touched: sending history is preserved
        if payload.status == "draft":
            campaign.next_run = None

        # Replace the contact selection
        (
            db.query(EmailCampaignContact)
            .filter(EmailCampaignContact.campaign_id == campaign.id)
            .delete(synchronize_session=False)
        )

        for contact in contacts:
            db.add(
                EmailCampaignContact(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                )
            )

        db.commit()
        db.refresh(campaign)

        return {
            "success": True,
            "message": "Campaign updated successfully",
            "campaign": {
                "id": str(campaign.id),
                "name": campaign.name,
                "status": campaign.status,
                "contacts": campaign.contacts,
            },
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        print("Updating email campaign failed:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update email campaign: {str(e)}",
        )


# ============================================================
# DELETE EMAIL CAMPAIGN
# ============================================================

@router.delete("/{campaign_id}")
def delete_email_campaign(
    campaign_id: str,
    user_id: str,
    db: Session = Depends(get_db),
):
    try:
        campaign_uuid = UUID(campaign_id)
        user_uuid = UUID(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid campaign or user ID")

    try:
        # Only the owner can delete
        campaign = (
            db.query(Email_campaign)
            .filter(
                Email_campaign.id == campaign_uuid,
                Email_campaign.user_id == user_uuid,
            )
            .first()
        )

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Remove the contact links first, in case the FK has no ON DELETE CASCADE
        (
            db.query(EmailCampaignContact)
            .filter(EmailCampaignContact.campaign_id == campaign.id)
            .delete(synchronize_session=False)
        )

        db.delete(campaign)
        db.commit()

        return {
            "success": True,
            "message": "Campaign deleted successfully",
            "id": campaign_id,
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as e:
        db.rollback()
        print("Deleting email campaign failed:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete email campaign: {str(e)}",
        )