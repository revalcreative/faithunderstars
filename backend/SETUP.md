# Backend setup: Google Sheet + Gmail + PayPal

One free Google Apps Script handles two jobs:

- **Free guide:** the signup form saves each name and email to a Google Sheet and emails the guide.
- **Journal checkout:** PayPal buttons take payment. The script confirms the payment with PayPal, logs the order in the same Sheet, and emails the buyer the journal link.

Private things stay in Google, never on the website or in GitHub: the PayPal **secret** and the journal PDF link.

---

## 1. Pick the Google account (important for a faceless brand)

Emails go out **from the Google account that owns the script**. The sender name shows as "Faith Under the Stars", but the address is that account's. To keep your personal name private, create a new Gmail such as `faithunderthestars@gmail.com` and do every step below while signed in to it.

A regular Gmail account can send about **100 script emails a day**. That's plenty to start. If you outgrow it, switch to Google Workspace or an email tool.

## 2. Put the journal PDF in Google Drive

1. Upload the journal PDF (and this month's bonus calendar) to Drive.
2. For each file, open **Share → General access → Anyone with the link → Viewer**, then **Copy link**.

## 3. Create the Sheet and paste in the script

1. Create a Google Sheet named **Faith Under the Stars: Signups & Orders**.
2. Open **Extensions → Apps Script**.
3. Delete the sample code, then paste in everything from [`backend/Code.gs`](Code.gs). **Save.**

## 4. Add the private settings

In Apps Script, go to **Project Settings** (gear icon) **→ Script Properties → Add script property**:

| Property | Value |
|---|---|
| `PAYPAL_ENV` | `sandbox` for testing, `live` for real payments |
| `PAYPAL_CLIENT_ID` | From PayPal (step 6) |
| `PAYPAL_SECRET` | From PayPal (step 6). **Only ever paste this here.** |
| `JOURNAL_URL` | The journal's Drive link from step 2 |
| `BONUS_URL` | *(optional)* The bonus calendar's Drive link |
| `REPLY_TO` | *(optional)* Where replies go, e.g. `hello@faithunderthestars.com` |

Changing a property takes effect immediately, with no redeploy needed.

## 5. Authorize and deploy

1. In the editor's function dropdown, choose **setup** and click **Run**. Google asks for permission (Sheets, Gmail, external requests). Because this is your own unpublished script, you'll see "Google hasn't verified this app": click **Advanced → Go to (project name)**. This creates the **Subscribers** and **Orders** tabs.
2. Click **Deploy → New deployment** → gear icon → **Web app**:
   - **Execute as:** Me
   - **Who has access:** Anyone
3. **Deploy**, then copy the **Web app URL** (`https://script.google.com/macros/s/.../exec`).

**Send Claude the Web app URL** (it isn't secret). It goes in `config.js` as `backend.url`.

> If you ever change the script's code, publish the change with **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The URL stays the same.

## 6. PayPal

1. You need a **PayPal Business** account. It's free, and you can upgrade a personal account.
2. Go to **developer.paypal.com**, log in with that account, and open **Apps & Credentials**.
3. **Start in Sandbox (test mode):** create an app, then copy its **Client ID** and **Secret** into Script Properties (step 4), with `PAYPAL_ENV` = `sandbox`.
   **Send Claude the sandbox Client ID.** It's public and goes in `config.js`. Never send the Secret.
4. Test a purchase with the sandbox **buyer** account listed under **Testing Tools → Sandbox Accounts** in the developer dashboard. Then check that:
   - the payment goes through
   - you land on the thank-you page with a download button
   - the email arrives
   - the order shows up in the **Orders** tab
5. **Go live:** switch to the **Live** tab in Apps & Credentials, create an app, and put the live Client ID and Secret into Script Properties with `PAYPAL_ENV` = `live`. Send Claude the **live** Client ID for `config.js`.

## Good to know

- **Prices** are set in `Code.gs` (`PRODUCTS`), so buyers can't change what they pay. If you change a price, update it both there (then redeploy a new version) and in `config.js`.
- **Refunds** are issued from your PayPal account.
- **Sales tax:** PayPal doesn't collect or file sales tax. Check what applies to digital products where you live.
- **Seeing your list:** the **Subscribers** tab is your email list. You can export it to an email tool anytime.
