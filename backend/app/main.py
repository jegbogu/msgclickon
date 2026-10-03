from fastapi import FastAPI
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.db import test_db_connection
from app.core.logger import log_info, log_error
from app.api import auth_route
from app.api import addcontact
from app.api import usercontacts
from app.api import email_campaign


# Create the upload directory if it does not exist
UPLOAD_DIR = Path("uploads/email_campaigns")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log_info("app.main", "Msgclickon application ")
    
    if not test_db_connection():
        log_error("app.main", "Database connection failed.")
        raise RuntimeError("Database connection failed")
    else:
        log_info("app.main", "Database connection succesaful.")
        print("Database connected")

    yield
    
    log_info("app.main", "Shutting down MsgClickOn...")


app = FastAPI(
    title="MsgClickOn",
    version="1.0.0",
    lifespan=lifespan
)


# Serve uploaded files
app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
        "X-CSRF-Token",
        "X-API-Key"
    ]
)


app.include_router(auth_route.router)
app.include_router(addcontact.router)
app.include_router(usercontacts.router)
app.include_router(email_campaign.router)