# ARTSPACE

ARTSPACE is an installable React PWA for artists and art viewers. It uses Supabase Auth, Postgres, Storage, row-level security, and Realtime so accounts and artworks can be shared across devices.

## Run locally

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using the project's public URL and anon/publishable key. Never put a Supabase service-role key in this frontend.
3. Apply the SQL migrations in `supabase/migrations/` in filename order in the Supabase SQL Editor (or with the Supabase CLI).
4. In the Supabase Auth settings, configure the allowed site URL and redirect URLs for local development and the deployed site. Enable email confirmation if desired.
5. Install dependencies with `npm install`, then run `npm run dev`.

The first screen is login. Register as an **Art Peeper** to browse, like, comment, follow, and save work, or as an **Art Maker** to create a profile and publish work. Artwork uploads are compressed before upload and limited to 15 MB at selection time.

### Branded confirmation email

The confirmation email HTML is in `supabase/templates/confirmation.html`. In Supabase, open **Authentication → Email Templates → Confirm signup**, replace the message body with this file, and save it. Set the sender display name to `ARTSPACE` in the Auth SMTP/email provider settings. Add `http://127.0.0.1:5173/auth/confirmed` and the deployed `/auth/confirmed` URL to **Authentication → URL Configuration → Redirect URLs**. After a signup confirmation link returns to the app, the confirmation route shows a congratulations modal immediately; its button signs out the temporary confirmation session and takes the user to login. The message logo loads from `{{ .SiteURL }}`, so it can be displayed in email after setting Site URL to a public deployment; a local-only URL cannot serve the logo to external mail apps. A sender avatar shown by Gmail/other mail providers is controlled by those providers and the sender's domain/account configuration, not by the email HTML.

## Deploy and install

### Cloudflare Pages (Direct Upload)

1. Build the app locally with `npm run build` after setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Direct Upload**, create a Pages project, and upload the contents of the generated `dist` folder.
3. In Supabase **Authentication → URL Configuration**, set the Pages HTTPS URL as the Site URL and add it to the Redirect URLs. Keep the local development redirect URL if needed.
4. For later updates, rebuild and upload the new `dist` folder. The `_redirects` and `_headers` files in `public/` are copied into `dist` for SPA routing and service-worker refreshes.

The existing Netlify deployment is also supported: the included `netlify.toml` builds with `npm run build` and publishes `dist`. Visitors can install the PWA from their browser's install option on desktop or mobile.

The app is not ready for public use until it is connected to a real Supabase project and deployed with those environment variables. The public anon key is intended for browser use and is protected by the included row-level security policies; keep the service-role key private.

## Features

- Separate Art Peeper and Art Maker accounts, email/password authentication, profile editing (including independent Peeper display names and profile photos), and logout.
- Shared creator artwork, image storage, threaded owner replies on comments, likes, bookmarks, and artist follows with follower and following lists. Comments retain whether their author posted in Maker or Peeper mode so the correct independent display name is shown.
- Creator home feed with All Space / 2D Art / 3D Art filters, masonry cards, a click-to-reveal new-artwork notification, pagination, and realtime notifications.
- Explore search/categories, artist directory and profiles, a community Home feed for both account modes, and Peeper saved-artwork collection all use the shared backend.
- Artwork images are stored in the Supabase `artworks` bucket as WebP. Source selections larger than 15 MB are rejected and valid selections are resized/compressed before upload.
- SPA routing and an installable PWA shell are configured for Cloudflare Pages and Netlify. Offline mode caches the app shell only; backend content requires a network connection.

Existing browser-local accounts cannot be migrated as Supabase credentials. Users need to register again; any local-only artwork must be uploaded by its owner after creating a Maker account.

## Checks

Run `npm run lint` and `npm run build`.
