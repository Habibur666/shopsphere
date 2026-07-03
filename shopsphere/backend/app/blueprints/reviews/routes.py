from flask import Blueprint, request, g
from app.utils.response import success, error, paginate_args
from app.utils.decorators import jwt_required_custom
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.file_upload import save_image, delete_image, InvalidImageError
from app.utils.logging import log_activity

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.get("/product/<int:product_id>")
def list_reviews(product_id):
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        """SELECT r.id, r.rating, r.review_text, r.is_verified_purchase, r.created_at,
                  u.name AS user_name, u.profile_img AS user_avatar
           FROM reviews r JOIN users u ON u.id = r.user_id
           WHERE r.product_id = %s ORDER BY r.created_at DESC LIMIT %s OFFSET %s""",
        (product_id, limit, offset),
    )
    for r in rows:
        r["images"] = fetch_all(
            "SELECT image_path FROM review_images WHERE review_id = %s", (r["id"],)
        )
    total = fetch_one("SELECT COUNT(*) AS cnt FROM reviews WHERE product_id = %s", (product_id,))["cnt"]
    return success(rows, meta={"page": page, "limit": limit, "total": total})


@reviews_bp.post("/product/<int:product_id>")
@jwt_required_custom()
def create_review(product_id):
    user_id = g.current_user["id"]
    rating = request.form.get("rating", type=int)
    review_text = request.form.get("review_text")

    if not rating or rating < 1 or rating > 5:
        return error("rating must be between 1 and 5", 422)

    existing = fetch_one(
        "SELECT id FROM reviews WHERE user_id=%s AND product_id=%s", (user_id, product_id)
    )
    if existing:
        return error("You have already reviewed this product", 409)

    # verified purchase: user has a delivered order containing this product
    verified_order = fetch_one(
        """SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
           WHERE o.user_id = %s AND oi.product_id = %s AND o.status = 'delivered'
           LIMIT 1""",
        (user_id, product_id),
    )

    review_id, _ = execute(
        """INSERT INTO reviews (product_id, user_id, order_id, rating, review_text, is_verified_purchase)
           VALUES (%s,%s,%s,%s,%s,%s)""",
        (
            product_id, user_id, verified_order["id"] if verified_order else None,
            rating, review_text, 1 if verified_order else 0,
        ),
    )

    for f in request.files.getlist("images"):
        if f and f.filename:
            try:
                fname = save_image(f, "review_images")
                execute(
                    "INSERT INTO review_images (review_id, image_path) VALUES (%s,%s)",
                    (review_id, fname),
                )
            except InvalidImageError:
                continue

    log_activity(user_id, "user", "review.create", f"Product {product_id}")
    return success({"id": review_id}, "Review submitted", 201)


@reviews_bp.put("/<int:review_id>")
@jwt_required_custom()
def update_review(review_id):
    user_id = g.current_user["id"]
    review = fetch_one("SELECT * FROM reviews WHERE id = %s AND user_id = %s", (review_id, user_id))
    if not review:
        return error("Review not found", 404)

    payload = request.get_json(silent=True) or {}
    rating = payload.get("rating", review["rating"])
    review_text = payload.get("review_text", review["review_text"])

    execute(
        "UPDATE reviews SET rating = %s, review_text = %s WHERE id = %s",
        (rating, review_text, review_id),
    )
    return success(None, "Review updated")


@reviews_bp.delete("/<int:review_id>")
@jwt_required_custom()
def delete_review(review_id):
    user = g.current_user
    query = "SELECT * FROM reviews WHERE id = %s"
    params = [review_id]
    if user["role_name"] not in ("admin", "super_admin"):
        query += " AND user_id = %s"
        params.append(user["id"])

    review = fetch_one(query, params)
    if not review:
        return error("Review not found", 404)

    images = fetch_all("SELECT image_path FROM review_images WHERE review_id = %s", (review_id,))
    for img in images:
        delete_image(img["image_path"], "review_images")

    execute("DELETE FROM reviews WHERE id = %s", (review_id,))
    return success(None, "Review deleted")
