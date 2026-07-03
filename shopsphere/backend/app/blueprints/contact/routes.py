from flask import Blueprint, request, g
from app.utils.response import success, error, paginate_args
from app.utils.decorators import jwt_required_custom, roles_required
from app.utils.db import fetch_one, fetch_all, execute
from app.utils.logging import log_activity

contact_bp = Blueprint("contact", __name__)


@contact_bp.post("")
def submit_contact():
    payload = request.get_json(silent=True) or {}
    name = payload.get("name")
    email = payload.get("email")
    subject = payload.get("subject")
    message = payload.get("message")

    if not name or not email or not message:
        return error("name, email, and message are required", 422)

    msg_id, _ = execute(
        "INSERT INTO contact_messages (name, email, subject, message) VALUES (%s,%s,%s,%s)",
        (name, email, subject, message),
    )
    return success({"id": msg_id}, "Your message has been sent. We'll get back to you soon.", 201)


@contact_bp.get("/admin/inbox")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def inbox():
    page, limit, offset = paginate_args(request)
    status_filter = request.args.get("status")

    query = "SELECT * FROM contact_messages"
    params = []
    if status_filter:
        query += " WHERE status = %s"
        params.append(status_filter)
    query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
    params += [limit, offset]

    rows = fetch_all(query, params)
    total = fetch_one("SELECT COUNT(*) AS cnt FROM contact_messages")["cnt"]
    return success(rows, meta={"page": page, "limit": limit, "total": total})


@contact_bp.get("/admin/<int:message_id>")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def get_message(message_id):
    msg = fetch_one("SELECT * FROM contact_messages WHERE id = %s", (message_id,))
    if not msg:
        return error("Message not found", 404)
    if msg["status"] == "new":
        execute("UPDATE contact_messages SET status = 'read' WHERE id = %s", (message_id,))
    msg["replies"] = fetch_all(
        """SELECT cr.*, u.name AS admin_name FROM contact_replies cr
           JOIN users u ON u.id = cr.admin_id WHERE contact_message_id = %s
           ORDER BY created_at""",
        (message_id,),
    )
    return success(msg)


@contact_bp.post("/admin/<int:message_id>/reply")
@jwt_required_custom()
@roles_required("admin", "super_admin")
def reply(message_id):
    payload = request.get_json(silent=True) or {}
    reply_text = payload.get("reply_text")
    if not reply_text:
        return error("reply_text is required", 422)

    msg = fetch_one("SELECT * FROM contact_messages WHERE id = %s", (message_id,))
    if not msg:
        return error("Message not found", 404)

    execute(
        "INSERT INTO contact_replies (contact_message_id, admin_id, reply_text) VALUES (%s,%s,%s)",
        (message_id, g.current_user["id"], reply_text),
    )
    execute("UPDATE contact_messages SET status = 'replied' WHERE id = %s", (message_id,))

    # Send reply via email to the original sender
    try:
        from flask_mail import Message
        from app.extensions import mail
        mail.send(Message(
            subject=f"Re: {msg['subject'] or 'Your message to ShopSphere'}",
            recipients=[msg["email"]],
            body=reply_text,
        ))
    except Exception:
        pass

    log_activity(g.current_user["id"], "admin", "contact.reply", f"Message {message_id}")
    return success(None, "Reply sent")
