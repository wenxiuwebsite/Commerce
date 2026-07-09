# CCCWA Website

Static site for the Chinese Chamber of Commerce in Washington State (CCCWA), with a custom-built admin panel for bilingual (EN/中文) news and events publishing. No build step — the whole site is plain HTML/CSS/JS deployed as-is on Netlify.

## Stack

- Plain HTML/CSS/JS pages, shared nav/footer injected by `js/layout.js`, i18n via `js/main.js` (`LOCALES` + `data-i18n` attributes)
- News/events rendered client-side by `js/content.js`, which fetches `content/news.json` and `content/events.json`
- CMS: hand-built admin panel at `/admin/` (`admin/index.html`) — password-gated dashboard with News/Events tables, a rich-text article editor, and a Publish button
- Hosting: Netlify (`netlify.toml`), no build command — `publish = "."`

## Local development

You need two things installed on your machine (neither ships with this repo):

- **Python 3** — to run `serve.py`, a small static file server
- **Node.js** — to run `npx decap-server`, a local file-write proxy the admin panel's Publish button talks to (same tool Decap CMS uses; here it's just a local file-write API, no Decap involved)

Then, in **two terminals**, from the project root:

```
# Terminal 1 — serves the site itself
python serve.py

# Terminal 2 — lets the admin panel write directly to your working copy
npx decap-server
```

Open `http://localhost:8080/admin/`, log in (see `docs/SOP.md` for the password), and edit News/Events through the dashboard. Clicking **Publish to Website** writes straight to `content/news.json` / `content/events.json` / `assets/uploads/news/` on disk via the local proxy — if `decap-server` isn't running, Publish will fail and say so.

## Going live (production)

The admin panel's password check is client-side only — real protection comes from **not exposing `/admin/` to search engines** (`robots.txt` already blocks it) and from **who has access to the deployed site's `/admin/` URL**. Options to harden this further before going live:

1. Put the whole `/admin/` path behind Netlify's password protection or IP allowlisting (Site configuration → Access control), or
2. Swap the publish path from the local `decap-server` proxy to a real backend (e.g. a small serverless function that commits to Git on behalf of an authenticated user) — the local proxy only works on `localhost` and has no place in production.

### Go-live checklist

- [ ] Decide how `/admin/` will be protected in production (Netlify access control, etc.)
- [ ] Decide how Publish will actually write files in production (local `decap-server` is dev-only)
- [ ] Confirm `robots.txt` is deployed and blocks `/admin/` from search engines
- [ ] Test publish (create/edit a news item) confirmed live end-to-end

## Content model

- `content/news.json` — one JSON file holding all news articles (`items` list). Each item: bilingual title/category/summary, `date`, `cover_image`, bilingual `body_en`/`body_zh` (markdown-ish text), an optional `body_images` list for images pinned after a specific paragraph, and an optional external link ("Read original →").
- `content/events.json` — same pattern for upcoming events.
- Images uploaded through the admin panel land in `assets/uploads/news/` as real files (not base64).

## Repo layout

- `js/layout.js` — injects shared nav/footer, must not be touched when editing content rendering
- `js/main.js` — i18n, dark mode, mobile menu, contact form (no longer renders news/events — see `js/content.js`)
- `js/content.js` — fetches and renders `content/news.json` / `content/events.json` across `news.html`, `upcoming.html`, `index.html`, and `article-view.html`
- `admin/index.html` — the whole admin panel (dashboard, News/Events CRUD, rich-text editor, image upload, publish, inbox) in one file
- `docs/SOP.md` — staff-facing "how to log in and publish" guide
- `docs/FAQ.md` — common issues and fixes
