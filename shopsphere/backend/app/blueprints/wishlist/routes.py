from flask import Blueprint, request, g
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom
from app.utils.db import fetch_all, fetch_one, execute

wishlist_bp = Blueprint("wishlist", __name__)


@wishlist_bp.get("")
@jwt_required_custom()
def get_wishlist():
    rows = fetch_all(
        """SELECT w.id AS wishlist_id, p.id AS product_id, p.name, p.thumbnail,
                  p.price, p.offer_price, p.stock
           FROM wishlists w JOIN products p ON p.id = w.product_id
           WHERE w.user_id = %s AND p.is_deleted = 0
           ORDER BY w.created_at DESC""",
        (g.current_user["id"],),
    )
    return success(rows)


@wishlist_bp.post("")
@jwt_required_custom()
def add_to_wishlist():
    payload = request.get_json(silent=True) or {}
    product_id = payload.get("product_id")
    if not product_id:
        return error("product_id is required", 422)

    existing = fetch_one(
        "SELECT id FROM wishlists WHERE user_id=%s AND product_id=%s",
        (g.current_user["id"], product_id),
    )
    if existing:
        return success(None, "Already in wishlist")

    execute(
        "INSERT INTO wishlists (user_id, product_id) VALUES (%s,%s)",
        (g.current_user["id"], product_id),
    )
    return success(None, "Added to wishlist", 201)


@wishlist_bp.delete("/<int:product_id>")
@jwt_required_custom()
def remove_from_wishlist(product_id):
    execute(
        "DELETE FROM wishlists WHERE user_id=%s AND product_id=%s",
        (g.current_user["id"], product_id),
    )
    return success(None, "Removed from wishlist")
