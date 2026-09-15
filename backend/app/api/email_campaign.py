from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
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


@router.post("")
def create_email_campaign(
    payload: CreateEmailCampaignRequest,
    db: Session = Depends(get_db),
):
    try:
        # -----------------------------------
        # Validate campaign type
        # -----------------------------------

        if payload.campaign_type != "birthday":
            raise HTTPException(
                status_code=400,
                detail="Invalid campaign type",
            )

        # -----------------------------------
        # Make sure contacts were selected
        # -----------------------------------

        if not payload.contact_ids:
            raise HTTPException(
                status_code=400,
                detail="At least one contact must be selected",
            )

        # -----------------------------------
        # Validate user ID
        # -----------------------------------

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

        # -----------------------------------
        # Convert contact IDs to UUIDs
        # -----------------------------------

        try:
            contact_ids = [
                UUID(str(contact_id))
                for contact_id in payload.contact_ids
            ]
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="One or more contact IDs are invalid",
            )

        # -----------------------------------
        # Get contacts belonging to user
        # -----------------------------------

        contacts = (
            db.query(Contact)
            .filter(
                Contact.id.in_(contact_ids),
                Contact.user_id == user_id,
            )
            .all()
        )

        # -----------------------------------
        # Security / ownership check
        # -----------------------------------

        if len(contacts) != len(contact_ids):
            raise HTTPException(
                status_code=403,
                detail="One or more contacts do not belong to this user",
            )

        # -----------------------------------
        # Create campaign
        # -----------------------------------

        campaign = EmailCampaign(
            user_id=user_id,
            name=payload.name,
            campaign_type=payload.campaign_type,
            subject=payload.subject,
            content=payload.content,
            signature=payload.signature,
            header_image_url=payload.header_image_url,
            footer_image_url=payload.footer_image_url,
            status="draft",
            send_time=payload.send_time,
            timezone=payload.timezone,
            days_before_birthday=payload.days_before_birthday,
        )

        db.add(campaign)

        # Get campaign ID before creating relationships
        db.flush()

        # -----------------------------------
        # Add selected contacts to campaign
        # -----------------------------------

        for contact in contacts:
            campaign_contact = EmailCampaignContact(
                campaign_id=campaign.id,
                contact_id=contact.id,
            )

            db.add(campaign_contact)

        # -----------------------------------
        # Save everything
        # -----------------------------------

        db.commit()
        db.refresh(campaign)

        return {
            "success": True,
            "message": "Birthday campaign created successfully",
            "campaign": {
                "id": str(campaign.id),
                "name": campaign.name,
                "status": campaign.status,
                "campaign_type": campaign.campaign_type,
                "contacts_count": len(contacts),
                "created_at": campaign.created_at,
            },
        }

    except HTTPException:
        # Do not convert our intentional HTTP errors
        # into a 500 error
        raise

    except Exception as e:
        db.rollback()

        print(f"Creating email campaign failed: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"Failed to create email campaign: {str(e)}",
        )