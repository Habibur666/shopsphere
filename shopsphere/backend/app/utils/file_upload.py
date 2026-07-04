"""
Image upload utility — Cloudinary edition.

Replaces the original local-disk (D:\\eComImg\\...) storage with Cloudinary,
since local disk storage doesn't survive server restarts/redeploys and
doesn't scale across multiple servers in production.

Each image "type" still maps to its own dedicated folder — now a Cloudinary
folder (e.g. "shopsphere/userProfImg") instead of a local directory — so the
one-folder-per-image-type rule from the original spec is preserved.

What's stored in the database changed too: instead of just a filename, we now
store the full Cloudinary secure URL (e.g. "https://res.cloudinary.com/...").
The frontend uses that URL directly as the `src` — no more `/media/<type>/<file>`
path building needed.
"""
import re
import uuid
import cloudinary
import cloudinary.uploader
from flask import current_app

_configured = False


class InvalidImageError(Exception):
    pass


def _ensure_configured():
    global _configured
    if _configured:
        return
    cloudinary.config(
        cloud_name=current_app.config["CLOUDINARY_CLOUD_NAME"],
        api_key=current_app.config["CLOUDINARY_API_KEY"],
        api_secret=current_app.config["CLOUDINARY_API_SECRET"],
        secure=True,
    )
    _configured = True


def _allowed_extension(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]


def _folder_for(image_type: str) -> str:
    subfolders = current_app.config["IMAGE_SUBFOLDERS"]
    if image_type not in subfolders:
        raise InvalidImageError(f"Unknown image_type '{image_type}'")
    return f"shopsphere/{subfolders[image_type]}"


def save_image(file_storage, image_type: str) -> str:
    """
    Uploads a file to the correct Cloudinary folder for `image_type`.
    Returns the full secure HTTPS URL — this is what gets stored in the DB
    and used directly as an <img src> on the frontend.
    """
    _ensure_configured()

    if file_storage is None or file_storage.filename == "":
        raise InvalidImageError("No file provided")

    filename = file_storage.filename
    if not _allowed_extension(filename):
        raise InvalidImageError(
            "Invalid file type. Allowed: "
            + ", ".join(current_app.config["ALLOWED_IMAGE_EXTENSIONS"])
        )

    # Enforce max size (server-side)
    file_storage.stream.seek(0, 2)  # SEEK_END
    size_mb = file_storage.stream.tell() / (1024 * 1024)
    file_storage.stream.seek(0)
    if size_mb > current_app.config["MAX_IMAGE_SIZE_MB"]:
        raise InvalidImageError(
            f"File too large. Max {current_app.config['MAX_IMAGE_SIZE_MB']}MB allowed"
        )

    folder = _folder_for(image_type)
    public_id = uuid.uuid4().hex

    try:
        result = cloudinary.uploader.upload(
            file_storage,
            folder=folder,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
        )
    except Exception as e:
        raise InvalidImageError(f"Image upload failed: {str(e)}")

    return result["secure_url"]


def _extract_public_id(image_url: str):
    """
    Reconstructs the Cloudinary public_id (including folder) from a stored
    secure URL, so we can delete the asset later.
    e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/shopsphere/brandLogo/abcd1234.png
         -> shopsphere/brandLogo/abcd1234
    """
    if not image_url:
        return None
    match = re.search(r"/upload/(?:v\d+/)?(.+)\.[a-zA-Z0-9]+$", image_url)
    if not match:
        return None
    return match.group(1)


def delete_image(image_url: str, image_type: str = None) -> None:
    """image_type kept as an optional param for backward-compatible call sites."""
    if not image_url:
        return
    _ensure_configured()
    public_id = _extract_public_id(image_url)
    if not public_id:
        return
    try:
        cloudinary.uploader.destroy(public_id, resource_type="image")
    except Exception:
        # Non-fatal: don't block the request if Cloudinary cleanup fails.
        current_app.logger.warning("Failed to delete Cloudinary image: %s", image_url)
