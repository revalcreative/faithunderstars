/* Faith Under the Stars — site behavior. Settings live in config.js. */
(function () {
  "use strict";

  var C = window.FUTS_CONFIG || {};
  var UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === "file:";

  // ---------- small helpers ----------

  function store(kind) {
    try { return window[kind]; } catch (e) { return null; }
  }
  function getItem(kind, key) {
    try { var s = store(kind); return s ? s.getItem(key) : null; } catch (e) { return null; }
  }
  function setItem(kind, key, val) {
    try { var s = store(kind); if (s) s.setItem(key, val); } catch (e) { /* storage blocked */ }
  }
  function get(path) {
    return path.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, C);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function money(n) {
    return "$" + (Number(n) % 1 === 0 ? Number(n) : Number(n).toFixed(2));
  }

  // ---------- UTM pass-through ----------

  function captureUtms() {
    var params = new URLSearchParams(location.search);
    var found = {};
    UTM_KEYS.forEach(function (k) { if (params.get(k)) found[k] = params.get(k); });
    if (Object.keys(found).length) setItem("sessionStorage", "futs_utm", JSON.stringify(found));
  }
  function utms() {
    try { return JSON.parse(getItem("sessionStorage", "futs_utm") || "{}"); } catch (e) { return {}; }
  }

  // ---------- analytics + consent ----------

  var analytics = C.analytics || {};
  var trackingConfigured = !!(analytics.ga4Id || analytics.metaPixelId);
  var trackingLoaded = false;
  var pendingEvents = [];

  function loadTracking() {
    if (trackingLoaded || !trackingConfigured) return;
    trackingLoaded = true;
    if (analytics.ga4Id) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(analytics.ga4Id);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", analytics.ga4Id);
    }
    if (analytics.metaPixelId) {
      /* Meta Pixel base code */
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      window.fbq("init", analytics.metaPixelId);
      window.fbq("track", "PageView");
    }
    pendingEvents.splice(0).forEach(function (e) { track(e[0], e[1], e[2]); });
  }

  // gaName: GA4 event name. metaName: Meta standard event (optional).
  function track(gaName, params, metaName) {
    if (!trackingConfigured) return;
    if (!trackingLoaded) { pendingEvents.push([gaName, params, metaName]); return; }
    if (window.gtag && analytics.ga4Id) window.gtag("event", gaName, params || {});
    if (window.fbq && analytics.metaPixelId && metaName) window.fbq("track", metaName, params || {});
  }

  function setupConsent() {
    if (!trackingConfigured) return;
    var choice = getItem("localStorage", "futs_consent");
    if (choice === "yes") { loadTracking(); return; }
    if (choice === "no") return;

    var bar = document.createElement("div");
    bar.className = "consent";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Cookie choices");
    bar.innerHTML =
      '<p>We use cookies to see which posts bring you here and to improve this site. ' +
      '<a href="/privacy/">Privacy policy</a></p>' +
      '<div class="consent__actions">' +
      '<button type="button" class="btn btn--ghost" data-consent="no">Decline</button>' +
      '<button type="button" class="btn" data-consent="yes">Accept</button></div>';
    document.body.appendChild(bar);
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-consent]");
      if (!btn) return;
      var yes = btn.getAttribute("data-consent") === "yes";
      setItem("localStorage", "futs_consent", yes ? "yes" : "no");
      bar.remove();
      if (yes) loadTracking();
    });
  }

  // ---------- fill values from config ----------

  function fillConfig() {
    $all("[data-cfg-text]").forEach(function (el) {
      var v = get(el.getAttribute("data-cfg-text"));
      if (v != null && v !== "") el.textContent = v;
    });
    $all("[data-cfg-href]").forEach(function (el) {
      var v = get(el.getAttribute("data-cfg-href"));
      if (v) el.setAttribute("href", el.getAttribute("data-cfg-href").indexOf("Email") > -1 ? "mailto:" + v : v);
    });
    $all("[data-price]").forEach(function (el) {
      var v = get("prices." + el.getAttribute("data-price"));
      if (v != null) el.textContent = money(v);
    });
    $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  // ---------- New Moon date ----------

  function nextNewMoon() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var dates = (C.newMoons || [])
      .map(function (s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); })
      .filter(function (d) { return !isNaN(d) && d >= today; })
      .sort(function (a, b) { return a - b; });
    return dates[0] || null;
  }

  function fillNewMoon() {
    var d = nextNewMoon();
    $all("[data-new-moon]").forEach(function (el) {
      el.textContent = d
        ? d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
        : "coming soon";
    });
  }

  // ---------- backend (Google Apps Script) ----------

  function callBackend(params) {
    var url = get("backend.url");
    if (!url) return Promise.reject(new Error("backend.url is not set in config.js"));
    return fetch(url, { method: "POST", body: new URLSearchParams(params) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "backend_error");
        return j;
      });
  }

  // ---------- PayPal checkout ----------
  // Buttons render into [data-paypal="journal"] or [data-paypal="upsell"].
  // Orders are created and confirmed by the backend, which sets the price.

  var paypalReady = null;

  function loadPayPal() {
    if (paypalReady) return paypalReady;
    paypalReady = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(get("paypal.clientId")) +
        "&currency=USD&intent=capture&components=buttons";
      s.onload = function () { resolve(window.paypal); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return paypalReady;
  }

  function renderPayPal(box) {
    if (!box || box.getAttribute("data-rendered")) return;
    box.setAttribute("data-rendered", "1");
    var which = box.getAttribute("data-paypal");
    var price = which === "upsell" ? get("prices.journalUpsell") : get("prices.journal");
    var status = box.parentNode.querySelector("[data-paypal-status]");
    function say(msg) { if (status) status.textContent = msg; }

    if (!get("paypal.clientId") || !get("backend.url")) {
      box.innerHTML = '<p class="checkout-soon">Checkout opens soon.</p>';
      return;
    }

    loadPayPal().then(function (paypal) {
      return paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "pill", label: "pay", height: 48 },
        createOrder: function () {
          say("");
          track("begin_checkout", {
            currency: "USD",
            value: price,
            items: [{ item_id: "journal-" + which, item_name: "Sky & Scripture Journal", price: price }],
          }, "InitiateCheckout");
          return callBackend({ action: "create_order", product: which }).then(function (j) { return j.id; });
        },
        onApprove: function (data) {
          say("Confirming your payment...");
          return callBackend({ action: "capture_order", order_id: data.orderID }).then(function (j) {
            setItem("sessionStorage", "futs_download", j.downloadUrl || "");
            location.href = "/journal-thanks/?p=" + encodeURIComponent(j.product || which) +
              "&order_id=" + encodeURIComponent(data.orderID);
          }).catch(function (err) {
            console.error("[FUTS] capture failed", err);
            say("Your payment didn't go through. Please try again, or email us and we'll help.");
          });
        },
        onError: function (err) {
          console.error("[FUTS] PayPal error", err);
          say("Checkout couldn't open. Please try again in a moment.");
        },
      }).render(box);
    }).catch(function (err) {
      console.error("[FUTS] PayPal failed to load", err);
      box.innerHTML = '<p class="checkout-soon">Checkout couldn’t load. Please refresh and try again.</p>';
    });
  }

  function setupCheckout() {
    // The main journal buttons render when the page loads; the $9 offer's
    // buttons render when the offer is revealed (see setupOffer).
    $all('[data-paypal="journal"]').forEach(renderPayPal);
  }

  // ---------- email signup ----------

  function submitToProvider(firstName, email, trap) {
    var p = get("email.provider");
    var fd = new FormData();

    if (p === "sheets" && !(isLocal && !get("backend.url"))) {
      var params = { action: "signup", first_name: firstName, email: email, company: trap || "" };
      var saved = utms();
      Object.keys(saved).forEach(function (k) { params[k] = saved[k]; });
      return callBackend(params);
    }

    if (p === "kit") {
      fd.append("email_address", email);
      fd.append("fields[first_name]", firstName);
      return fetch("https://app.kit.com/forms/" + encodeURIComponent(get("email.kit.formId")) + "/subscriptions", {
        method: "POST", body: fd, headers: { Accept: "application/json" },
      }).then(function (r) { if (!r.ok) throw new Error("kit " + r.status); });
    }

    if (p === "mailerlite") {
      fd.append("fields[email]", email);
      fd.append("fields[name]", firstName);
      fd.append("ml-submit", "1");
      fd.append("anticsrf", "true");
      var ml = C.email.mailerlite;
      return fetch("https://assets.mailerlite.com/jsonp/" + encodeURIComponent(ml.accountId) +
        "/forms/" + encodeURIComponent(ml.formId) + "/subscribe", { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j || !j.success) throw new Error("mailerlite"); });
    }

    if ((p === "demo" || p === "sheets") && isLocal) {
      console.warn("[FUTS] Demo signup, not sent anywhere:", firstName, email);
      return new Promise(function (res) { setTimeout(res, 600); });
    }
    return Promise.reject(new Error("Email provider is not set up in config.js"));
  }

  function setupForms() {
    $all("form[data-signup]").forEach(function (form) {
      var status = form.querySelector(".form__status");
      var button = form.querySelector("button[type=submit]");
      var label = button.textContent;

      function say(msg, kind) {
        status.textContent = msg;
        status.className = "form__status" + (kind ? " is-" + kind : "");
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var nameEl = form.elements.first_name;
        var emailEl = form.elements.email;
        var name = nameEl.value.trim();
        var email = emailEl.value.trim();
        [nameEl, emailEl].forEach(function (el) { el.removeAttribute("aria-invalid"); });

        if (!name) { nameEl.setAttribute("aria-invalid", "true"); nameEl.focus(); say("Please add your first name.", "error"); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          emailEl.setAttribute("aria-invalid", "true"); emailEl.focus();
          say("That email doesn't look quite right. Mind checking it?", "error");
          return;
        }

        button.disabled = true;
        button.textContent = "Sending...";
        say("");

        var trap = form.elements.company ? form.elements.company.value : "";
        submitToProvider(name, email, trap).then(function () {
          track("guide_signup", { method: get("email.provider") }, "Lead");
          // Swap the form for the thank-you message and reveal the one-time offer
          var success = form.parentNode.querySelector("[data-signup-success]");
          if (!success) { say("You're in. Check your inbox for the guide.", "success"); return; }
          form.hidden = true;
          success.hidden = false;
          success.focus();
          setupOffer();
        }).catch(function (err) {
          console.error("[FUTS] signup failed", err);
          button.disabled = false;
          button.textContent = label;
          say("Something went wrong on our end. Please try again in a moment.", "error");
        });
      });
    });
  }

  // ---------- testimonials (journal page) ----------

  function renderTestimonials() {
    var section = document.getElementById("testimonials");
    if (!section) return;
    var list = (C.testimonials || []).filter(function (t) { return t && t.quote; });
    if (!list.length) return; // section stays hidden
    var grid = section.querySelector(".testimonials__grid");
    list.slice(0, 3).forEach(function (t) {
      var fig = document.createElement("figure");
      fig.className = "card testimonial";
      var q = document.createElement("blockquote");
      q.textContent = "“" + t.quote + "”";
      var cap = document.createElement("figcaption");
      cap.textContent = t.name || "";
      fig.appendChild(q);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
    section.hidden = false;
  }

  // ---------- sticky mobile buy bar (journal page) ----------

  function setupSticky() {
    var bar = document.querySelector(".sticky-buy");
    var anchors = $all("[data-sticky-hide]");
    if (!bar || !anchors.length || !("IntersectionObserver" in window)) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? visible.add(en.target) : visible.delete(en.target); });
      bar.classList.toggle("is-shown", visible.size === 0);
    });
    anchors.forEach(function (a) { io.observe(a); });
  }

  // ---------- one-time offer (shown after guide signup) ----------
  // The $9 price is honest "today only": it expires at midnight (visitor's
  // local time) of the day they first saw it, and does not reset on reload.

  function setupOffer() {
    var offer = document.querySelector("[data-offer]");
    if (!offer) return;
    offer.hidden = false;
    var todayKey = new Date().toDateString();
    var first = getItem("localStorage", "futs_offer_day");
    if (!first) { first = todayKey; setItem("localStorage", "futs_offer_day", first); }

    var active = offer.querySelector("[data-offer-active]");
    var expired = offer.querySelector("[data-offer-expired]");
    var countdown = offer.querySelector("[data-offer-countdown]");

    function tick() {
      var start = new Date(first);
      var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      var ms = end - new Date();
      if (isNaN(ms) || ms <= 0) {
        active.hidden = true;
        expired.hidden = false;
        return;
      }
      renderPayPal(offer.querySelector('[data-paypal="upsell"]'));
      var h = Math.floor(ms / 3600000);
      var m = Math.floor((ms % 3600000) / 60000);
      countdown.textContent = "This price ends tonight at midnight (" +
        (h ? h + " hr " : "") + m + " min left).";
      setTimeout(tick, 30000);
    }
    tick();
  }

  // ---------- purchase confirmation ----------

  function setupPurchase() {
    var page = document.querySelector("[data-purchase-page]");
    if (!page) return;
    var params = new URLSearchParams(location.search);
    var which = params.get("p") === "upsell" ? "upsell" : "journal";
    var price = which === "upsell" ? get("prices.journalUpsell") : get("prices.journal");
    var id = params.get("session_id") || params.get("order_id") || which;
    var key = "futs_purchase_" + id;
    if (!getItem("sessionStorage", key)) {
      setItem("sessionStorage", key, "1");
      track("purchase", {
        transaction_id: params.get("session_id") || params.get("order_id") || undefined,
        currency: get("prices.currency") || "USD",
        value: price,
        items: [{ item_id: "journal-" + which, item_name: "Sky & Scripture Journal", price: price }],
      }, "Purchase");
    }
    // The download link comes back from the backend after PayPal confirms payment
    var link = getItem("sessionStorage", "futs_download");
    var dl = document.querySelector("[data-journal-download]");
    if (dl && link) {
      dl.querySelector("a").setAttribute("href", link);
      dl.hidden = false;
    }
  }

  // ---------- go ----------

  captureUtms();
  fillConfig();
  fillNewMoon();
  setupCheckout();
  setupForms();
  renderTestimonials();
  setupSticky();
  setupPurchase();
  setupConsent();
})();
