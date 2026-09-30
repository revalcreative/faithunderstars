# Faith Under the Stars — website

A single landing page for [@faithunderthestars](https://www.instagram.com/faithunderthestars/): it sells the Sky & Scripture Journal and offers the Faith & the Stars guide as a free companion (email opt-in). After signup, the page shows a thank-you message and a $9 one-day journal offer in place, with no redirect.

This is a plain static site with no build step, so it can go straight to Netlify, Vercel, or Cloudflare Pages.

| Page | Path | Purpose |
|---|---|---|
| Home | `/` | The whole funnel: journal ($14), free guide signup, $9 offer after signup |
| Purchase confirmation | `/journal-thanks/` | Where checkout sends buyers |
| Privacy, Terms | `/privacy/`, `/terms/` | Drafts: review before launch |

## Everything you'll edit is in one file

**`assets/js/config.js`** holds the email provider and form ID, checkout links, prices, New Moon dates, bonus text, GA4 and Meta Pixel IDs, refund wording, and testimonials. Each setting has a comment explaining it.

## Preview on your computer

```bash
python3 -m http.server 8787
```

Then open http://localhost:8787. On your own computer, signups are simulated until `backend.url` is set, so nothing gets sent while you test. On the live site, demo mode shows an error instead, so leads are never silently lost.

Old `/journal` and `/thank-you` links redirect to the home page.

## Launch checklist

1. **Guide signups and journal checkout.** Follow [`backend/SETUP.md`](backend/SETUP.md):
   - A Google Sheet saves every guide signup and order.
   - Gmail sends the guide and the journal download link.
   - PayPal takes payment by PayPal account or card.
   - Put the web app URL in `config.js` as `backend.url`, and the PayPal **Client ID** as `paypal.clientId`. The PayPal **secret** and the journal PDF link live only in the script's settings, never in this public repo.
2. **Tracking.** Paste your GA4 ID and Meta Pixel ID into `config.js`. A cookie banner then appears automatically, and nothing loads until a visitor accepts. Events sent:

   | Moment | GA4 | Meta |
   |---|---|---|
   | Guide signup | `guide_signup` | `Lead` |
   | PayPal checkout opened | `begin_checkout` | `InitiateCheckout` |
   | Payment confirmed | `purchase` | `Purchase` |

   In GA4, mark `guide_signup` and `purchase` as key events.
3. **Legal.** Fill in the bracketed items in `/privacy/` and `/terms/`, then delete the yellow "Draft for review" notes.
4. **Monthly upkeep.** Add upcoming New Moon dates to `newMoons`, update `bonus`, and swap the bonus Drive link (`BONUS_URL`) in the script's settings.

## Hosting

The site is served by **GitHub Pages** from the `main` branch. The `CNAME` file points it at faithunderthestars.com, with DNS at Namecheap. Every push to `main` goes live in a minute or two. The `netlify.toml`, `vercel.json`, and `_redirects` files are only used if you ever move to one of those hosts.

## Updating images from new Canva exports

The two covers, the journal's Day 1 sample page, the share image, and the favicon are generated from the PDFs. The guide's inside pages are never shown on the site:

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf pillow
.venv/bin/python tools/build_images.py "path/to/Free Guide.pdf" "path/to/Journal.pdf"
```

This also copies the free guide to `assets/downloads/`. The paid journal PDF is never copied into the site, and `.gitignore` blocks it from being committed.
