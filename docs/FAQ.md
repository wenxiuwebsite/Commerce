# FAQ

## My cover image shows broken/blank on the site

Check that you used the **Upload** button in the admin panel rather than typing a path by hand. Uploaded images are saved under `assets/uploads/news/` and the field is filled in automatically — if you type a path yourself and it doesn't exactly match a real file there, the image will be broken.

## I published, but the website still shows the old content

Confirm you clicked **Publish to Website** on the Publish page (not just **Save Article**, which only keeps a local draft in your browser). If you did, and it's still showing old content, try a hard refresh (Ctrl+Shift+R) in case your browser cached the old `content/news.json`.

## I need a news category that isn't in the dropdown

Type the new category name directly into the Category (English) field, fill in the matching Chinese name, then click **+ Save** next to it — this adds it as a reusable category for future articles too.

## Publish fails with an error about the local backend

The admin panel's Publish button writes files through a local proxy (`decap-server`) that has to be running alongside the site itself. Open a second terminal and run `npx decap-server`, then try publishing again — see `docs/SOP.md` "Local development".

## Uploading an image does nothing / never finishes

Same cause as above — image uploads also go through the local `decap-server` proxy. Make sure it's running in a second terminal before uploading.

## I uploaded a photo but it isn't on the website yet

That's expected. Photos are held with the rest of your draft and go up on the next **Publish**, so all your changes cost a single publish instead of one per photo. The Publish page tells you how many images are waiting. Closing the tab doesn't lose them.

## A news title shows a wall of code instead of the headline

This happens when a headline is copied out of a WeChat article: WeChat hands over the styling along with the words. Titles now keep only the text, both when you paste and when the page renders, so it fixes itself — just re-open the article, paste the headline again, and Publish.

## An image copied from a WeChat article shows as broken

WeChat blocks its images from loading on other websites, so anything still pointing at a `mmbiz.qpic.cn` address will look broken no matter what. The image has to be saved out of the WeChat article and re-uploaded here with the **Upload** button.

## Chinese text looks garbled (mojibake) somewhere on the site

This is almost always a missing UTF-8 charset when a file is served. `serve.py` explicitly sets UTF-8 charsets for `.json`/`.md` to avoid this locally; if you see it in production, confirm Netlify is serving `content/news.json` with a `charset=utf-8` content type (it does by default for `.json`).

## My uploaded image makes the page load slowly

Keep images under roughly 500 KB where possible — resize/compress large photos before uploading rather than uploading camera-original files directly.
