import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")

    # --- JWT ---
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_MIN", 30))
    )
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(
        days=int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES_DAYS", 30))
    )
    JWT_TOKEN_LOCATION = ["headers"]

    # --- MySQL (raw connector, no ORM) ---
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "shopsphere")
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", 10))

    # --- Mail / OTP ---
    MAIL_SERVER = os.getenv("MAIL_SERVER")
    MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS = os.getenv("MAIL_USE_TLS", "True") == "True"
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_DEFAULT_SENDER")
    OTP_EXPIRY_MINUTES = 10

    # --- Image Upload Root (strict, per spec Section 8) ---
    IMAGE_UPLOAD_ROOT = os.getenv("IMAGE_UPLOAD_ROOT", r"D:\eComImg")
    IMAGE_SUBFOLDERS = {
        "user_profile": "userProfImg",
        "product_thumbnail": "productThumbnail",
        "product_images": "productImages",
        "category_images": "categoryImages",
        "brand_logo": "brandLogo",
        "banner_images": "bannerImages",
        "review_images": "reviewImages",
    }
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
    MAX_IMAGE_SIZE_MB = 5

    # --- CORS ---
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
