from flask import request
from app.utils.db import execute


def log_login(user_id, email_attempted, status):
    execute(
        """INSERT INTO login_logs (user_id, email_attempted, ip_address, user_agent, status)
           VALUES (%s, %s, %s, %s, %s)""",
        (user_id, email_attempted, request.remote_addr, request.headers.get("User-Agent"), status),
    )


def log_activity(user_id, actor_role, action, description=None):
    execute(
        """INSERT INTO activity_logs (user_id, actor_role, action, description, ip_address)
           VALUES (%s, %s, %s, %s, %s)""",
        (user_id, actor_role, action, description, request.remote_addr),
    )


def log_error(error_message, stack_trace=None, endpoint=None, http_method=None):
    execute(
        """INSERT INTO error_logs (error_message, stack_trace, endpoint, http_method)
           VALUES (%s, %s, %s, %s)""",
        (str(error_message)[:5000], stack_trace, endpoint, http_method),
    )
