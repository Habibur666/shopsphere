from functools import wraps
from flask import g
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from app.utils.response import error
from app.utils.db import fetch_one


def jwt_required_custom():
    """Verifies JWT and loads the current user into flask.g.current_user."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user = fetch_one(
                "SELECT u.id, u.name, u.email, u.role_id, r.name AS role_name, u.is_active "
                "FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = %s",
                (claims["sub"],),
            )
            if not user or not user["is_active"]:
                return error("Account not found or inactive", 401)
            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def roles_required(*allowed_roles):
    """Stack after jwt_required_custom(). Restricts access to given role names."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user or user["role_name"] not in allowed_roles:
                return error("Forbidden: insufficient permissions", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
