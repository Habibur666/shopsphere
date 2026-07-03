-- =====================================================================
-- ShopSphere Full-Stack E-Commerce Platform
-- MySQL Schema (Raw SQL — no ORM)
-- =====================================================================
-- Notes:
--   - InnoDB engine everywhere (FK support, transactions)
--   - utf8mb4 for full unicode (Bangla text, emoji, etc.)
--   - Timestamps: created_at / updated_at pattern
--   - Soft-delete pattern used on products (is_deleted) per spec (7.1)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS shopsphere
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE shopsphere;

-- =====================================================================
-- 1. ROLES & PERMISSIONS
-- =====================================================================

CREATE TABLE roles (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(50)  NOT NULL UNIQUE,      -- 'customer', 'admin', 'super_admin' etc.
    description   VARCHAR(255) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,      -- 'product.create', 'order.update_status' etc.
    description   VARCHAR(255) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
    role_id        INT UNSIGNED NOT NULL,
    permission_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 2. USERS & OTP
-- =====================================================================

CREATE TABLE users (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id           INT UNSIGNED NOT NULL DEFAULT 1,   -- default = customer role
    name              VARCHAR(150) NOT NULL,
    email             VARCHAR(190) NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    phone             VARCHAR(20)  NULL,
    gender            ENUM('male','female','other') NULL,
    date_of_birth     DATE NULL,
    profile_img       VARCHAR(255) NULL,                 -- filename only, folder = userProfImg
    address_line      VARCHAR(255) NULL,                 -- single address, per spec
    city              VARCHAR(100) NULL,
    state             VARCHAR(100) NULL,
    postal_code       VARCHAR(20)  NULL,
    country           VARCHAR(100) NULL,
    is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_active         TINYINT(1) NOT NULL DEFAULT 1,
    remember_token    VARCHAR(255) NULL,
    refresh_token     VARCHAR(500) NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
    INDEX idx_users_email (email),
    INDEX idx_users_role (role_id)
) ENGINE=InnoDB;

CREATE TABLE user_otp (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    otp_code      VARCHAR(10) NOT NULL,
    purpose       ENUM('email_verification','change_password') NOT NULL DEFAULT 'email_verification',
    is_used       TINYINT(1) NOT NULL DEFAULT 0,
    expires_at    DATETIME NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_otp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_otp_user (user_id),
    INDEX idx_otp_code (otp_code)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. CATEGORIES & BRANDS
-- =====================================================================

CREATE TABLE categories (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    parent_id     INT UNSIGNED NULL,                 -- NULL = top-level category
    name          VARCHAR(150) NOT NULL,
    image         VARCHAR(255) NULL,                 -- folder = categoryImages
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_categories_parent (parent_id)
) ENGINE=InnoDB;

CREATE TABLE brands (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL UNIQUE,
    logo          VARCHAR(255) NULL,                 -- folder = brandLogo
    description   TEXT NULL,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 4. PRODUCTS, IMAGES, VARIANTS
-- =====================================================================

CREATE TABLE products (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id         INT UNSIGNED NOT NULL,
    subcategory_id      INT UNSIGNED NULL,
    brand_id            INT UNSIGNED NULL,
    name                VARCHAR(255) NOT NULL,
    short_description   VARCHAR(500) NULL,
    full_description    TEXT NULL,
    thumbnail           VARCHAR(255) NULL,           -- folder = productThumbnail
    price               DECIMAL(12,2) NOT NULL,
    discount            DECIMAL(5,2) NOT NULL DEFAULT 0,     -- percentage
    offer_price         DECIMAL(12,2) NULL,
    cost_price          DECIMAL(12,2) NULL,
    stock               INT NOT NULL DEFAULT 0,
    min_stock           INT NOT NULL DEFAULT 5,
    weight              DECIMAL(10,2) NULL,           -- kg
    dimensions          VARCHAR(100) NULL,            -- e.g. "20x15x10 cm"
    material            VARCHAR(150) NULL,
    color               VARCHAR(100) NULL,
    size                VARCHAR(100) NULL,
    warranty            VARCHAR(150) NULL,
    return_policy       VARCHAR(255) NULL,
    is_featured         TINYINT(1) NOT NULL DEFAULT 0,
    status              ENUM('draft','published') NOT NULL DEFAULT 'draft',
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    is_deleted          TINYINT(1) NOT NULL DEFAULT 0,   -- soft delete
    deleted_at          DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT fk_products_subcategory FOREIGN KEY (subcategory_id) REFERENCES categories(id),
    CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
    INDEX idx_products_category (category_id),
    INDEX idx_products_brand (brand_id),
    INDEX idx_products_status (status, is_active, is_deleted),
    INDEX idx_products_featured (is_featured),
    FULLTEXT INDEX ft_products_search (name, short_description)
) ENGINE=InnoDB;

CREATE TABLE product_images (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id    INT UNSIGNED NOT NULL,
    image_path    VARCHAR(255) NOT NULL,             -- folder = productImages
    sort_order    INT NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pimages_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_pimages_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE product_variants (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id    INT UNSIGNED NOT NULL,
    color         VARCHAR(100) NULL,
    size          VARCHAR(100) NULL,
    ram           VARCHAR(50)  NULL,
    storage       VARCHAR(50)  NULL,
    price         DECIMAL(12,2) NULL,                -- overrides product price if set
    stock         INT NOT NULL DEFAULT 0,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_variants_product (product_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 5. CART & WISHLIST
-- =====================================================================

CREATE TABLE carts (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NULL,                 -- NULL = guest cart
    session_id    VARCHAR(190) NULL,                 -- guest session identifier
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_carts_user (user_id),
    INDEX idx_carts_session (session_id)
) ENGINE=InnoDB;

CREATE TABLE cart_items (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id           INT UNSIGNED NOT NULL,
    product_id        INT UNSIGNED NOT NULL,
    variant_id        INT UNSIGNED NULL,
    quantity          INT NOT NULL DEFAULT 1,
    is_saved_for_later TINYINT(1) NOT NULL DEFAULT 0,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cartitems_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cartitems_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_cartitems_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    INDEX idx_cartitems_cart (cart_id),
    INDEX idx_cartitems_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE wishlists (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    product_id    INT UNSIGNED NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY uq_wishlist_user_product (user_id, product_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 6. COUPONS
-- =====================================================================

CREATE TABLE coupons (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code                VARCHAR(50) NOT NULL UNIQUE,
    type                ENUM('percentage','flat') NOT NULL,
    value               DECIMAL(12,2) NOT NULL,
    min_order_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_discount_amount DECIMAL(12,2) NULL,           -- cap for percentage coupons
    usage_type          ENUM('single','multiple') NOT NULL DEFAULT 'single',
    usage_limit         INT NULL,                     -- total redemptions allowed, NULL = unlimited
    expires_at          DATETIME NULL,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coupons_code (code)
) ENGINE=InnoDB;

CREATE TABLE coupon_usage (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    coupon_id     INT UNSIGNED NOT NULL,
    user_id       INT UNSIGNED NOT NULL,
    order_id      INT UNSIGNED NULL,
    used_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_couponusage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_couponusage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_couponusage_coupon_user (coupon_id, user_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 7. ORDERS
-- =====================================================================

CREATE TABLE orders (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id           INT UNSIGNED NOT NULL,
    order_number      VARCHAR(50) NOT NULL UNIQUE,
    status            ENUM('pending','confirmed','packed','shipped','delivered','cancelled','returned')
                        NOT NULL DEFAULT 'pending',
    shipping_name     VARCHAR(150) NOT NULL,
    shipping_phone    VARCHAR(20)  NOT NULL,
    shipping_address  VARCHAR(500) NOT NULL,
    billing_address   VARCHAR(500) NULL,
    shipping_charge   DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
    coupon_id         INT UNSIGNED NULL,
    discount_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    subtotal_amount   DECIMAL(12,2) NOT NULL,
    total_amount      DECIMAL(12,2) NOT NULL,
    payment_method    ENUM('cod') NOT NULL DEFAULT 'cod',
    placed_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL,
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_number (order_number)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id              INT UNSIGNED NOT NULL,
    product_id            INT UNSIGNED NOT NULL,
    variant_id            INT UNSIGNED NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,     -- preserve name at time of order
    unit_price            DECIMAL(12,2) NOT NULL,
    quantity              INT NOT NULL,
    line_subtotal         DECIMAL(12,2) NOT NULL,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_orderitems_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT fk_orderitems_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    INDEX idx_orderitems_order (order_id),
    INDEX idx_orderitems_product (product_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. REVIEWS
-- =====================================================================

CREATE TABLE reviews (
    id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id            INT UNSIGNED NOT NULL,
    user_id               INT UNSIGNED NOT NULL,
    order_id              INT UNSIGNED NULL,          -- used to derive verified-purchase flag
    rating                TINYINT UNSIGNED NOT NULL,  -- 1-5
    review_text           TEXT NULL,
    is_verified_purchase  TINYINT(1) NOT NULL DEFAULT 0,
    created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    UNIQUE KEY uq_review_user_product (user_id, product_id),
    INDEX idx_reviews_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE review_images (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    review_id     INT UNSIGNED NOT NULL,
    image_path    VARCHAR(255) NOT NULL,             -- folder = reviewImages
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reviewimages_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 9. BANNERS
-- =====================================================================

CREATE TABLE banners (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type          ENUM('homepage','offer','carousel') NOT NULL DEFAULT 'homepage',
    title         VARCHAR(200) NULL,
    image_path    VARCHAR(255) NOT NULL,             -- folder = bannerImages
    link_url      VARCHAR(255) NULL,
    sort_order    INT NOT NULL DEFAULT 0,
    is_active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 10. CONTACT
-- =====================================================================

CREATE TABLE contact_messages (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(190) NOT NULL,
    subject       VARCHAR(200) NULL,
    message       TEXT NOT NULL,
    status        ENUM('new','read','replied') NOT NULL DEFAULT 'new',
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE contact_replies (
    id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    contact_message_id  INT UNSIGNED NOT NULL,
    admin_id            INT UNSIGNED NOT NULL,
    reply_text          TEXT NOT NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reply_message FOREIGN KEY (contact_message_id) REFERENCES contact_messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_reply_admin FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =====================================================================
-- 11. INVENTORY LOGS
-- =====================================================================

CREATE TABLE inventory_logs (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id        INT UNSIGNED NOT NULL,
    variant_id        INT UNSIGNED NULL,
    change_type       ENUM('increase','decrease') NOT NULL,
    quantity_changed  INT NOT NULL,
    reason            VARCHAR(255) NULL,             -- e.g. 'order_placed', 'restock', 'order_cancelled'
    reference_order_id INT UNSIGNED NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_invlogs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_invlogs_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
    CONSTRAINT fk_invlogs_order FOREIGN KEY (reference_order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_invlogs_product (product_id)
) ENGINE=InnoDB;

-- =====================================================================
-- 12. LOGGING (login / activity / error)
-- =====================================================================

CREATE TABLE login_logs (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NULL,                 -- NULL if login attempt with unknown email
    email_attempted VARCHAR(190) NULL,
    ip_address    VARCHAR(45) NULL,
    user_agent    VARCHAR(255) NULL,
    status        ENUM('success','failed') NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_loginlogs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_loginlogs_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NULL,
    actor_role    ENUM('user','admin') NOT NULL DEFAULT 'user',
    action        VARCHAR(150) NOT NULL,             -- e.g. 'product.create', 'order.cancel'
    description   VARCHAR(500) NULL,
    ip_address    VARCHAR(45) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activitylogs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_activitylogs_user (user_id),
    INDEX idx_activitylogs_action (action)
) ENGINE=InnoDB;

CREATE TABLE error_logs (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    error_message TEXT NOT NULL,
    stack_trace   TEXT NULL,
    endpoint      VARCHAR(255) NULL,
    http_method   VARCHAR(10) NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =====================================================================
-- 13. SEARCH HISTORY
-- =====================================================================

CREATE TABLE search_history (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED NOT NULL,
    keyword       VARCHAR(255) NOT NULL,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_searchhistory_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_searchhistory_user (user_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- SEED DATA — default roles
-- =====================================================================

INSERT INTO roles (name, description) VALUES
    ('customer', 'Default storefront user'),
    ('admin', 'Store administrator'),
    ('super_admin', 'Full system access');

-- =====================================================================
-- End of schema
-- =====================================================================
