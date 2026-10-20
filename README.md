# Artify Admin Panel (HTML, CSS, JavaScript)

This standalone admin dashboard is based on the uploaded Artify Flutter project. The app is an art-supplies shop, not a shoe shop. The existing Supabase schema contains `products`, `orders`, and `order_items`. The Flutter catalog reads active rows from `public.products`, and the order checkout is managed by Supabase functions.

## Files
- `index.html` — page structure, login form, dashboard, product form, order detail modal.
- `css/styles.css` — layout, responsive styling, colors, table and modal styles.
- `js/config.js` — Supabase project URL and public anon/publishable key.
- `js/app.js` — Supabase authentication, admin verification, product CRUD, stock view, order list/status updates.
- `sql/admin_setup.sql` — admin-only RLS policies for managing products and viewing/updating orders.

## Setup
1. Open `js/config.js`.
2. Confirm the Supabase project URL is the same project used by the Flutter app.
3. Replace `PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE` with the project's public anon/publishable key. The uploaded Flutter project contains a public client key in its Dart config; use the matching current key from Supabase Project Settings if it has rotated.
4. In Supabase SQL Editor, run `sql/admin_setup.sql` as the project owner.
5. Promote the intended admin account using the commented SQL at the bottom of that file. Replace `AUTH_USER_UUID` with the account's Auth user UUID. Never use a service-role key in this frontend.
6. Sign out/in again after promotion so the user's JWT receives the admin role.
7. Serve this folder through a local static server (recommended), rather than opening `index.html` directly. For example, with Python installed: `python -m http.server 8000` from this folder, then visit `http://localhost:8000`.

## Features
- Email/password sign-in using Supabase Auth.
- Verifies `current_user_role()` and rejects non-admin accounts.
- Dashboard metrics for products, active products, low stock (10 or fewer), and orders.
- Product list search and status filters.
- Add/edit products and activate/deactivate catalog items.
- Inventory and low-stock overview.
- Order search, order detail view, and order-status update.
- Responsive layout for desktop and mobile.

## Important security notes
- Never add a Supabase service-role key, PayMongo secret, or webhook secret to browser code.
- Product and order management must be protected by Row Level Security. The SQL setup creates policies that rely on the trusted `app_metadata.role` claim.
- Existing `orders` schema intentionally revokes normal customer access. The admin policies are required for the browser dashboard to read orders.
- The browser dashboard does not edit Auth roles, access payment secrets, or read `order_items`. Role promotion must be done by a trusted project owner or a protected server-side function.
- Product images may be public URLs. Flutter asset paths such as `assets/products/sketchbook.jpg` are local to the Flutter app and will not resolve in the browser; upload images to Supabase Storage or use a public HTTPS URL for browser previews.
- If the browser shows a permission error, check that migrations are applied and that the signed-in user has `app_metadata.role = admin`.

## Product fields used
`name`, `brand`, `category`, `description`, `price`, `stock`, `icon_name`, `tint_hex`, `image_url`, `is_active`. Existing `rating`, `reviews`, and `created_at` columns are left untouched when editing.
