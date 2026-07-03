"""
Raw MySQL data-access layer.
No ORM. Every DB call in the project routes through the helpers below,
which wrap a mysql-connector connection pool and always use parameterized
queries (never string-concatenated SQL) to prevent SQL injection.
"""
import mysql.connector
from mysql.connector import pooling
from flask import current_app, g

_pool = None


def init_db_pool(app):
    """Called once from the app factory to create the global connection pool."""
    global _pool
    _pool = pooling.MySQLConnectionPool(
        pool_name="shopsphere_pool",
        pool_size=app.config["DB_POOL_SIZE"],
        host=app.config["DB_HOST"],
        port=app.config["DB_PORT"],
        user=app.config["DB_USER"],
        password=app.config["DB_PASSWORD"],
        database=app.config["DB_NAME"],
        autocommit=False,
    )


def get_conn():
    """Get a pooled connection, cached on the Flask request-global `g`."""
    if "db_conn" not in g:
        g.db_conn = _pool.get_connection()
    return g.db_conn


def close_conn(e=None):
    conn = g.pop("db_conn", None)
    if conn is not None:
        conn.close()


def init_app(app):
    init_db_pool(app)
    app.teardown_appcontext(close_conn)


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

def fetch_one(query, params=None):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(query, params or ())
        return cur.fetchone()
    finally:
        cur.close()


def fetch_all(query, params=None):
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute(query, params or ())
        return cur.fetchall()
    finally:
        cur.close()


def execute(query, params=None, commit=True):
    """INSERT / UPDATE / DELETE. Returns (lastrowid, rowcount)."""
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(query, params or ())
        if commit:
            conn.commit()
        return cur.lastrowid, cur.rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


def execute_many(query, param_list, commit=True):
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.executemany(query, param_list)
        if commit:
            conn.commit()
        return cur.rowcount
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()


class transaction:
    """Context manager for multi-statement transactions.

    Usage:
        with transaction() as conn:
            cur = conn.cursor()
            cur.execute(...)
            cur.execute(...)
    Commits on clean exit, rolls back on exception.
    """

    def __enter__(self):
        self.conn = get_conn()
        return self.conn

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.conn.commit()
        else:
            self.conn.rollback()
        return False
