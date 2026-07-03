from flask import Blueprint, request, g, send_file
from app.utils.response import success, error, paginate_args
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.logging import log_activity
from app.blueprints.orders import service as order_service
from app.blueprints.cart.routes import _get_or_create_cart

orders_bp = Blueprint("orders", __name__)

VALID_STATUS_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"packed", "cancelled"},
    "packed": {"shipped", "cancelled"},
    "shipped": {"delivered", "returned"},
    "delivered": {"returned"},
    "cancelled": set(),
    "returned": set(),
}


@orders_bp.post("/checkout")
@jwt_required_custom()
def checkout():
    user_id = g.current_user["id"]
    payload = request.get_json(silent=True) or {}

    shipping_info = payload.get("shipping_info") or {}
    if not shipping_info.get("name") or not shipping_info.get("phone") or not shipping_info.get("address"):
        return error("shipping_info requires name, phone, and address", 422)

    cart = _get_or_create_cart(user_id=user_id)
    try:
        order_id, order_number = order_service.place_order(
            user_id, cart["id"], shipping_info, payload.get("coupon_code")
        )
    except order_service.OrderError as e:
        return error(e.message, e.status)

    log_activity(user_id, "user", "order.place", f"Order {order_number}")
    return success({"order_id": order_id, "order_number": order_number}, "Order placed successfully", 201)


@orders_bp.get("")
@jwt_required_custom()
def order_history():
    user_id = g.current_user["id"]
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        """SELECT id, order_number, status, total_amount, placed_at
           FROM orders WHERE user_id = %s ORDER BY placed_at DESC LIMIT %s OFFSET %s""",
        (user_id, limit, offset),
    )
    total = fetch_one("SELECT COUNT(*) AS cnt FROM orders WHERE user_id = %s", (user_id,))["cnt"]
    return success(rows, meta={"page": page, "limit": limit, "total": total})


@orders_bp.get("/<int:order_id>")
@jwt_required_custom()
def order_details(order_id):
    user = g.current_user
    query = "SELECT * FROM orders WHERE id = %s"
    params = [order_id]
    if user["role_name"] not in ("admin", "super_admin"):
        query += " AND user_id = %s"
        params.append(user["id"])

    order = fetch_one(query, params)
    if not order:
        return error("Order not found", 404)

    order["items"] = fetch_all("SELECT * FROM order_items WHERE order_id = %s", (order_id,))
    return success(order)


@orders_bp.post("/<int:order_id>/cancel")
@jwt_required_custom()
def cancel(order_id):
    user = g.current_user
    is_admin = user["role_name"] in ("admin", "super_admin")
    try:
        order_service.cancel_order(order_id, user["id"], is_admin)
    except order_service.OrderError as e:
        return error(e.message, e.status)
    log_activity(user["id"], "admin" if is_admin else "user", "order.cancel", f"Order {order_id}")
    return success(None, "Order cancelled")


@orders_bp.get("/<int:order_id>/invoice")
@jwt_required_custom()
def invoice(order_id):
    user = g.current_user
    query = "SELECT id FROM orders WHERE id = %s"
    params = [order_id]
    if user["role_name"] not in ("admin", "super_admin"):
        query += " AND user_id = %s"
        params.append(user["id"])
    order = fetch_one(query, params)
    if not order:
        return error("Order not found", 404)

    try:
        pdf_buffer = order_service.generate_invoice_pdf(order_id)
    except order_service.OrderError as e:
        return error(e.message, e.status)

    return send_file(
        pdf_buffer, mimetype="application/pdf",
        as_attachment=True, download_name=f"invoice-order-{order_id}.pdf",
    )


@orders_bp.post("/<int:order_id>/reorder")
@jwt_required_custom()
def reorder(order_id):
    user_id = g.current_user["id"]
    items = fetch_all(
        "SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = %s AND product_id IN "
        "(SELECT id FROM products WHERE is_deleted = 0)",
        (order_id,),
    )
    if not items:
        return error("No active items found from this order to reorder", 404)

    cart = _get_or_create_cart(user_id=user_id)
    for item in items:
        existing = fetch_one(
            "SELECT id FROM cart_items WHERE cart_id=%s AND product_id=%s AND variant_id <=> %s",
            (cart["id"], item["product_id"], item["variant_id"]),
        )
        if existing:
            execute(
                "UPDATE cart_items SET quantity = quantity + %s WHERE id = %s",
                (item["quantity"], existing["id"]),
            )
        else:
            execute(
                "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (%s,%s,%s,%s)",
                (cart["id"], item["product_id"], item["variant_id"], item["quantity"]),
            )
    return success(None, "Items added back to your cart")


# ---------------------------------------------------------------------------
# Admin: order management
# ---------------------------------------------------------------------------

@orders_bp.get("/admin/all")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def admin_list_orders():
    page, limit, offset = paginate_args(request)
    status_filter = request.args.get("status")

    query = """SELECT o.id, o.order_number, o.status, o.total_amount, o.placed_at,
                      u.name AS customer_name, u.email AS customer_email
               FROM orders o JOIN users u ON u.id = o.user_id"""
    params = []
    if status_filter:
        query += " WHERE o.status = %s"
        params.append(status_filter)
    query += " ORDER BY o.placed_at DESC LIMIT %s OFFSET %s"
    params += [limit, offset]

    rows = fetch_all(query, params)
    return success(rows, meta={"page": page, "limit": limit})


@orders_bp.patch("/admin/<int:order_id>/status")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def admin_update_status(order_id):
    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status")

    order = fetch_one("SELECT status FROM orders WHERE id = %s", (order_id,))
    if not order:
        return error("Order not found", 404)

    allowed = VALID_STATUS_TRANSITIONS.get(order["status"], set())
    if new_status not in allowed:
        return error(
            f"Cannot transition order from '{order['status']}' to '{new_status}'", 400
        )

    if new_status == "cancelled":
        try:
            order_service.cancel_order(order_id, is_admin=True)
        except order_service.OrderError as e:
            return error(e.message, e.status)
    else:
        execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, order_id))

    log_activity(g.current_user["id"], "admin", "order.status_update", f"Order {order_id} -> {new_status}")
    return success(None, f"Order status updated to {new_status}")
