# Diagnostics Collections Admin

A tiny Next.js app to **fetch, create, and update** diagnostics collections in production
(`nal.tmmumbai.in`). Deployable to Vercel.

## How it works

- The UI runs in the browser; all prod API calls go through a **server-side proxy**
  (`app/api/collections/route.js`) so there's no CORS issue and the token only travels
  in request headers.
- You paste a **Bearer token** at the top. It's stored only in your browser's
  `localStorage`. When a call returns **401**, the token has expired — paste a fresh one.

## Endpoints proxied

| UI action | Upstream |
|---|---|
| Fetch list | `GET /v1/collections?status=COLLECTION_STATUS_ACTIVE` |
| Create | `POST /v1/local/diagnostics/collections` (no `collection_id`) |
| Update | `POST /v1/local/diagnostics/collections` (with `collection_id`) |

The form is **create vs. update** based on whether the Collection ID field is filled.
Click **Edit** on any listed row to load it into the form in update mode.

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

## Deploy to Vercel

```bash
npm i -g vercel   # if not installed
vercel            # follow prompts (first run links/creates the project)
vercel --prod     # production deploy
```

Or push this folder to a Git repo and import it at vercel.com — no env vars needed
(the token is entered at runtime in the UI).

## Field notes

- **Priority** = homepage display order.
- **Status**: `1` = active, `2` = inactive.
- **Variant**: defaults to `COLLECTION_VARIANT_PRODUCT_HOME`.
- **Product IDs**: enter one per line or comma-separated.
- **Remove product IDs** only applies in update mode.
