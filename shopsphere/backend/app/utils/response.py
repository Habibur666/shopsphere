from flask import jsonify


def success(data=None, message="OK", status=200, meta=None):
    body = {"success": True, "message": message, "data": data}
    if meta is not None:
        body["meta"] = meta
    return jsonify(body), status


def error(message="Something went wrong", status=400, errors=None):
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    return jsonify(body), status


def paginate_args(request, default_limit=20, max_limit=100):
    try:
        page = max(int(request.args.get("page", 1)), 1)
    except ValueError:
        page = 1
    try:
        limit = int(request.args.get("limit", default_limit))
    except ValueError:
        limit = default_limit
    limit = min(max(limit, 1), max_limit)
    offset = (page - 1) * limit
    return page, limit, offset
