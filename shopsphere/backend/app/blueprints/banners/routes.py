from flask import Blueprint, request, g
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.file_upload import save_image, delete_image, InvalidImageError
from app.utils.logging import log_activity

banners_bp = Blueprint("banners", __name__)


@banners_bp.get("")
def list_banners():
    banner_type = request.args.get("type")
    query = "SELECT * FROM banners WHERE is_active = 1"
    params = []
    if banner_type:
        query += " AND type = %s"
        params.append(banner_type)
    query += " ORDER BY sort_order"
    rows = fetch_all(query, params)
    return success(rows)


@banners_bp.post("")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def create_banner():
    banner_type = request.form.get("type", "homepage")
    title = request.form.get("title")
    link_url = request.form.get("link_url")
    sort_order = request.form.get("sort_order", 0)

    if "image" not in request.files or not request.files["image"].filename:
        return error("image is required", 422)
    try:
        image_filename = save_image(request.files["image"], "banner_images")
    except InvalidImageError as e:
        return error(str(e), 422)

    banner_id, _ = execute(
        """INSERT INTO banners (type, title, image_path, link_url, sort_order)
           VALUES (%s,%s,%s,%s,%s)""",
        (banner_type, title, image_filename, link_url, sort_order),
    )
    log_activity(g.current_user["id"], "admin", "banner.create", f"Banner {banner_id}")
    return success({"id": banner_id}, "Banner created", 201)


@banners_bp.put("/<int:banner_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def update_banner(banner_id):
    banner = fetch_one("SELECT * FROM banners WHERE id = %s", (banner_id,))
    if not banner:
        return error("Banner not found", 404)

    title = request.form.get("title", banner["title"])
    link_url = request.form.get("link_url", banner["link_url"])
    sort_order = request.form.get("sort_order", banner["sort_order"])
    is_active = request.form.get("is_active", banner["is_active"])

    image_filename = banner["image_path"]
    if "image" in request.files and request.files["image"].filename:
        try:
            image_filename = save_image(request.files["image"], "banner_images")
            delete_image(banner["image_path"], "banner_images")
        except InvalidImageError as e:
            return error(str(e), 422)

    execute(
        """UPDATE banners SET title=%s, link_url=%s, sort_order=%s, is_active=%s, image_path=%s
           WHERE id=%s""",
        (title, link_url, sort_order, is_active, image_filename, banner_id),
    )
    log_activity(g.current_user["id"], "admin", "banner.update", f"Banner {banner_id}")
    return success(None, "Banner updated")


@banners_bp.delete("/<int:banner_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def delete_banner(banner_id):
    execute("UPDATE banners SET is_active = 0 WHERE id = %s", (banner_id,))
    log_activity(g.current_user["id"], "admin", "banner.delete", f"Banner {banner_id}")
    return success(None, "Banner removed")
