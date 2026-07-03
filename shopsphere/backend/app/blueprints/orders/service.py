import uuid
import io
from datetime import datetime
from app.utils.db import fetch_one, fetch_all, execute, transaction


class OrderError(Exception):
    def __init__(self, message, status=400):
        self.message = message
        self.status = status


SHIPPING_CHARGE = 60.00  # flat COD shipping charge
TAX_RATE = 0.00  # adjust as needed; kept simple per spec (no tax service specified)


def _generate_order_number():
    return "SS-" + datetime.utcnow().strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:6].upper()


def place_order(user_id, cart_id, shipping_info, coupon_code=None):
    items = fetch_all(
        """SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity,
                  p.name, p.stock AS product_stock, COALESCE(p.offer_price, p.price) AS unit_price,
                  v.stock AS variant_stock
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           LEFT JOIN product_variants v ON v.id = ci.variant_id
           WHERE ci.cart_id = %s AND ci.is_saved_for_later = 0""",
        (cart_id,),
    )
    if not items:
        raise OrderError("Cart is empty", 400)

    # Stock validation
    for item in items:
        available = item["variant_stock"] if item["variant_id"] else item["product_stock"]
        if available < item["quantity"]:
            raise OrderError(f"Insufficient stock for '{item['name']}'", 409)

    subtotal = sum(float(i["unit_price"]) * i["quantity"] for i in items)

    discount_amount = 0.0
    coupon = None
    if coupon_code:
        from app.blueprints.coupons.routes import validate_coupon, CouponError
        try:
            coupon, discount_amount = validate_coupon(coupon_code, user_id, subtotal)
        except CouponError as e:
            raise OrderError(e.message, e.status)

    tax_amount = round((subtotal - discount_amount) * TAX_RATE, 2)
    total_amount = round(subtotal - discount_amount + tax_amount + SHIPPING_CHARGE, 2)
    order_number = _generate_order_number()

    with transaction() as conn:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO orders
               (user_id, order_number, status, shipping_name, shipping_phone, shipping_address,
                billing_address, shipping_charge, tax_amount, coupon_id, discount_amount,
                subtotal_amount, total_amount, payment_method)
               VALUES (%s,%s,'pending',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'cod')""",
            (
                user_id, order_number, shipping_info["name"], shipping_info["phone"],
                shipping_info["address"], shipping_info.get("billing_address"),
                SHIPPING_CHARGE, tax_amount, coupon["id"] if coupon else None,
                discount_amount, subtotal, total_amount,
            ),
        )
        order_id = cur.lastrowid

        for item in items:
            cur.execute(
                """INSERT INTO order_items
                   (order_id, product_id, variant_id, product_name_snapshot, unit_price, quantity, line_subtotal)
                   VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (
                    order_id, item["product_id"], item["variant_id"], item["name"],
                    item["unit_price"], item["quantity"],
                    float(item["unit_price"]) * item["quantity"],
                ),
            )
            # Deduct stock
            if item["variant_id"]:
                cur.execute(
                    "UPDATE product_variants SET stock = stock - %s WHERE id = %s",
                    (item["quantity"], item["variant_id"]),
                )
            else:
                cur.execute(
                    "UPDATE products SET stock = stock - %s WHERE id = %s",
                    (item["quantity"], item["product_id"]),
                )
            cur.execute(
                """INSERT INTO inventory_logs
                   (product_id, variant_id, change_type, quantity_changed, reason, reference_order_id)
                   VALUES (%s,%s,'decrease',%s,'order_placed',%s)""",
                (item["product_id"], item["variant_id"], item["quantity"], order_id),
            )

        if coupon:
            cur.execute(
                "INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES (%s,%s,%s)",
                (coupon["id"], user_id, order_id),
            )

        # Clear the cart
        cur.execute("DELETE FROM cart_items WHERE cart_id = %s AND is_saved_for_later = 0", (cart_id,))

    return order_id, order_number


def cancel_order(order_id, user_id=None, is_admin=False):
    query = "SELECT * FROM orders WHERE id = %s"
    params = [order_id]
    if not is_admin:
        query += " AND user_id = %s"
        params.append(user_id)

    order = fetch_one(query, params)
    if not order:
        raise OrderError("Order not found", 404)
    if order["status"] in ("delivered", "cancelled", "returned"):
        raise OrderError(f"Order already {order['status']} and cannot be cancelled", 400)

    with transaction() as conn:
        cur = conn.cursor()
        cur.execute("UPDATE orders SET status = 'cancelled' WHERE id = %s", (order_id,))

        items = fetch_all(
            "SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = %s",
            (order_id,),
        )
        for item in items:
            if item["variant_id"]:
                cur.execute(
                    "UPDATE product_variants SET stock = stock + %s WHERE id = %s",
                    (item["quantity"], item["variant_id"]),
                )
            else:
                cur.execute(
                    "UPDATE products SET stock = stock + %s WHERE id = %s",
                    (item["quantity"], item["product_id"]),
                )
            cur.execute(
                """INSERT INTO inventory_logs
                   (product_id, variant_id, change_type, quantity_changed, reason, reference_order_id)
                   VALUES (%s,%s,'increase',%s,'order_cancelled',%s)""",
                (item["product_id"], item["variant_id"], item["quantity"], order_id),
            )


def generate_invoice_pdf(order_id):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import mm

    order = fetch_one("SELECT * FROM orders WHERE id = %s", (order_id,))
    if not order:
        raise OrderError("Order not found", 404)
    items = fetch_all("SELECT * FROM order_items WHERE order_id = %s", (order_id,))

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 30 * mm
    c.setFont("Helvetica-Bold", 16)
    c.drawString(20 * mm, y, "ShopSphere — Invoice")
    y -= 10 * mm
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y, f"Order Number: {order['order_number']}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Status: {order['status'].upper()}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Shipping To: {order['shipping_name']}, {order['shipping_phone']}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Address: {order['shipping_address']}")
    y -= 12 * mm

    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Item")
    c.drawString(110 * mm, y, "Qty")
    c.drawString(130 * mm, y, "Unit Price")
    c.drawString(165 * mm, y, "Subtotal")
    y -= 6 * mm
    c.setFont("Helvetica", 10)

    for item in items:
        c.drawString(20 * mm, y, item["product_name_snapshot"][:45])
        c.drawString(110 * mm, y, str(item["quantity"]))
        c.drawString(130 * mm, y, f"{item['unit_price']:.2f}")
        c.drawString(165 * mm, y, f"{item['line_subtotal']:.2f}")
        y -= 6 * mm

    y -= 6 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(130 * mm, y, "Subtotal:")
    c.drawString(165 * mm, y, f"{order['subtotal_amount']:.2f}")
    y -= 6 * mm
    c.drawString(130 * mm, y, "Discount:")
    c.drawString(165 * mm, y, f"-{order['discount_amount']:.2f}")
    y -= 6 * mm
    c.drawString(130 * mm, y, "Shipping:")
    c.drawString(165 * mm, y, f"{order['shipping_charge']:.2f}")
    y -= 6 * mm
    c.drawString(130 * mm, y, "Tax:")
    c.drawString(165 * mm, y, f"{order['tax_amount']:.2f}")
    y -= 6 * mm
    c.drawString(130 * mm, y, "Total:")
    c.drawString(165 * mm, y, f"{order['total_amount']:.2f}")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
