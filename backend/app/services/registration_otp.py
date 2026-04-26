import random
import smtplib
import ssl
import hashlib
from email.message import EmailMessage
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from app.model.email_verification import EmailVerification
from app.model.user import User
from sqlalchemy.orm import Session  
from datetime import datetime

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASS = os.getenv("EMAIL_PASS")


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    otp_number = str(random.randint(100000, 999999))
    print("otp_number",otp_number)
    return otp_number


def hash_otp(otp: str) -> str:
    """Hash OTP using Bycrypt, for easy decrytpion"""
    otp_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    otp_hash = otp_context.hash(otp)
    
    return otp_hash


def send_email_otp(to_email: str, otp: str):
    """Send OTP via Gmail SMTP"""

    subject = "Your Verification Code - MSGClickOn"

    year = datetime.utcnow().year

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ff6900; border-radius: 8px; overflow: hidden;">
        
        <!-- Header -->
        <div style="background-color: #ff6900; color: #fff; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px;">MSGClickOn</h1>
        </div>

        <!-- Body -->
        <div style="padding: 30px; color: #333;">
            <h2 style="color: #ff6900; margin-top: 0;">Welcome!</h2>

            <p style="font-size: 15px; line-height: 1.6;">
                Thank you for registering with <b>MSGClickOn</b>.  
                Please use the verification code below to complete your registration.
            </p>

            <!-- OTP Box -->
            <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; padding: 15px 25px; font-size: 24px; letter-spacing: 5px; font-weight: bold; background-color: #fff4ec; color: #ff6900; border: 2px dashed #ff6900; border-radius: 8px;">
                    {otp}
                </span>
            </div>

            <p style="font-size: 14px; color: #555;">
                This code will expire in <b>5 minutes</b>.
            </p>

            <p style="font-size: 14px; color: #555;">
                If you did not create this account, you can safely ignore this email.
            </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8f8f8; padding: 15px; text-align: center; font-size: 13px; color: #777;">
            <p style="margin: 0;">&copy; {year} MSGClickOn. All rights reserved.</p>
            <p style="margin: 5px 0;">
                Need help? 
                <a href="mailto:{EMAIL_USER}" style="color: #ff6900; text-decoration: none;">
                    Contact Support
                </a>
            </p>
        </div>

    </div>
    """

    msg = EmailMessage()
    msg["From"] = EMAIL_USER
    msg["To"] = to_email
    msg["Subject"] = subject

    # Plain text fallback
    msg.set_content(f"Your verification code is: {otp}. It expires in 5 minutes.")

    # HTML version
    msg.add_alternative(html_body, subtype="html")

    context = ssl.create_default_context()

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)

 
def generate_and_send_otp(db:Session, email: str):
     
    """Main function to generate, hash, and send OTP"""
    existing_user = db.query(User).filter(User.email==email).first()
    if not existing_user:
            return{"success":False, "message":"Email does not exist"}

    otp = generate_otp()
    otp_hash = hash_otp(otp)

    send_email_otp(email, otp)
    new_opt = EmailVerification(
        code_hash = otp_hash,
        user_id=existing_user.id,
    )
      
    
    db.add(new_opt)
    db.commit()
    db.refresh(new_opt)
     