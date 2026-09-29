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

Then open http://localhost:8787. While `email.provider` is `"demo"`, signups work locally without sending anything. On the live site, demo mode shows an error instead, so leads are never silently lost.

Old `/journal` and `/thank-you` links redirect to the home page.

## Launch checklist

1. **Email (Kit or MailerLite)**
   - Create a form, set it to tag subscribers `guide`, and set the welcome email to include the guide PDF.
   - In `config.js`, set `email.provider` to `"kit"` or `"mailerlite"` and fill in the IDs.
   - Turn off the provider's own "redirect after signup" (the page shows its own thank-you).
2. **Checkout (Stripe Payment Links, Lemon Squeezy, or Gumroad)**
   - Create two products: Journal $14 and Journal $9 (upsell). Upload the journal PDF to the checkout tool so it delivers the file.
   - Set the after-payment URLs:
     - $14: `https://faithunderthestars.com/journal-thanks/?p=journal`
     - $9: `https://faithunderthestars.com/journal-thanks/?p=upsell`
     - Stripe only: add `&session_id={CHECKOUT_SESSION_ID}` so purchases aren't double-counted.
   - Paste both checkout links into `config.js`.
   - Add buyers to your email list tagged `journal-buyer` using the checkout tool's Kit/MailerLite integration or Zapier.
3. **Tracking.** Paste your GA4 ID and Meta Pixel ID into `config.js`. A cookie banner then appears automatically, and nothing loads until a visitor accepts. Events sent:

   | Moment | GA4 | Meta |
   |---|---|---|
   | Guide signup | `guide_signup` | `Lead` |
   | Buy button click | `begin_checkout` | `InitiateCheckout` |
   | Confirmation page | `purchase` | `Purchase` |

   In GA4, mark `guide_signup` and `purchase` as key events.
4. **Legal.** Fill in the bracketed items in `/privacy/` and `/terms/`, then delete the yellow "Draft for review" notes.
5. **Monthly upkeep.** Add upcoming New Moon dates to `newMoons` and update `bonus`.
6. **Deploy.** Connect this repo in Netlify, Vercel, or Cloudflare Pages with no build command and publish directory `.`, then add your custom domain. If the domain isn't `faithunderthestars.com`, find and replace it in the HTML files, `robots.txt`, and `sitemap.xml`.

UTM parameters on your Instagram links (for example `?utm_source=instagram&utm_medium=bio`) are carried through to the checkout links automatically.

## Updating images from new Canva exports

The two covers, the journal's Day 1 sample page, the share image, and the favicon are generated from the PDFs. The guide's inside pages are never shown on the site:

```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf pillow
.venv/bin/python tools/build_images.py "path/to/Free Guide.pdf" "path/to/Journal.pdf"
```

This also copies the free guide to `assets/downloads/`. The paid journal PDF is never copied into the site, and `.gitignore` blocks it from being committed.
