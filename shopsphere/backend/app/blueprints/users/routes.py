from flask import Blueprint, request, g
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom
from app.utils.db import fetch_one, execute
from app.utils.file_upload import save_image, delete_image, InvalidImageError
from app.utils.logging import log_activity

users_bp = Blueprint("users", __name__)


@users_bp.get("/profile")
@jwt_required_custom()
def get_profile():
    user_id = g.current_user["id"]
    user = fetch_one(
        """SELECT id, name, email, phone, gender, date_of_birth, profile_img,
                  address_line, city, state, postal_code, country, created_at
           FROM users WHERE id = %s""",
        (user_id,),
    )
    order_count = fetch_one(
        "SELECT COUNT(*) AS cnt FROM orders WHERE user_id = %s", (user_id,)
    )["cnt"]
    review_count = fetch_one(
        "SELECT COUNT(*) AS cnt FROM reviews WHERE user_id = %s", (user_id,)
    )["cnt"]

    user["order_count"] = order_count
    user["review_count"] = review_count
    return success(user)


@users_bp.put("/profile")
@jwt_required_custom()
def update_profile():
    user_id = g.current_user["id"]
    payload = request.get_json(silent=True) or {}

    fields = [
        "name", "phone", "gender", "date_of_birth",
        "address_line", "city", "state", "postal_code", "country",
    ]
    updates, params = [], []
    for f in fields:
        if f in payload:
            updates.append(f"{f} = %s")
            params.append(payload[f])

    if not updates:
        return error("No valid fields provided", 422)

    params.append(user_id)
    execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", params)
    log_activity(user_id, "user", "profile.update")
    return success(None, "Profile updated successfully")


@users_bp.post("/profile/image")
@jwt_required_custom()
def upload_profile_image():
    user_id = g.current_user["id"]
    file = request.files.get("image")

    try:
        filename = save_image(file, "user_profile")
    except InvalidImageError as e:
        return error(str(e), 422)

    old = fetch_one("SELECT profile_img FROM users WHERE id = %s", (user_id,))
    execute("UPDATE users SET profile_img = %s WHERE id = %s", (filename, user_id))

    if old and old["profile_img"]:
        delete_image(old["profile_img"], "user_profile")

    log_activity(user_id, "user", "profile.image_upload")
    return success({"profile_img": filename}, "Profile image updated")


@users_bp.delete("/account")
@jwt_required_custom()
def delete_account():
    user_id = g.current_user["id"]
    execute("UPDATE users SET is_active = 0 WHERE id = %s", (user_id,))
    log_activity(user_id, "user", "account.delete", "User deactivated their account")
    return success(None, "Account deleted successfully")
