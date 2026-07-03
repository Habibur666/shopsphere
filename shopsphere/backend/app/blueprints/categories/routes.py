from flask import Blueprint, request, g
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.file_upload import save_image, delete_image, InvalidImageError
from app.utils.logging import log_activity

categories_bp = Blueprint("categories", __name__)


@categories_bp.get("")
def list_categories():
    """Public: returns full category tree (top-level + children nested)."""
    rows = fetch_all(
        "SELECT id, parent_id, name, image, is_active FROM categories WHERE is_active = 1 ORDER BY name"
    )
    by_id = {r["id"]: {**r, "children": []} for r in rows}
    tree = []
    for r in rows:
        node = by_id[r["id"]]
        if r["parent_id"] and r["parent_id"] in by_id:
            by_id[r["parent_id"]]["children"].append(node)
        else:
            tree.append(node)
    return success(tree)


@categories_bp.get("/<int:category_id>")
def get_category(category_id):
    cat = fetch_one("SELECT * FROM categories WHERE id = %s", (category_id,))
    if not cat:
        return error("Category not found", 404)
    return success(cat)


@categories_bp.post("")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def create_category():
    name = request.form.get("name")
    parent_id = request.form.get("parent_id") or None
    if not name:
        return error("name is required", 422)

    image_filename = None
    if "image" in request.files and request.files["image"].filename:
        try:
            image_filename = save_image(request.files["image"], "category_images")
        except InvalidImageError as e:
            return error(str(e), 422)

    cat_id, _ = execute(
        "INSERT INTO categories (parent_id, name, image) VALUES (%s, %s, %s)",
        (parent_id, name, image_filename),
    )
    log_activity(g.current_user["id"], "admin", "category.create", f"Created category {cat_id}")
    return success({"id": cat_id}, "Category created", 201)


@categories_bp.put("/<int:category_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def update_category(category_id):
    cat = fetch_one("SELECT * FROM categories WHERE id = %s", (category_id,))
    if not cat:
        return error("Category not found", 404)

    name = request.form.get("name", cat["name"])
    parent_id = request.form.get("parent_id", cat["parent_id"])
    is_active = request.form.get("is_active", cat["is_active"])

    image_filename = cat["image"]
    if "image" in request.files and request.files["image"].filename:
        try:
            image_filename = save_image(request.files["image"], "category_images")
            if cat["image"]:
                delete_image(cat["image"], "category_images")
        except InvalidImageError as e:
            return error(str(e), 422)

    execute(
        """UPDATE categories SET name=%s, parent_id=%s, image=%s, is_active=%s
           WHERE id=%s""",
        (name, parent_id, image_filename, is_active, category_id),
    )
    log_activity(g.current_user["id"], "admin", "category.update", f"Updated category {category_id}")
    return success(None, "Category updated")


@categories_bp.delete("/<int:category_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def delete_category(category_id):
    cat = fetch_one("SELECT * FROM categories WHERE id = %s", (category_id,))
    if not cat:
        return error("Category not found", 404)
    execute("UPDATE categories SET is_active = 0 WHERE id = %s", (category_id,))
    log_activity(g.current_user["id"], "admin", "category.delete", f"Deactivated category {category_id}")
    return success(None, "Category deleted")
