from flask import Blueprint, request, g
from app.utils.response import success, error, paginate_args
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.logging import log_activity

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/dashboard/cards")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def dashboard_cards():
    total_users = fetch_one("SELECT COUNT(*) AS cnt FROM users WHERE is_active = 1")["cnt"]
    total_products = fetch_one(
        "SELECT COUNT(*) AS cnt FROM products WHERE is_deleted = 0"
    )["cnt"]
    total_orders = fetch_one("SELECT COUNT(*) AS cnt FROM orders")["cnt"]
    total_revenue = fetch_one(
        "SELECT COALESCE(SUM(total_amount),0) AS s FROM orders WHERE status != 'cancelled'"
    )["s"]
    total_sales = fetch_one(
        "SELECT COALESCE(SUM(quantity),0) AS s FROM order_items oi "
        "JOIN orders o ON o.id = oi.order_id WHERE o.status != 'cancelled'"
    )["s"]

    return success({
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": float(total_revenue),
        "total_sales": int(total_sales),
    })


@admin_bp.get("/dashboard/charts/sales")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def chart_sales():
    rows = fetch_all(
        """SELECT DATE(placed_at) AS day, COALESCE(SUM(total_amount),0) AS revenue,
                  COUNT(*) AS order_count
           FROM orders WHERE status != 'cancelled'
             AND placed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           GROUP BY DATE(placed_at) ORDER BY day"""
    )
    return success(rows)


@admin_bp.get("/dashboard/charts/monthly-orders")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def chart_monthly_orders():
    rows = fetch_all(
        """SELECT DATE_FORMAT(placed_at, '%Y-%m') AS month, COUNT(*) AS order_count
           FROM orders WHERE placed_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
           GROUP BY DATE_FORMAT(placed_at, '%Y-%m') ORDER BY month"""
    )
    return success(rows)


@admin_bp.get("/dashboard/charts/revenue")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def chart_revenue():
    rows = fetch_all(
        """SELECT DATE_FORMAT(placed_at, '%Y-%m') AS month,
                  COALESCE(SUM(total_amount),0) AS revenue
           FROM orders WHERE status != 'cancelled'
             AND placed_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
           GROUP BY DATE_FORMAT(placed_at, '%Y-%m') ORDER BY month"""
    )
    return success(rows)


# ---------------------------------------------------------------------------
# User management (admin)
# ---------------------------------------------------------------------------

@admin_bp.get("/users")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def list_users():
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        """SELECT u.id, u.name, u.email, u.phone, u.is_active, u.is_email_verified,
                  r.name AS role_name, u.created_at
           FROM users u JOIN roles r ON r.id = u.role_id
           ORDER BY u.created_at DESC LIMIT %s OFFSET %s""",
        (limit, offset),
    )
    total = fetch_one("SELECT COUNT(*) AS cnt FROM users")["cnt"]
    return success(rows, meta={"page": page, "limit": limit, "total": total})


@admin_bp.patch("/users/<int:user_id>/role")
@jwt_required_custom()
@roles_required("super_admin")
def change_user_role(user_id):
    payload = request.get_json(silent=True) or {}
    role_name = payload.get("role")
    role = fetch_one("SELECT id FROM roles WHERE name = %s", (role_name,))
    if not role:
        return error("Invalid role", 422)
    execute("UPDATE users SET role_id = %s WHERE id = %s", (role["id"], user_id))
    log_activity(g.current_user["id"], "admin", "user.role_change", f"User {user_id} -> {role_name}")
    return success(None, "User role updated")


@admin_bp.patch("/users/<int:user_id>/status")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def toggle_user_status(user_id):
    payload = request.get_json(silent=True) or {}
    is_active = 1 if payload.get("is_active") else 0
    execute("UPDATE users SET is_active = %s WHERE id = %s", (is_active, user_id))
    log_activity(g.current_user["id"], "admin", "user.status_change", f"User {user_id} -> {is_active}")
    return success(None, "User status updated")


# ---------------------------------------------------------------------------
# Roles & permissions
# ---------------------------------------------------------------------------

@admin_bp.get("/roles")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def list_roles():
    return success(fetch_all("SELECT * FROM roles"))


@admin_bp.get("/permissions")
@jwt_required_custom()
@roles_required("super_admin")
def list_permissions():
    return success(fetch_all("SELECT * FROM permissions"))


@admin_bp.put("/roles/<int:role_id>/permissions")
@jwt_required_custom()
@roles_required("super_admin")
def set_role_permissions(role_id):
    payload = request.get_json(silent=True) or {}
    permission_ids = payload.get("permission_ids", [])

    execute("DELETE FROM role_permissions WHERE role_id = %s", (role_id,))
    for pid in permission_ids:
        execute(
            "INSERT INTO role_permissions (role_id, permission_id) VALUES (%s,%s)",
            (role_id, pid),
        )
    return success(None, "Role permissions updated")


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------

@admin_bp.get("/inventory/low-stock")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def low_stock():
    rows = fetch_all(
        """SELECT id, name, stock, min_stock FROM products
           WHERE stock <= min_stock AND is_deleted = 0 ORDER BY stock ASC"""
    )
    return success(rows)


@admin_bp.get("/inventory/logs")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def inventory_logs():
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        """SELECT il.*, p.name AS product_name FROM inventory_logs il
           JOIN products p ON p.id = il.product_id
           ORDER BY il.created_at DESC LIMIT %s OFFSET %s""",
        (limit, offset),
    )
    return success(rows, meta={"page": page, "limit": limit})


# ---------------------------------------------------------------------------
# Logs (activity / login / error)
# ---------------------------------------------------------------------------

@admin_bp.get("/logs/activity")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def activity_logs():
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (limit, offset),
    )
    return success(rows, meta={"page": page, "limit": limit})


@admin_bp.get("/logs/login")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def login_logs():
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        "SELECT * FROM login_logs ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (limit, offset),
    )
    return success(rows, meta={"page": page, "limit": limit})


@admin_bp.get("/logs/errors")
@jwt_required_custom()
@roles_required("super_admin")
def error_logs():
    page, limit, offset = paginate_args(request)
    rows = fetch_all(
        "SELECT * FROM error_logs ORDER BY created_at DESC LIMIT %s OFFSET %s",
        (limit, offset),
    )
    return success(rows, meta={"page": page, "limit": limit})
