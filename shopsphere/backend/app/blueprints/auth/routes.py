from flask import Blueprint, request, g
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom
from app.utils.logging import log_login, log_activity
from app.extensions import limiter
from app.blueprints.auth import service as auth_service

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
@limiter.limit("10 per hour")
def register():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    phone = payload.get("phone")

    if not name or not email or len(password) < 6:
        return error("Name, valid email, and password (min 6 chars) are required", 422)

    try:
        auth_service.register_user(name, email, password, phone)
    except auth_service.AuthError as e:
        return error(e.message, e.status)

    return success(
        {"email": email},
        "Registration successful. An OTP has been sent to your email.",
        201,
    )


@auth_bp.post("/verify-otp")
def verify_otp_route():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    otp_code = (payload.get("otp_code") or "").strip()
    purpose = payload.get("purpose", "email_verification")

    if not email or not otp_code:
        return error("email and otp_code are required", 422)

    try:
        auth_service.verify_otp(email, otp_code, purpose)
    except auth_service.AuthError as e:
        return error(e.message, e.status)

    return success(None, "Email verified successfully. You can now log in.")


@auth_bp.post("/resend-otp")
@limiter.limit("5 per hour")
def resend_otp_route():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    purpose = payload.get("purpose", "email_verification")

    if not email:
        return error("email is required", 422)

    try:
        auth_service.resend_otp(email, purpose)
    except auth_service.AuthError as e:
        return error(e.message, e.status)

    return success(None, "OTP resent successfully.")


@auth_bp.post("/login")
@limiter.limit("10 per minute")
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    try:
        user = auth_service.authenticate(email, password)
    except auth_service.AuthError as e:
        log_login(None, email, "failed")
        return error(e.message, e.status)

    log_login(user["id"], email, "success")

    additional_claims = {"role": user["role_name"]}
    access_token = create_access_token(identity=str(user["id"]), additional_claims=additional_claims)
    refresh_token = create_refresh_token(identity=str(user["id"]), additional_claims=additional_claims)

    return success(
        {
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role_name"],
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
        },
        "Login successful",
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return success({"access_token": access_token}, "Token refreshed")


@auth_bp.post("/logout")
@jwt_required_custom()
def logout():
    # Stateless JWT: logout is handled client-side by discarding tokens.
    # Activity is still logged server-side for audit purposes.
    log_activity(g.current_user["id"], "user", "auth.logout", "User logged out")
    return success(None, "Logged out successfully")


@auth_bp.post("/change-password")
@jwt_required_custom()
def change_password():
    payload = request.get_json(silent=True) or {}
    old_password = payload.get("old_password") or ""
    new_password = payload.get("new_password") or ""

    if len(new_password) < 6:
        return error("New password must be at least 6 characters", 422)

    try:
        auth_service.change_password(g.current_user["id"], old_password, new_password)
    except auth_service.AuthError as e:
        return error(e.message, e.status)

    log_activity(g.current_user["id"], "user", "auth.change_password")
    return success(None, "Password changed successfully")


@auth_bp.get("/me")
@jwt_required_custom()
def me():
    u = g.current_user
    return success(
        {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role_name"]}
    )
