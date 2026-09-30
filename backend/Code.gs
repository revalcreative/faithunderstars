/**
 * Faith Under the Stars — backend (Google Apps Script)
 *
 * Lives inside a Google Sheet (Extensions > Apps Script). It:
 *   - saves free guide signups to the "Subscribers" tab and emails the guide
 *   - creates and confirms PayPal orders for the journal, logs them to the
 *     "Orders" tab, and emails the buyer their download link
 *
 * Setup steps are in backend/SETUP.md. Private values (PayPal secret, the
 * journal's Drive link) go in Project Settings > Script Properties, never
 * in this file or on the website.
 *
 * Script Properties:
 *   PAYPAL_CLIENT_ID   PayPal app client ID
 *   PAYPAL_SECRET      PayPal app secret
 *   PAYPAL_ENV         "sandbox" for testing, "live" for real payments
 *   JOURNAL_URL        Google Drive share link to the journal PDF
 *   BONUS_URL          (optional) Drive link to this month's bonus calendar
 *   REPLY_TO           (optional) address replies should go to
 */

// Prices are set here, on the server, so nobody can change what they pay.
// Keep these in step with "prices" in the website's config.js.
var PRODUCTS = {
  journal: { name: "Sky & Scripture Journal", price: "14.00" },
  upsell: { name: "Sky & Scripture Journal (thank-you price)", price: "9.00" },
};

var BRAND = "Faith Under the Stars";
var SITE_URL = "https://faithunderthestars.com";
var GUIDE_URL = SITE_URL + "/assets/downloads/faith-and-the-stars-guide.pdf";
var INSTAGRAM_URL = "https://www.instagram.com/faithunderthestars/";

// ---------- web entry points ----------

function doPost(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === "signup") return json(signup(p));
    if (p.action === "create_order") return json(createOrder(p));
    if (p.action === "capture_order") return json(captureOrder(p));
    return json({ ok: false, error: "unknown_action" });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return json({ ok: false, error: "server_error" });
  }
}

function doGet() {
  return json({ ok: true, service: BRAND });
}

/** Run once from the editor: creates the tabs and asks for permissions. */
function setup() {
  tab("Subscribers", ["Date", "First name", "Email", "Source", "Campaign"]);
  tab("Orders", ["Date", "PayPal order ID", "Product", "Amount", "Email", "Name", "Status"]);
  console.log("Emails left today: " + MailApp.getRemainingDailyQuota());
}

// ---------- guide signup ----------

function signup(p) {
  if (p.company) return { ok: true }; // hidden spam trap field was filled in
  var email = String(p.email || "").trim().toLowerCase();
  var name = String(p.first_name || "").trim().slice(0, 80);
  if (!isEmail(email)) return { ok: false, error: "invalid_email" };

  var sheet = tab("Subscribers", ["Date", "First name", "Email", "Source", "Campaign"]);
  withLock(function () {
    if (!findRow(sheet, 3, email)) {
      sheet.appendRow([new Date(), name, email, p.utm_source || "", p.utm_campaign || ""]);
    }
  });

  MailApp.sendEmail({
    to: email,
    name: BRAND,
    replyTo: prop("REPLY_TO") || undefined,
    subject: "Your Faith & the Stars guide",
    htmlBody: emailHtml(
      "Hi " + esc(name || "friend") + ",",
      "Thank you for joining us under the stars. Here's your free guide: your Big Three, " +
        "all 12 signs, and every moon phase, each paired with Scripture.",
      "Download the guide",
      GUIDE_URL,
      "The sky starts the conversation. God's Word finishes it."
    ),
  });
  return { ok: true };
}

// ---------- PayPal ----------

function createOrder(p) {
  var product = PRODUCTS[p.product];
  if (!product) return { ok: false, error: "unknown_product" };
  var order = paypal("post", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: p.product,
      description: product.name,
      amount: { currency_code: "USD", value: product.price },
    }],
    application_context: {
      brand_name: BRAND,
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
    },
  });
  return { ok: true, id: order.id };
}

function captureOrder(p) {
  var id = String(p.order_id || "");
  if (!/^[A-Z0-9]{8,30}$/.test(id)) return { ok: false, error: "bad_order" };
  var sheet = tab("Orders", ["Date", "PayPal order ID", "Product", "Amount", "Email", "Name", "Status"]);

  return withLock(function () {
    var existing = findRow(sheet, 2, id);
    if (existing) {
      // Already paid (for example, the buyer refreshed): hand the link back again.
      return existing[6] === "COMPLETED"
        ? { ok: true, product: existing[2], downloadUrl: prop("JOURNAL_URL") }
        : { ok: false, error: "not_completed" };
    }

    var res = paypal("post", "/v2/checkout/orders/" + id + "/capture", {});
    var unit = (res.purchase_units || [])[0] || {};
    var cap = ((unit.payments || {}).captures || [])[0] || {};
    var amount = (cap.amount || {}).value;
    var key = PRODUCTS[unit.reference_id] ? unit.reference_id : productForPrice(amount);
    var email = (res.payer && res.payer.email_address) ||
      (res.payment_source && res.payment_source.paypal && res.payment_source.paypal.email_address) || "";
    var name = (res.payer && res.payer.name && res.payer.name.given_name) || "";

    var ok = res.status === "COMPLETED" && cap.status === "COMPLETED" && key &&
      PRODUCTS[key].price === amount && (cap.amount || {}).currency_code === "USD";
    sheet.appendRow([new Date(), id, key || "unknown", amount || "", email, name, ok ? "COMPLETED" : (cap.status || res.status)]);
    if (!ok) return { ok: false, error: "not_completed" };

    if (email) sendJournalEmail(name, email);
    return { ok: true, product: key, downloadUrl: prop("JOURNAL_URL") };
  });
}

function sendJournalEmail(name, email) {
  var bonus = prop("BONUS_URL");
  MailApp.sendEmail({
    to: email,
    name: BRAND,
    replyTo: prop("REPLY_TO") || undefined,
    subject: "Your Sky & Scripture Journal",
    htmlBody: emailHtml(
      "Hi " + esc(name || "friend") + ",",
      "Thank you for your order. Your journal is ready. Start on the next New Moon, " +
        "and give it ten quiet minutes a day." +
        (bonus ? '<br><br>Your bonus calendar: <a href="' + esc(bonus) + '" style="color:#7D5F1C">download it here</a>.' : ""),
      "Download your journal",
      prop("JOURNAL_URL"),
      'Questions? Just reply to this email, or message us on <a href="' + INSTAGRAM_URL + '" style="color:#7D5F1C">Instagram</a>.'
    ),
  });
}

function paypal(method, path, body) {
  var base = prop("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  var res = UrlFetchApp.fetch(base + path, {
    method: method,
    contentType: "application/json",
    headers: { Authorization: "Bearer " + paypalToken(base) },
    payload: JSON.stringify(body),
    muteHttpExceptions: true,
  });
  var text = res.getContentText();
  if (res.getResponseCode() >= 300) throw new Error("PayPal " + res.getResponseCode() + ": " + text);
  return JSON.parse(text || "{}");
}

function paypalToken(base) {
  var cache = CacheService.getScriptCache();
  var key = "pp_token_" + base;
  var cached = cache.get(key);
  if (cached) return cached;
  var res = UrlFetchApp.fetch(base + "/v1/oauth2/token", {
    method: "post",
    headers: { Authorization: "Basic " + Utilities.base64Encode(prop("PAYPAL_CLIENT_ID") + ":" + prop("PAYPAL_SECRET")) },
    payload: { grant_type: "client_credentials" },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error("PayPal auth failed: " + res.getContentText());
  var data = JSON.parse(res.getContentText());
  cache.put(key, data.access_token, Math.max(60, Math.min(data.expires_in - 300, 21600)));
  return data.access_token;
}

function productForPrice(amount) {
  for (var k in PRODUCTS) if (PRODUCTS[k].price === amount) return k;
  return null;
}

// ---------- helpers ----------

function emailHtml(greeting, body, buttonText, buttonUrl, footer) {
  return '<div style="background:#F6F0E4;padding:32px 16px;font-family:Georgia,serif;color:#1E2438">' +
    '<div style="max-width:520px;margin:0 auto;background:#FFFDF8;border:1px solid #E4DAC5;border-radius:10px;overflow:hidden">' +
    '<div style="background:#0F1A33;color:#F6F0E4;padding:24px 28px;font-size:20px">&#9733; ' + BRAND + "</div>" +
    '<div style="padding:28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6">' +
    "<p>" + greeting + "</p><p>" + body + "</p>" +
    '<p style="margin:28px 0"><a href="' + esc(buttonUrl) + '" style="background:#C9A24D;color:#0F1A33;padding:14px 26px;' +
    'border-radius:999px;text-decoration:none;font-weight:bold;display:inline-block">' + buttonText + "</a></p>" +
    '<p style="color:#4A5068;font-size:14px">' + footer + "</p></div></div>" +
    '<p style="text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#4A5068;margin-top:16px">' +
    "For reflection and inspiration. Not a substitute for pastoral counsel or therapy.</p></div>";
}

function tab(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRow(sheet, col, value) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var rows = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][col - 1]).toLowerCase() === String(value).toLowerCase()) return rows[i];
  }
  return null;
}

function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function prop(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length < 255;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
