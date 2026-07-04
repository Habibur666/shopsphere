from app.utils.db import fetch_one, fetch_all, execute, transaction


def build_product_filters(args):
    """Builds WHERE clause fragments + params from query string filters."""
    clauses = ["p.is_deleted = 0"]
    params = []

    if args.get("status"):
        clauses.append("p.status = %s")
        params.append(args["status"])
    else:
        clauses.append("p.status = 'published'")
        clauses.append("p.is_active = 1")

    if args.get("category_id"):
        clauses.append("p.category_id = %s")
        params.append(args["category_id"])

    if args.get("brand_id"):
        clauses.append("p.brand_id = %s")
        params.append(args["brand_id"])

    if args.get("min_price"):
        clauses.append("COALESCE(p.offer_price, p.price) >= %s")
        params.append(args["min_price"])

    if args.get("max_price"):
        clauses.append("COALESCE(p.offer_price, p.price) <= %s")
        params.append(args["max_price"])

    if args.get("color"):
        clauses.append("p.color = %s")
        params.append(args["color"])

    if args.get("size"):
        clauses.append("p.size = %s")
        params.append(args["size"])

    if args.get("min_discount"):
        clauses.append("p.discount >= %s")
        params.append(args["min_discount"])

    if args.get("in_stock") == "true":
        clauses.append("p.stock > 0")

    if args.get("featured") == "true":
        clauses.append("p.is_featured = 1")

    if args.get("q"):
        clauses.append("MATCH(p.name, p.short_description) AGAINST (%s IN NATURAL LANGUAGE MODE)")
        params.append(args["q"])

    return " AND ".join(clauses), params


SORT_MAP = {
    "price_low": "effective_price ASC",
    "price_high": "effective_price DESC",
    "best_selling": "sold_count DESC",
    "highest_rated": "avg_rating DESC",
    "latest": "p.created_at DESC",
}


def list_products(args, limit, offset):
    where_clause, params = build_product_filters(args)
    sort_key = SORT_MAP.get(args.get("sort"), "p.created_at DESC")

    query = f"""
        SELECT p.id, p.name, p.short_description, p.thumbnail, p.price, p.discount,
               p.offer_price, p.stock, p.is_featured, p.category_id, p.brand_id,
               COALESCE(p.offer_price, p.price) AS effective_price,
               COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id), 0) AS avg_rating,
               (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count,
               COALESCE((SELECT SUM(oi.quantity) FROM order_items oi WHERE oi.product_id = p.id), 0) AS sold_count
        FROM products p
        WHERE {where_clause}
        ORDER BY {sort_key}
        LIMIT %s OFFSET %s
    """
    rows = fetch_all(query, params + [limit, offset])

    count_query = f"SELECT COUNT(*) AS cnt FROM products p WHERE {where_clause}"
    total = fetch_one(count_query, params)["cnt"]

    return rows, total


def get_product_detail(product_id):
    product = fetch_one(
        """SELECT p.*, c.name AS category_name, b.name AS brand_name,
                  COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id), 0) AS avg_rating,
                  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN brands b ON b.id = p.brand_id
           WHERE p.id = %s AND p.is_deleted = 0""",
        (product_id,),
    )
    if not product:
        return None

    product["images"] = fetch_all(
        "SELECT id, image_path, sort_order FROM product_images WHERE product_id = %s ORDER BY sort_order",
        (product_id,),
    )
    product["variants"] = fetch_all(
        "SELECT * FROM product_variants WHERE product_id = %s AND is_active = 1",
        (product_id,),
    )
    return product


def create_product(data, thumbnail_filename):
    columns = [
        "category_id", "subcategory_id", "brand_id", "name", "short_description",
        "full_description", "thumbnail", "price", "discount", "offer_price",
        "cost_price", "stock", "min_stock", "weight", "dimensions", "material",
        "color", "size", "warranty", "return_policy", "is_featured", "status",
    ]
    values = [
        data.get("category_id"), data.get("subcategory_id"), data.get("brand_id"),
        data.get("name"), data.get("short_description"), data.get("full_description"),
        thumbnail_filename, data.get("price"), data.get("discount", 0),
        data.get("offer_price"), data.get("cost_price"), data.get("stock", 0),
        data.get("min_stock", 5), data.get("weight"), data.get("dimensions"),
        data.get("material"), data.get("color"), data.get("size"),
        data.get("warranty"), data.get("return_policy"),
        1 if data.get("is_featured") in ("1", "true", True) else 0,
        data.get("status", "draft"),
    ]
    placeholders = ", ".join(["%s"] * len(columns))
    product_id, _ = execute(
        f"INSERT INTO products ({', '.join(columns)}) VALUES ({placeholders})",
        values,
    )
    return product_id


def update_product(product_id, data, thumbnail_filename=None):
    columns = [
        "category_id", "subcategory_id", "brand_id", "name", "short_description",
        "full_description", "price", "discount", "offer_price", "cost_price",
        "stock", "min_stock", "weight", "dimensions", "material", "color", "size",
        "warranty", "return_policy", "is_featured", "status", "is_active",
    ]
    updates, params = [], []
    for c in columns:
        if c in data:
            updates.append(f"{c} = %s")
            params.append(data[c])

    if thumbnail_filename:
        updates.append("thumbnail = %s")
        params.append(thumbnail_filename)

    if not updates:
        return
    params.append(product_id)
    execute(f"UPDATE products SET {', '.join(updates)} WHERE id = %s", params)


def soft_delete_product(product_id):
    execute(
        "UPDATE products SET is_deleted = 1, deleted_at = NOW() WHERE id = %s",
        (product_id,),
    )


def restore_product(product_id):
    execute(
        "UPDATE products SET is_deleted = 0, deleted_at = NULL WHERE id = %s",
        (product_id,),
    )


def adjust_stock(product_id, delta, reason, order_id=None, variant_id=None):
    """delta positive = increase, negative = decrease. Logs to inventory_logs."""
    with transaction() as conn:
        cur = conn.cursor()
        if variant_id:
            cur.execute(
                "UPDATE product_variants SET stock = stock + %s WHERE id = %s",
                (delta, variant_id),
            )
        else:
            cur.execute(
                "UPDATE products SET stock = stock + %s WHERE id = %s",
                (delta, product_id),
            )
        cur.execute(
            """INSERT INTO inventory_logs
               (product_id, variant_id, change_type, quantity_changed, reason, reference_order_id)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (
                product_id, variant_id,
                "increase" if delta > 0 else "decrease",
                abs(delta), reason, order_id,
            ),
        )
