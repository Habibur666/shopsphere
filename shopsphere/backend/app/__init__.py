import traceback
from flask import Flask
from app.config import Config
from app.extensions import jwt, mail, cors, limiter, init_cloudinary
from app.utils import db as db_utils
from app.utils.response import error


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # --- Extensions ---
    db_utils.init_app(app)
    jwt.init_app(app)
    mail.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGIN"]}})
    limiter.init_app(app)
    init_cloudinary(app)

    # --- Blueprints ---
    from app.blueprints.auth.routes import auth_bp
    from app.blueprints.users.routes import users_bp
    from app.blueprints.categories.routes import categories_bp
    from app.blueprints.brands.routes import brands_bp
    from app.blueprints.products.routes import products_bp
    from app.blueprints.cart.routes import cart_bp
    from app.blueprints.wishlist.routes import wishlist_bp
    from app.blueprints.coupons.routes import coupons_bp
    from app.blueprints.orders.routes import orders_bp
    from app.blueprints.reviews.routes import reviews_bp
    from app.blueprints.banners.routes import banners_bp
    from app.blueprints.contact.routes import contact_bp
    from app.blueprints.admin.routes import admin_bp
    from app.blueprints.search.routes import search_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(brands_bp, url_prefix="/api/brands")
    app.register_blueprint(products_bp, url_prefix="/api/products")
    app.register_blueprint(cart_bp, url_prefix="/api/cart")
    app.register_blueprint(wishlist_bp, url_prefix="/api/wishlist")
    app.register_blueprint(coupons_bp, url_prefix="/api/coupons")
    app.register_blueprint(orders_bp, url_prefix="/api/orders")
    app.register_blueprint(reviews_bp, url_prefix="/api/reviews")
    app.register_blueprint(banners_bp, url_prefix="/api/banners")
    app.register_blueprint(contact_bp, url_prefix="/api/contact")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(search_bp, url_prefix="/api/search")

    # --- Global error handlers ---
    # (Image serving no longer needed here — Cloudinary serves uploaded
    #  images directly via its own CDN URLs, which are stored in full in the DB.)
    @app.errorhandler(404)
    def not_found(e):
        return error("Resource not found", 404)

    @app.errorhandler(500)
    def internal_error(e):
        from app.utils.logging import log_error
        try:
            log_error(str(e), traceback.format_exc())
        except Exception:
            pass
        return error("Internal server error", 500)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "service": "ShopSphere API"}, 200

    return app
