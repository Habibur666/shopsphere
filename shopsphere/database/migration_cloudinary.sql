-- =====================================================================
-- Migration: Switch image storage from local disk to Cloudinary
-- Run this on an EXISTING shopsphere database (one you already created
-- from the original schema.sql). Safe to run even if some columns are
-- already VARCHAR(500) — MySQL will just no-op on those.
-- =====================================================================

USE shopsphere;

ALTER TABLE users        MODIFY profile_img  VARCHAR(500) NULL;
ALTER TABLE categories   MODIFY image        VARCHAR(500) NULL;
ALTER TABLE brands       MODIFY logo         VARCHAR(500) NULL;
ALTER TABLE products     MODIFY thumbnail    VARCHAR(500) NULL;
ALTER TABLE product_images MODIFY image_path VARCHAR(500) NOT NULL;
ALTER TABLE review_images  MODIFY image_path VARCHAR(500) NOT NULL;
ALTER TABLE banners        MODIFY image_path VARCHAR(500) NOT NULL;

-- Note: any product/category/etc. created BEFORE this migration has an old
-- local filename (e.g. "abc123.jpg") stored, not a Cloudinary URL. Those old
-- images won't display anymore since the local /media/ route was removed.
-- Simplest fix: re-upload the thumbnail/logo/image for any records created
-- before you switched to Cloudinary. New uploads from now on will work
-- automatically.
