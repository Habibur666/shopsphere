from flask import Blueprint, request, g
from app.utils.response import success, error, paginate_args
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.file_upload import save_image, delete_image, InvalidImageError
from app.utils.logging import log_activity

brands_bp = Blueprint("brands", __name__)


@brands_bp.get("")
def list_brands():
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        "SELECT id, name, logo, description FROM brands WHERE is_active = 1 "
        "ORDER BY name LIMIT %s OFFSET %s",
        (limit, offset),
    )
    total = fetch_one("SELECT COUNT(*) AS cnt FROM brands WHERE is_active = 1")["cnt"]
    return success(rows, meta={"page": page, "limit": limit, "total": total})


@brands_bp.get("/<int:brand_id>")
def get_brand(brand_id):
    brand = fetch_one("SELECT * FROM brands WHERE id = %s", (brand_id,))
    if not brand:
        return error("Brand not found", 404)
    return success(brand)


@brands_bp.post("")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def create_brand():
    name = request.form.get("name")
    description = request.form.get("description")
    if not name:
        return error("name is required", 422)

    logo_filename = None
    if "logo" in request.files and request.files["logo"].filename:
        try:
            logo_filename = save_image(request.files["logo"], "brand_logo")
        except InvalidImageError as e:
            return error(str(e), 422)

    try:
        brand_id, _ = execute(
            "INSERT INTO brands (name, logo, description) VALUES (%s, %s, %s)",
            (name, logo_filename, description),
        )
    except Exception:
        return error("A brand with this name already exists", 409)

    log_activity(g.current_user["id"], "admin", "brand.create", f"Created brand {brand_id}")
    return success({"id": brand_id}, "Brand created", 201)


@brands_bp.put("/<int:brand_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def update_brand(brand_id):
    brand = fetch_one("SELECT * FROM brands WHERE id = %s", (brand_id,))
    if not brand:
        return error("Brand not found", 404)

    name = request.form.get("name", brand["name"])
    description = request.form.get("description", brand["description"])
    is_active = request.form.get("is_active", brand["is_active"])

    logo_filename = brand["logo"]
    if "logo" in request.files and request.files["logo"].filename:
        try:
            logo_filename = save_image(request.files["logo"], "brand_logo")
            if brand["logo"]:
                delete_image(brand["logo"], "brand_logo")
        except InvalidImageError as e:
            return error(str(e), 422)

    execute(
        "UPDATE brands SET name=%s, description=%s, logo=%s, is_active=%s WHERE id=%s",
        (name, description, logo_filename, is_active, brand_id),
    )
    log_activity(g.current_user["id"], "admin", "brand.update", f"Updated brand {brand_id}")
    return success(None, "Brand updated")


@brands_bp.delete("/<int:brand_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def delete_brand(brand_id):
    brand = fetch_one("SELECT * FROM brands WHERE id = %s", (brand_id,))
    if not brand:
        return error("Brand not found", 404)
    execute("UPDATE brands SET is_active = 0 WHERE id = %s", (brand_id,))
    log_activity(g.current_user["id"], "admin", "brand.delete", f"Deactivated brand {brand_id}")
    return success(None, "Brand deleted")
