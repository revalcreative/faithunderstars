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
   * BACKEND: the Google Apps Script web app URL (see backend/SETUP.md).
   * It saves guide signups to your Google Sheet, emails the guide, and
   * confirms PayPal payments. Looks like:
   *   https://script.google.com/macros/s/LONG_ID/exec
   */
  backend: {
    url: "",
  },

  /*
   * PAYPAL: your app's Client ID (public, safe to put here). The secret key
   * goes ONLY in the Apps Script's Script Properties, never in this file.
   * Use the Sandbox client ID while testing, then swap in the Live one.
   */
  paypal: {
    clientId: "",
  },

  /*
   * EMAIL LIST (free guide signup)
   * provider: "sheets" | "kit" | "mailerlite" | "demo"
   *   "sheets" uses the backend above (Google Sheet + Gmail).
   *   "demo" only works while previewing on your own computer.
   *   Kit and MailerLite are here if you move to an email tool later.
   */
  email: {
    provider: "sheets",
    kit: {
      formId: "",
    },
    mailerlite: {
      accountId: "",
      formId: "",
    },
  },

  // Must match PRODUCTS in backend/Code.gs (the backend sets the real price).
  prices: {
    journal: 14,
    journalUpsell: 9,
    currency: "USD",
  },

  downloads: {
    guidePdf: "/assets/downloads/faith-and-the-stars-guide.pdf",
    // The journal PDF is NOT here on purpose: this repo is public. Its Drive
    // link lives in the backend's Script Properties (JOURNAL_URL).
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
