"""
Image upload utility — enforces the exact local-disk folder structure
required by the spec:

    D:\\eComImg\\
    ├── userProfImg\\
    ├── productThumbnail\\
    ├── productImages\\
    ├── categoryImages\\
    ├── brandLogo\\
    └── reviewImages\\
    └── bannerImages\\

Rules enforced here:
  - one dedicated subfolder per image "type" (never mixed)
  - missing folders are auto-created
  - extension whitelist + size limit enforced server-side
  - filenames are randomized (uuid4) to avoid collisions
"""
import os
import uuid
from flask import current_app
from werkzeug.utils import secure_filename


class InvalidImageError(Exception):
    pass


def _allowed_extension(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_IMAGE_EXTENSIONS"]


def _folder_for(image_type: str) -> str:
    subfolders = current_app.config["IMAGE_SUBFOLDERS"]
    if image_type not in subfolders:
        raise InvalidImageError(f"Unknown image_type '{image_type}'")
    root = current_app.config["IMAGE_UPLOAD_ROOT"]
    full_path = os.path.join(root, subfolders[image_type])
    os.makedirs(full_path, exist_ok=True)  # auto-create if missing
    return full_path


def save_image(file_storage, image_type: str) -> str:
    """
    Saves an uploaded file into the correct subfolder for `image_type`.
    Returns the stored filename (NOT the full path — only the filename
    is persisted in the DB; the full path is reconstructed at serve-time).
    """
    if file_storage is None or file_storage.filename == "":
        raise InvalidImageError("No file provided")

    filename = secure_filename(file_storage.filename)
    if not _allowed_extension(filename):
        raise InvalidImageError(
            "Invalid file type. Allowed: "
            + ", ".join(current_app.config["ALLOWED_IMAGE_EXTENSIONS"])
        )

    # Enforce max size (server-side)
    file_storage.stream.seek(0, os.SEEK_END)
    size_mb = file_storage.stream.tell() / (1024 * 1024)
    file_storage.stream.seek(0)
    if size_mb > current_app.config["MAX_IMAGE_SIZE_MB"]:
        raise InvalidImageError(
            f"File too large. Max {current_app.config['MAX_IMAGE_SIZE_MB']}MB allowed"
        )

    ext = filename.rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    folder = _folder_for(image_type)
    destination = os.path.join(folder, unique_name)
    file_storage.save(destination)

    return unique_name


def delete_image(filename: str, image_type: str) -> None:
    if not filename:
        return
    folder = _folder_for(image_type)
    path = os.path.join(folder, filename)
    if os.path.exists(path):
        os.remove(path)


def image_path_on_disk(filename: str, image_type: str) -> str:
    folder = _folder_for(image_type)
    return os.path.join(folder, filename)
