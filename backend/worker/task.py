# worker/tasks.py
import os
from sqlalchemy import create_engine, text
from worker.providers import PROVIDERS
from dotenv import load_dotenv
load_dotenv()

engine = create_engine(os.environ["DATABASE_URL"])
MAX_ATTEMPTS = 4   # first try + Retry(max=3)

def send_delivery(delivery_id: str):
    with engine.begin() as conn:
        # claim the row; only one worker can win this
        claimed = conn.execute(text("""
            UPDATE email_campaign_delivery
               SET status = 'processing', attempts = attempts + 1
             WHERE id = :id AND status = 'pending'
         RETURNING attempts
        """), {"id": delivery_id}).first()
        if not claimed:
            return  # already handled (retry or duplicate job)

        row = conn.execute(text("""
            SELECT c.email, c.first_name, cp.subject, cp.content,
                   cp.signature, cp.company_name
              FROM email_campaign_delivery d
              JOIN contact c ON c.id = d.contact_id
              JOIN email_campaign cp ON cp.id = d.campaign_id
             WHERE d.id = :id
        """), {"id": delivery_id}).mappings().one()

        suppressed = conn.execute(text(
            "SELECT 1 FROM email_suppression WHERE email = lower(:e)"),
            {"e": row["email"] or ""}).first()

        if not row["email"] or suppressed:
            conn.execute(text("""
                UPDATE email_campaign_delivery
                   SET status='cancelled', error_message='no email or suppressed'
                 WHERE id=:id"""), {"id": delivery_id})
            return

    attempts = claimed.attempts
    try:
        body = row["content"].replace("{{first_name}}", row["first_name"])
        if row["signature"]:
            body += f"<br><br>{row['signature']}"

        provider_id = PROVIDERS["email"].send(
            row["email"], row["subject"] or "Happy Birthday!", body)

        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE email_campaign_delivery
                   SET status='sent', provider_id=:p, sent_at=now(), error_message=NULL
                 WHERE id=:id"""), {"p": provider_id, "id": delivery_id})
    except Exception as e:
        final = attempts >= MAX_ATTEMPTS
        with engine.begin() as conn:
            conn.execute(text("""
                UPDATE email_campaign_delivery
                   SET status=:s, error_message=:err
                 WHERE id=:id"""),
                {"s": "failed" if final else "pending",
                 "err": str(e)[:500], "id": delivery_id})
        raise  # lets RQ schedule the retry