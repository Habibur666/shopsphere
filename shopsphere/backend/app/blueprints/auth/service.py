from datetime import datetime, timedelta
from flask import current_app
from app.utils.db import fetch_one, execute
from app.utils.security import hash_password, verify_password, generate_otp
from app.utils.email import send_otp_email


class AuthError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


CUSTOMER_ROLE_NAME = "customer"


def _get_role_id(role_name):
    row = fetch_one("SELECT id FROM roles WHERE name = %s", (role_name,))
    if not row:
        raise AuthError(f"Role '{role_name}' not configured", 500)
    return row["id"]


def register_user(name, email, password, phone=None):
    existing = fetch_one("SELECT id FROM users WHERE email = %s", (email,))
    if existing:
        raise AuthError("An account with this email already exists", 409)

    role_id = _get_role_id(CUSTOMER_ROLE_NAME)
    password_hash = hash_password(password)

    user_id, _ = execute(
        """INSERT INTO users (role_id, name, email, password_hash, phone, is_email_verified, is_active)
           VALUES (%s, %s, %s, %s, %s, 0, 1)""",
        (role_id, name, email, password_hash, phone),
    )

    _issue_and_send_otp(user_id, email, purpose="email_verification")
    return user_id


def _issue_and_send_otp(user_id, email, purpose="email_verification"):
    otp_code = generate_otp(6)
    expires_at = datetime.utcnow() + timedelta(
        minutes=current_app.config["OTP_EXPIRY_MINUTES"]
    )
    execute(
        """INSERT INTO user_otp (user_id, otp_code, purpose, expires_at)
           VALUES (%s, %s, %s, %s)""",
        (user_id, otp_code, purpose, expires_at),
    )
    try:
        send_otp_email(email, otp_code, purpose)
    except Exception:
        # Do not block registration if mail sending fails in dev; log server-side.
        current_app.logger.warning("Failed to send OTP email to %s", email)
    return otp_code


def resend_otp(email, purpose="email_verification"):
    user = fetch_one("SELECT id, is_email_verified FROM users WHERE email = %s", (email,))
    if not user:
        raise AuthError("No account found with this email", 404)
    if purpose == "email_verification" and user["is_email_verified"]:
        raise AuthError("Email already verified", 400)
    _issue_and_send_otp(user["id"], email, purpose)


def verify_otp(email, otp_code, purpose="email_verification"):
    user = fetch_one("SELECT id, is_email_verified FROM users WHERE email = %s", (email,))
    if not user:
        raise AuthError("No account found with this email", 404)

    otp_row = fetch_one(
        """SELECT id, expires_at, is_used FROM user_otp
           WHERE user_id = %s AND otp_code = %s AND purpose = %s
           ORDER BY id DESC LIMIT 1""",
        (user["id"], otp_code, purpose),
    )
    if not otp_row:
        raise AuthError("Invalid OTP code", 400)
    if otp_row["is_used"]:
        raise AuthError("This OTP has already been used", 400)
    if otp_row["expires_at"] < datetime.utcnow():
        raise AuthError("OTP has expired. Please request a new one", 400)

    execute("UPDATE user_otp SET is_used = 1 WHERE id = %s", (otp_row["id"],))

    if purpose == "email_verification":
        execute("UPDATE users SET is_email_verified = 1 WHERE id = %s", (user["id"],))

    return user["id"]


def authenticate(email, password):
    user = fetch_one(
        """SELECT u.id, u.name, u.email, u.password_hash, u.is_email_verified,
                  u.is_active, u.role_id, r.name AS role_name
           FROM users u JOIN roles r ON r.id = u.role_id
           WHERE u.email = %s""",
        (email,),
    )
    if not user or not verify_password(password, user["password_hash"]):
        raise AuthError("Invalid email or password", 401)
    if not user["is_active"]:
        raise AuthError("This account has been deactivated", 403)
    if not user["is_email_verified"]:
        raise AuthError("Please verify your email before logging in", 403)
    return user


def change_password(user_id, old_password, new_password):
    user = fetch_one("SELECT password_hash FROM users WHERE id = %s", (user_id,))
    if not user or not verify_password(old_password, user["password_hash"]):
        raise AuthError("Current password is incorrect", 400)
    execute(
        "UPDATE users SET password_hash = %s WHERE id = %s",
        (hash_password(new_password), user_id),
    )
