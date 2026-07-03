from flask import Blueprint, request, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.utils.response import success, error
from app.utils.decorators import jwt_required_custom
from app.utils.db import fetch_all, execute

search_bp = Blueprint("search", __name__)


@search_bp.get("")
def global_search():
    q = request.args.get("q", "").strip()
    if not q:
        return error("q parameter is required", 422)

    rows = fetch_all(
        """SELECT id, name, thumbnail, price, offer_price FROM products
           WHERE status='published' AND is_active=1 AND is_deleted=0
             AND MATCH(name, short_description) AGAINST (%s IN NATURAL LANGUAGE MODE)
           LIMIT 20""",
        (q,),
    )

    # log search history if authenticated
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            execute(
                "INSERT INTO search_history (user_id, keyword) VALUES (%s,%s)",
                (int(user_id), q),
            )
    except Exception:
        pass

    return success(rows)


@search_bp.get("/suggestions")
def live_suggestions():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return success([])
    rows = fetch_all(
        """SELECT id, name, thumbnail FROM products
           WHERE status='published' AND is_active=1 AND is_deleted=0 AND name LIKE %s
           LIMIT 8""",
        (f"%{q}%",),
    )
    return success(rows)


@search_bp.get("/history")
@jwt_required_custom()
def history():
    rows = fetch_all(
        """SELECT DISTINCT keyword FROM search_history WHERE user_id = %s
           ORDER BY created_at DESC LIMIT 10""",
        (g.current_user["id"],),
    )
    return success([r["keyword"] for r in rows])
