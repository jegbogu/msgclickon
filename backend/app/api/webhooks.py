# api/webhooks.py
import hmac, hashlib
from fastapi import APIRouter, Request, HTTPException, Depends

router = APIRouter()

EVENT_TO_STATUS = {
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained",
}

@router.post("/webhooks/email")
async def email_webhook(request: Request, db: Session = Depends(get_db)):
    raw_body = await request.body()

    # 1. Verify the request really came from the provider
    signature = request.headers.get("X-Signature", "")
    expected = hmac.new(WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(401, "Invalid signature")

    event = await request.json()
    status = EVENT_TO_STATUS.get(event["type"])
    if status is None:
        return {"ok": True}          # event we don't care about

    # 2. Find the message and update it
    msg = db.query(Message).filter_by(provider_id=event["data"]["email_id"]).first()
    if msg:
        msg.status = status
        if status in ("bounced", "complained"):
            add_to_suppression_list(db, msg.recipient)
        db.commit()

    # 3. Respond fast with 200
    return {"ok": True}