from flask import Blueprint, request, g
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom
from app.utils.db import fetch_one, fetch_all, execute

cart_bp = Blueprint("cart", __name__)


def _get_or_create_cart(user_id=None, session_id=None):
    if user_id:
        cart = fetch_one("SELECT * FROM carts WHERE user_id = %s", (user_id,))
        if not cart:
            cart_id, _ = execute("INSERT INTO carts (user_id) VALUES (%s)", (user_id,))
            cart = {"id": cart_id, "user_id": user_id}
        return cart
    cart = fetch_one("SELECT * FROM carts WHERE session_id = %s", (session_id,))
    if not cart:
        cart_id, _ = execute("INSERT INTO carts (session_id) VALUES (%s)", (session_id,))
        cart = {"id": cart_id, "session_id": session_id}
    return cart


def _resolve_cart():
    """Supports both logged-in users (JWT optional) and guests (X-Session-Id header)."""
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        user_id = None

    if user_id:
        return _get_or_create_cart(user_id=int(user_id))

    session_id = request.headers.get("X-Session-Id")
    if not session_id:
        return None
    return _get_or_create_cart(session_id=session_id)


def _cart_items_detail(cart_id):
    return fetch_all(
        """SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity, ci.is_saved_for_later,
                  p.name, p.thumbnail, COALESCE(p.offer_price, p.price) AS unit_price,
                  p.stock AS product_stock
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           WHERE ci.cart_id = %s
           ORDER BY ci.created_at DESC""",
        (cart_id,),
    )


@cart_bp.get("")
def get_cart():
    cart = _resolve_cart()
    if not cart:
        return success({"items": [], "cart_id": None})
    items = _cart_items_detail(cart["id"])
    return success({"items": items, "cart_id": cart["id"]})


@cart_bp.post("/items")
def add_item():
    cart = _resolve_cart()
    if not cart:
        return error("Missing auth token or X-Session-Id header for guest cart", 400)

    payload = request.get_json(silent=True) or {}
    product_id = payload.get("product_id")
    variant_id = payload.get("variant_id")
    quantity = int(payload.get("quantity", 1))

    if not product_id:
        return error("product_id is required", 422)

    existing = fetch_one(
        "SELECT id, quantity FROM cart_items WHERE cart_id=%s AND product_id=%s AND variant_id <=> %s",
        (cart["id"], product_id, variant_id),
    )
    if existing:
        execute(
            "UPDATE cart_items SET quantity = quantity + %s WHERE id = %s",
            (quantity, existing["id"]),
        )
    else:
        execute(
            "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (%s,%s,%s,%s)",
            (cart["id"], product_id, variant_id, quantity),
        )
    return success(_cart_items_detail(cart["id"]), "Item added to cart")


@cart_bp.put("/items/<int:item_id>")
def update_item(item_id):
    payload = request.get_json(silent=True) or {}
    quantity = payload.get("quantity")
    is_saved_for_later = payload.get("is_saved_for_later")

    updates, params = [], []
    if quantity is not None:
        updates.append("quantity = %s")
        params.append(max(int(quantity), 1))
    if is_saved_for_later is not None:
        updates.append("is_saved_for_later = %s")
        params.append(1 if is_saved_for_later else 0)

    if not updates:
        return error("Nothing to update", 422)

    params.append(item_id)
    execute(f"UPDATE cart_items SET {', '.join(updates)} WHERE id = %s", params)
    return success(None, "Cart item updated")


@cart_bp.delete("/items/<int:item_id>")
def remove_item(item_id):
    execute("DELETE FROM cart_items WHERE id = %s", (item_id,))
    return success(None, "Item removed from cart")


@cart_bp.post("/merge")
@jwt_required_custom()
def merge_guest_cart():
    """Called right after login: merges guest session cart into the user's cart."""
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    if not session_id:
        return error("session_id is required", 422)

    guest_cart = fetch_one("SELECT * FROM carts WHERE session_id = %s", (session_id,))
    if not guest_cart:
        return success(None, "Nothing to merge")

    user_cart = _get_or_create_cart(user_id=g.current_user["id"])
    guest_items = fetch_all("SELECT * FROM cart_items WHERE cart_id = %s", (guest_cart["id"],))

    for item in guest_items:
        existing = fetch_one(
            "SELECT id, quantity FROM cart_items WHERE cart_id=%s AND product_id=%s AND variant_id <=> %s",
            (user_cart["id"], item["product_id"], item["variant_id"]),
        )
        if existing:
            execute(
                "UPDATE cart_items SET quantity = quantity + %s WHERE id = %s",
                (item["quantity"], existing["id"]),
            )
        else:
            execute(
                "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (%s,%s,%s,%s)",
                (user_cart["id"], item["product_id"], item["variant_id"], item["quantity"]),
            )

    execute("DELETE FROM carts WHERE id = %s", (guest_cart["id"],))
    return success(_cart_items_detail(user_cart["id"]), "Guest cart merged")
