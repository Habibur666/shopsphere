# ShopSphere — Full Stack E-Commerce Platform

Raw-SQL Flask backend + React/Tailwind frontend + MySQL database, built exactly per the ShopSphere Master Prompt spec (no ORM, OTP-based email verification, COD-only checkout, strict local image folder structure).

```
shopsphere/
├── backend/          Flask API (raw SQL, JWT + OTP auth, image uploads)
├── frontend/          React + Tailwind + Redux Toolkit storefront + admin panel
└── database/
    └── schema.sql     Full MySQL schema (27 tables)
```

---

## 1. Database Setup

1. Install MySQL 8+ and make sure it's running.
2. Import the schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   This creates the `shopsphere` database, all tables, and seeds the default roles
   (`customer`, `admin`, `super_admin`).
3. To make yourself an admin: register a normal account through the app, verify it
   via OTP, then run:
   ```sql
   UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'super_admin')
   WHERE email = 'you@example.com';
   ```

---

## 2. Backend Setup (Flask)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
copy .env.example .env       # Windows: copy, macOS/Linux: cp
```

Edit `.env`:
- Set `DB_PASSWORD` to your MySQL password.
- Set `MAIL_USERNAME` / `MAIL_PASSWORD` to a real SMTP account (e.g. a Gmail App
  Password) so OTP emails actually send.
- Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` —
  get these free from https://cloudinary.com/console (free tier is plenty for
  development and small production use). All image uploads (product photos,
  profile pictures, category/brand images, banners, review photos) go through
  Cloudinary now — nothing is written to local disk, so this works the same
  whether you're running locally or deployed to any server/host.

Run the API:
```bash
python run.py
```
The API is now live at `http://localhost:5000`. Health check: `GET /api/health`.

---

## 3. Frontend Setup (React)

```bash
cd frontend
npm install
npm run dev
```
The storefront runs at `http://localhost:5173` and proxies `/api` requests to
the Flask backend automatically (see `vite.config.js`). Uploaded images are
served directly from Cloudinary's CDN — the frontend just uses the URL
returned by the API as-is.

---

## 4. Default Roles

| Role         | Access                                              |
|--------------|------------------------------------------------------|
| `customer`   | Storefront: browse, cart, checkout, reviews, profile |
| `admin`      | Everything above + Admin Panel (products, orders...) |
| `super_admin`| Everything above + role/permission management, error logs |

---

## 5. Key Architectural Notes (per spec)

- **No ORM anywhere.** Every database call in `backend/app/blueprints/**` and
  `backend/app/utils/db.py` is a raw, parameterized SQL query executed through a
  `mysql-connector-python` connection pool.
- **Image uploads** go through `backend/app/utils/file_upload.py`, which
  uploads to Cloudinary (one dedicated Cloudinary folder per image type,
  mirroring the original per-type folder structure) and stores the returned
  secure CDN URL directly in the database. The frontend uses that URL as-is
  for `<img src>` — no local file serving route is needed, and this works
  identically whether the app runs on your laptop or on a production server.
- **Auth** is JWT (access + refresh) via `flask-jwt-extended`, with **OTP-based**
  (not link-based) email verification. There is intentionally **no forgot/reset
  password flow** — users must know their current password to change it.
- **Checkout is Cash on Delivery only** — no payment gateway integration exists
  anywhere in the codebase.
- Full REST API surface lives under `/api/*`; see each blueprint's `routes.py`
  for the exact endpoints (auth, users, categories, brands, products, cart,
  wishlist, coupons, orders, reviews, banners, contact, admin, search).

## 6. What's included vs. left as follow-up

Implemented end-to-end: auth + OTP, profile, categories/brands/products (with
variants, multi-image gallery, soft delete/restore, draft/publish), search +
filters + sorting, cart (guest + merge-on-login), wishlist, coupons, COD
checkout with stock deduction and inventory logging, order status workflow,
PDF invoices, reviews with verified-purchase detection, banners, contact +
admin reply, full admin dashboard (cards + charts), logging (login/activity/
error), and a complete React storefront + admin panel.

Left as straightforward follow-up work (structure and patterns are already in
place to extend): Swagger/OpenAPI docs, automated test suite, Dockerfiles/
docker-compose, and CSRF middleware (the API is JWT-bearer-token based, which
is inherently CSRF-resistant for the typical SPA usage pattern here, but you
may want explicit CSRF headers if you add cookie-based auth later).
