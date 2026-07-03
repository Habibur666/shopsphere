from datetime import datetime
from flask import Blueprint, request, g
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.logging import log_activity

coupons_bp = Blueprint("coupons", __name__)


class CouponError(Exception):
    def __init__(self, message, status=400):
        self.message = message
        self.status = status


def validate_coupon(code, user_id, cart_subtotal):
    """Raises CouponError if invalid; otherwise returns the coupon row + discount amount."""
    coupon = fetch_one("SELECT * FROM coupons WHERE code = %s AND is_active = 1", (code,))
    if not coupon:
        raise CouponError("Invalid coupon code", 404)

    if coupon["expires_at"] and coupon["expires_at"] < datetime.utcnow():
        raise CouponError("This coupon has expired", 400)

    if cart_subtotal < float(coupon["min_order_amount"]):
        raise CouponError(
            f"Minimum order amount of {coupon['min_order_amount']} required for this coupon", 400
        )

    usage_count = fetch_one(
        "SELECT COUNT(*) AS cnt FROM coupon_usage WHERE coupon_id = %s", (coupon["id"],)
    )["cnt"]
    if coupon["usage_limit"] is not None and usage_count >= coupon["usage_limit"]:
        raise CouponError("This coupon has reached its usage limit", 400)

    if coupon["usage_type"] == "single":
        used_by_user = fetch_one(
            "SELECT id FROM coupon_usage WHERE coupon_id=%s AND user_id=%s",
            (coupon["id"], user_id),
        )
        if used_by_user:
            raise CouponError("You have already used this coupon", 400)

    if coupon["type"] == "percentage":
        discount = cart_subtotal * float(coupon["value"]) / 100
        if coupon["max_discount_amount"]:
            discount = min(discount, float(coupon["max_discount_amount"]))
    else:
        discount = float(coupon["value"])

    discount = min(discount, cart_subtotal)
    return coupon, round(discount, 2)


@coupons_bp.post("/validate")
@jwt_required_custom()
def validate():
    payload = request.get_json(silent=True) or {}
    code = payload.get("code")
    subtotal = float(payload.get("subtotal", 0))
    try:
        coupon, discount = validate_coupon(code, g.current_user["id"], subtotal)
    except CouponError as e:
        return error(e.message, e.status)
    return success({"coupon_id": coupon["id"], "code": coupon["code"], "discount": discount})


# --- Admin CRUD ---

@coupons_bp.get("")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def list_coupons():
    rows = fetch_all("SELECT * FROM coupons ORDER BY created_at DESC")
    return success(rows)


@coupons_bp.post("")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def create_coupon():
    p = request.get_json(silent=True) or {}
    required = ["code", "type", "value"]
    if not all(p.get(f) for f in required):
        return error("code, type, and value are required", 422)

    try:
        coupon_id, _ = execute(
            """INSERT INTO coupons (code, type, value, min_order_amount, max_discount_amount,
                                     usage_type, usage_limit, expires_at, is_active)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (
                p["code"].upper(), p["type"], p["value"], p.get("min_order_amount", 0),
                p.get("max_discount_amount"), p.get("usage_type", "single"),
                p.get("usage_limit"), p.get("expires_at"), p.get("is_active", 1),
            ),
        )
    except Exception:
        return error("A coupon with this code already exists", 409)

    log_activity(g.current_user["id"], "admin", "coupon.create", f"Created coupon {coupon_id}")
    return success({"id": coupon_id}, "Coupon created", 201)


@coupons_bp.put("/<int:coupon_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def update_coupon(coupon_id):
    p = request.get_json(silent=True) or {}
    fields = [
        "type", "value", "min_order_amount", "max_discount_amount",
        "usage_type", "usage_limit", "expires_at", "is_active",
    ]
    updates, params = [], []
    for f in fields:
        if f in p:
            updates.append(f"{f} = %s")
            params.append(p[f])
    if not updates:
        return error("No fields to update", 422)
    params.append(coupon_id)
    execute(f"UPDATE coupons SET {', '.join(updates)} WHERE id = %s", params)
    log_activity(g.current_user["id"], "admin", "coupon.update", f"Updated coupon {coupon_id}")
    return success(None, "Coupon updated")


@coupons_bp.delete("/<int:coupon_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def delete_coupon(coupon_id):
    execute("UPDATE coupons SET is_active = 0 WHERE id = %s", (coupon_id,))
    log_activity(g.current_user["id"], "admin", "coupon.delete", f"Deactivated coupon {coupon_id}")
    return success(None, "Coupon deactivated")
