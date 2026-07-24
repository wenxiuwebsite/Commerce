# Staff Guide: Logging In & Publishing News

This is the day-to-day guide for CCCWA staff publishing news and events through the website's admin panel. No coding required.

## 1. How to log in

1. Go to `https://www.ccc-wa.org/admin/` (replace with the real domain once live; on your own machine it's `http://localhost:8080/admin/`).
2. Enter the shared admin password and click **Sign In**. (Ask whoever manages the site for the current password — it's not written down here on purpose.)

> TODO (screenshot): login screen with password field.

This is a simple shared-password gate, not a per-person account system — treat the password the way you'd treat a shared office door key.

## 2. How to publish a news article

1. After logging in, click **News Articles** in the left sidebar, then **+ New Article** (or click **Edit** on an existing one).
2. Fill in at minimum: **Publish Date**, **Category**, and **Title (Chinese)** — Chinese title is required, English title is optional but recommended.
3. Leave **Summary** blank if you want the site to auto-generate a short excerpt from the body; fill it in for a custom one.
4. Upload a **Featured Image** using the Upload button — this appears on the news list card and at the top of the article. Keep images under 500 KB where possible (see `docs/FAQ.md`).
5. Build the article body using **Content Blocks**: click **+ Text Block** for a paragraph of writing (with a bold/italic/heading/list/link toolbar), or **+ Image Block** to drop in a photo with its own alignment, size, and caption. Add as many blocks as you need, in any order — use the ▲/▼ arrows to reorder, or × to remove one.
6. If this article was originally published elsewhere (e.g. WeChat), paste that URL into **External Link** — the site will show a "Read original →" link at the bottom of the article.
7. Click **Preview** any time to see how the article will actually look, in either language.
8. Click **Save Article**, then go to **Publish** in the sidebar and click **Publish to Website**.

> TODO (screenshot): the news entry editor with a text block and an image block both open.

Saving keeps your changes in this browser only (a local draft). **Publishing** is the step that actually writes `content/news.json` / `content/events.json` to disk — nothing is public until you do that.

Photos work the same way as text: uploading one shows it in the editor straight away, but it isn't on the website until you press **Publish**. Everything — all the text and every image — then goes up together in a single step. That is deliberate: the site's hosting plan charges per publish, so batching them keeps the cost down no matter how many photos an article has. It's safe to close the tab in between; queued photos are still there when you come back.

> Titles are always plain text. If you paste a headline copied from a WeChat article, only the words are kept — the styling that comes with it is dropped automatically.

## 3. How to add or edit an event

Same idea, under **Events** in the sidebar: date, time, bilingual title/location/description, and a registration link (defaults to `contact.html`).

## 4. Keeping hosting costs down

Netlify bills this site almost entirely by **number of Production deploys** — roughly 15 credits each, against 300 free credits a month, so about **20 publishes a month** is the budget. Bandwidth and traffic are rounding errors next to it.

**One Publish = one deploy**, no matter how much went into it. Ten articles and forty photos published together cost the same as fixing a single typo. So the whole game is batching: edit freely, Publish once at the end.

For anyone administering the Netlify account, two dashboard settings under **Site configuration → Build & deploy → Continuous deployment** matter:

- **Deploy Previews** → set to **None**. Otherwise every pull request builds the site again. ("Previews use little bandwidth" is true and irrelevant — the cost is the deploy, not the traffic.)
- **Branch deploys** → set to **None** (production branch only), so work on a side branch doesn't deploy.

`netlify.toml` also carries `ignore = "exit 0"` for both of those contexts as a backstop, but the dashboard is what actually decides whether a deploy starts.

### Checking it's working

Open **Deploys** in the Netlify dashboard after publishing. You should see exactly **one** new Production deploy per Publish, labelled `Update site content via admin` — with the image count appended when photos went along, e.g. `Update site content via admin (+8 images)`.

If you ever see a run of separate `Upload image via admin` deploys stacked up, per-file committing has come back and the fix has regressed. For reference, that's what the history looked like before: 138 admin deploys (~2,070 credits) for what was really 8 editing sessions (~120 credits).

## 5. Local development

You need two terminals running at the same time:

1. Terminal 1: `python serve.py` — serves the site itself.
2. Terminal 2: `npx decap-server` — a local proxy that lets the admin panel's Publish button write real files to your project folder. (This is a generic local file-write tool; nothing here depends on Decap CMS.)
3. Visit `http://localhost:8080/admin/` and log in with the password.
4. Edits you Publish here write directly to `content/news.json`, `content/events.json`, and `assets/uploads/news/` in your local project folder. Nothing is pushed to GitHub until you commit/push those file changes yourself.

If Publish fails with an error mentioning the local backend, it means `npx decap-server` isn't running — start it and try again.
