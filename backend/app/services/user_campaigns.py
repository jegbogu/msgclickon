from sqlalchemy.orm import Session

from app.model.user import User
from app.model.campaigns_model import Email_campaign


def all_user_campaigns(db: Session, user_id):
    try:
        existing_user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not existing_user:
            return {
                "success": False,
                "message": "User does not exist",
            }

        # Newest first
        campaigns = (
            db.query(Email_campaign)
            .filter(Email_campaign.user_id == user_id)
            .order_by(Email_campaign.created_at.desc())
            .all()
        )

        campaigns_data = [
            {
                "id": str(c.id),
                "user_id": str(c.user_id),
                "name": c.name,
                "company_name": c.company_name,
                "campaign_type": c.campaign_type,
                "subject": c.subject,
                "content": c.content,
                "signature": c.signature,
                "header_image_url": c.header_image_url,
                "footer_image_url": c.footer_image_url,
                "status": c.status,
                "send_time": c.send_time.isoformat() if c.send_time else None,
                "timezone": c.timezone,
                "days_before_birthday": c.days_before_birthday,
                "contacts": c.contacts,
                "number_of_sent_msg": c.number_of_sent_msg,
                "next_run": c.next_run.isoformat() if c.next_run else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in campaigns
        ]

        return {
            "success": True,
            "user_id": str(user_id),
            "total_campaigns": len(campaigns_data),
            "campaigns": campaigns_data,
        }

    except Exception as e:
        print(f"Retrieving campaigns failed: {e}")

        return {
            "success": False,
            "message": str(e),
        }


def set_campaign_status(db: Session, user_id, campaign_id, status: str):
    """Set a campaign's status. Only the owner can change it."""
    try:
        campaign = (
            db.query(Email_campaign)
            .filter(
                Email_campaign.id == campaign_id,
                Email_campaign.user_id == user_id,
            )
            .first()
        )

        if not campaign:
            return {
                "success": False,
                "message": "Campaign not found",
            }

        campaign.status = status

        # A draft must never fire, so clear the schedule.
        # When resumed, the scheduler recalculates next_run.
        if status == "draft":
            campaign.next_run = None

        db.commit()
        db.refresh(campaign)

        return {
            "success": True,
            "id": str(campaign.id),
            "status": campaign.status,
            "next_run": (
                campaign.next_run.isoformat() if campaign.next_run else None
            ),
        }

    except Exception as e:
        db.rollback()
        print(f"Updating campaign status failed: {e}")

        return {
            "success": False,
            "message": str(e),
        }