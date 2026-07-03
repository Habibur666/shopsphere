from flask import Blueprint, request, g
from app.utils.response import success, error, paginate_args
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.file_upload import save_image, delete_image, InvalidImageError
from app.utils.logging import log_activity
from app.blueprints.products import service as product_service

products_bp = Blueprint("products", __name__)


# ---------------------------------------------------------------------------
# Public: listing, detail, filters, sorting
# ---------------------------------------------------------------------------

@products_bp.get("")
def list_products():
    page, limit, offset = paginate_args(request)
    rows, total = product_service.list_products(request.args, limit, offset)
    return success(rows, meta={"page": page, "limit": limit, "total": total})


@products_bp.get("/<int:product_id>")
def get_product(product_id):
    product = product_service.get_product_detail(product_id)
    if not product:
        return error("Product not found", 404)
    return success(product)


@products_bp.get("/<int:product_id>/related")
def related_products(product_id):
    product = fetch_one("SELECT category_id FROM products WHERE id = %s", (product_id,))
    if not product:
        return error("Product not found", 404)
    rows = fetch_all(
        """SELECT id, name, thumbnail, price, offer_price FROM products
           WHERE category_id = %s AND id != %s AND status='published' AND is_active=1 AND is_deleted=0
           LIMIT 8""",
        (product["category_id"], product_id),
    )
    return success(rows)


# ---------------------------------------------------------------------------
# Admin: CRUD
# ---------------------------------------------------------------------------

@products_bp.post("")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def create_product():
    data = request.form.to_dict()
    if not data.get("name") or not data.get("price") or not data.get("category_id"):
        return error("name, price, and category_id are required", 422)

    thumbnail_filename = None
    if "thumbnail" in request.files and request.files["thumbnail"].filename:
        try:
            thumbnail_filename = save_image(request.files["thumbnail"], "product_thumbnail")
        except InvalidImageError as e:
            return error(str(e), 422)

    product_id = product_service.create_product(data, thumbnail_filename)

    # Optional gallery images uploaded alongside creation
    files = request.files.getlist("images")
    for idx, f in enumerate(files):
        if f and f.filename:
            try:
                fname = save_image(f, "product_images")
                execute(
                    "INSERT INTO product_images (product_id, image_path, sort_order) VALUES (%s,%s,%s)",
                    (product_id, fname, idx),
                )
            except InvalidImageError:
                continue

    log_activity(g.current_user["id"], "admin", "product.create", f"Created product {product_id}")
    return success({"id": product_id}, "Product created", 201)


@products_bp.put("/<int:product_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def update_product(product_id):
    existing = fetch_one("SELECT id FROM products WHERE id = %s", (product_id,))
    if not existing:
        return error("Product not found", 404)

    data = request.form.to_dict()
    thumbnail_filename = None
    if "thumbnail" in request.files and request.files["thumbnail"].filename:
        try:
            thumbnail_filename = save_image(request.files["thumbnail"], "product_thumbnail")
        except InvalidImageError as e:
            return error(str(e), 422)

    product_service.update_product(product_id, data, thumbnail_filename)
    log_activity(g.current_user["id"], "admin", "product.update", f"Updated product {product_id}")
    return success(None, "Product updated")


@products_bp.patch("/<int:product_id>/status")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def set_status(product_id):
    """Toggle draft/publish."""
    payload = request.get_json(silent=True) or {}
    status = payload.get("status")
    if status not in ("draft", "published"):
        return error("status must be 'draft' or 'published'", 422)
    execute("UPDATE products SET status = %s WHERE id = %s", (status, product_id))
    log_activity(g.current_user["id"], "admin", "product.status_change", f"{product_id} -> {status}")
    return success(None, f"Product {status}")


@products_bp.delete("/<int:product_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def delete_product(product_id):
    product_service.soft_delete_product(product_id)
    log_activity(g.current_user["id"], "admin", "product.soft_delete", f"Product {product_id}")
    return success(None, "Product moved to trash")


@products_bp.post("/<int:product_id>/restore")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def restore_product(product_id):
    product_service.restore_product(product_id)
    log_activity(g.current_user["id"], "admin", "product.restore", f"Product {product_id}")
    return success(None, "Product restored")


# ---------------------------------------------------------------------------
# Admin: product images (multi-upload, delete, reorder)
# ---------------------------------------------------------------------------

@products_bp.post("/<int:product_id>/images")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def add_images(product_id):
    files = request.files.getlist("images")
    if not files:
        return error("No images provided", 422)

    max_order = fetch_one(
        "SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = %s",
        (product_id,),
    )["m"]

    saved = []
    for i, f in enumerate(files):
        try:
            fname = save_image(f, "product_images")
        except InvalidImageError:
            continue
        img_id, _ = execute(
            "INSERT INTO product_images (product_id, image_path, sort_order) VALUES (%s,%s,%s)",
            (product_id, fname, max_order + 1 + i),
        )
        saved.append({"id": img_id, "image_path": fname})

    return success(saved, "Images uploaded", 201)


@products_bp.delete("/images/<int:image_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def delete_product_image(image_id):
    img = fetch_one("SELECT * FROM product_images WHERE id = %s", (image_id,))
    if not img:
        return error("Image not found", 404)
    delete_image(img["image_path"], "product_images")
    execute("DELETE FROM product_images WHERE id = %s", (image_id,))
    return success(None, "Image deleted")


@products_bp.put("/<int:product_id>/images/reorder")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def reorder_images(product_id):
    payload = request.get_json(silent=True) or {}
    order = payload.get("order", [])  # list of {id, sort_order}
    for item in order:
        execute(
            "UPDATE product_images SET sort_order = %s WHERE id = %s AND product_id = %s",
            (item["sort_order"], item["id"], product_id),
        )
    return success(None, "Image order updated")


# ---------------------------------------------------------------------------
# Admin: product variants
# ---------------------------------------------------------------------------

@products_bp.get("/<int:product_id>/variants")
def list_variants(product_id):
    rows = fetch_all(
        "SELECT * FROM product_variants WHERE product_id = %s AND is_active = 1", (product_id,)
    )
    return success(rows)


@products_bp.post("/<int:product_id>/variants")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def create_variant(product_id):
    payload = request.get_json(silent=True) or {}
    variant_id, _ = execute(
        """INSERT INTO product_variants (product_id, color, size, ram, storage, price, stock)
           VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (
            product_id, payload.get("color"), payload.get("size"),
            payload.get("ram"), payload.get("storage"),
            payload.get("price"), payload.get("stock", 0),
        ),
    )
    return success({"id": variant_id}, "Variant created", 201)


@products_bp.put("/variants/<int:variant_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def update_variant(variant_id):
    payload = request.get_json(silent=True) or {}
    fields = ["color", "size", "ram", "storage", "price", "stock", "is_active"]
    updates, params = [], []
    for f in fields:
        if f in payload:
            updates.append(f"{f} = %s")
            params.append(payload[f])
    if not updates:
        return error("No fields to update", 422)
    params.append(variant_id)
    execute(f"UPDATE product_variants SET {', '.join(updates)} WHERE id = %s", params)
    return success(None, "Variant updated")


@products_bp.delete("/variants/<int:variant_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def delete_variant(variant_id):
    execute("UPDATE product_variants SET is_active = 0 WHERE id = %s", (variant_id,))
    return success(None, "Variant removed")
