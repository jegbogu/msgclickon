# api/routes.py
from fastapi import FastAPI
from .queue import message_queue
from worker.tasks import send_message

app = FastAPI()

@app.post("/messages")
def create_message(payload: MessageIn, db: Session = Depends(get_db)):
    msg = Message(to=payload.to, channel=payload.channel,
                  body=payload.body, status="queued")
    db.add(msg)
    db.commit()

    message_queue.enqueue(
        send_message,
        msg.id,
        retry=Retry(max=3, interval=[10, 60, 300]),  # backoff
        job_timeout=60,
    )
    return {"id": msg.id, "status": "queued"}