from flask_mail import Message
from app.extensions import mail


def send_otp_email(to_email: str, otp_code: str, purpose: str = "email_verification"):
    subject_map = {
        "email_verification": "ShopSphere — Verify your email",
        "change_password": "ShopSphere — Confirm password change",
    }
    subject = subject_map.get(purpose, "ShopSphere — Your OTP Code")

    body = (
        f"Your ShopSphere verification code is: {otp_code}\n\n"
        f"This code expires in 10 minutes. If you didn't request this, "
        f"you can safely ignore this email."
    )

    msg = Message(subject=subject, recipients=[to_email], body=body)
    mail.send(msg)
