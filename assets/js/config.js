/*
 * ============================================================
 *  FAITH UNDER THE STARS — SITE SETTINGS
 *  This is the only file you need to edit to change links,
 *  prices, dates, and tracking IDs. Keep the quotes and commas.
 * ============================================================
 */
window.FUTS_CONFIG = {

  site: {
    name: "Faith Under the Stars",
    url: "https://faithunderthestars.com",          // your live domain, no trailing slash
    instagramHandle: "faithunderthestars",
    instagramUrl: "https://www.instagram.com/faithunderthestars/",
    contactEmail: "hello@faithunderthestars.com",    // shown on privacy/terms pages
  },

  /*
   * EMAIL LIST (free guide signup)
   * provider: "kit" | "mailerlite" | "demo"
   *   "demo" only works while previewing on your own computer (localhost).
   *   On the live site it shows an error, so no signups are silently lost.
   *
   * In your email tool, set the form to: tag subscribers "guide" and send
   * the welcome email with the guide PDF. Turn off the tool's own
   * "redirect after signup": the page shows its own thank-you message.
   */
  email: {
    provider: "demo",
    kit: {
      formId: "",            // Kit > Grow > Landing Pages & Forms > your form > the number in the URL
    },
    mailerlite: {
      accountId: "",         // MailerLite embedded form HTML: .../jsonp/ACCOUNT_ID/forms/FORM_ID/subscribe
      formId: "",
    },
  },

  /*
   * CHECKOUT LINKS (Stripe Payment Links, Lemon Squeezy, or Gumroad)
   * Set each checkout's "after payment" / success URL to:
   *   Journal $14:  https://YOURDOMAIN/journal-thanks/?p=journal
   *   Journal $9:   https://YOURDOMAIN/journal-thanks/?p=upsell
   */
  checkout: {
    journalUrl: "",          // $14 checkout link
    journalUpsellUrl: "",    // $9 one-time-offer checkout link
  },

  prices: {
    journal: 14,
    journalUpsell: 9,
    currency: "USD",
  },

  downloads: {
    guidePdf: "/assets/downloads/faith-and-the-stars-guide.pdf",
    // Leave empty if your checkout tool emails the journal file (recommended).
    // Don't put the journal PDF in this repo: anyone could download it for free.
    journalPdf: "",
  },

  // Bonus shown on the journal page. Update each month.
  bonus: "October Sky & Scripture calendar",

  // Upcoming New Moons (YYYY-MM-DD). The site shows the first date that
  // hasn't passed yet. Add a few months at a time.
  newMoons: ["2026-10-10", "2026-11-09"],

  refundPolicyShort:
    "Because the journal is an instant digital download, all sales are final. " +
    "If your file won't open or something is wrong with it, email us and we'll make it right.",

  /*
   * TRACKING (leave blank to turn off). A cookie banner appears
   * automatically when either ID is filled in, and nothing loads until
   * the visitor clicks Accept.
   */
  analytics: {
    ga4Id: "",               // e.g. "G-XXXXXXXXXX"
    metaPixelId: "",         // e.g. "123456789012345"
  },

  /*
   * TESTIMONIALS on the journal page. The section stays hidden while
   * this list is empty. Only add real quotes, with the reader's permission.
   * Example:
   *   { quote: "This became my morning quiet time.", name: "Sarah, Scorpio sun" },
   */
  testimonials: [],
};
