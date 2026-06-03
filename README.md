# ServiceM8 → Dropbox Add-on

Adds a **"Send Photos to Dropbox"** button to every job card in ServiceM8.  
One click uploads all job diary photos to a Dropbox folder and returns a shareable link.

---

## How it works

```
User clicks button in ServiceM8 job card
    → ServiceM8 POSTs a signed JWT to your server /action
    → Server verifies JWT, extracts job UUID + OAuth token
    → Modal opens at /action/ui?job=...&token=...
    → User clicks "Upload Photos to Dropbox"
    → Server fetches all photo attachments from ServiceM8 REST API
    → Downloads each photo binary
    → Uploads to Dropbox at /Job Photos/{job-label}/
    → Creates a Dropbox shared folder link
    → Modal shows the link with Copy / Open buttons
```

---

## Setup

### 1. Prerequisites

- Node.js 18+
- A publicly accessible HTTPS server (e.g. Railway, Render, Heroku, or your own VPS)
- A **ServiceM8 Developer account** — sign up at https://developer.servicem8.com
- A **Dropbox Developer account** — create an app at https://www.dropbox.com/developers/apps

---

### 2. Clone & install

```bash
git clone <your-repo>
cd sm8-photos-to-dropbox
npm install
```

---

### 3. Create your ServiceM8 Add-on

1. Log in to https://developer.servicem8.com
2. Go to **Add-ons → Create Add-on**
3. Upload `manifest.json` (edit `YOUR_DOMAIN` first)
4. Note your **App ID** and **App Secret**
5. Set the **Action URL** to `https://YOUR_DOMAIN/action`

---

### 4. Create your Dropbox App

1. Go to https://www.dropbox.com/developers/apps
2. Click **Create App**
3. Choose **Scoped Access → Full Dropbox** (or App folder if preferred)
4. Add OAuth 2 redirect URI: `https://YOUR_DOMAIN/dropbox/callback`
5. Under **Permissions**, enable:
   - `files.content.write`
   - `files.content.read`
   - `sharing.write`
6. Note your **App key** and **App secret**

---

### 5. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```
SM8_APP_ID=...
APP_SECRET=...          ← ServiceM8 App Secret (used to verify JWTs)
DROPBOX_APP_KEY=...
DROPBOX_APP_SECRET=...
BASE_URL=https://YOUR_DOMAIN
PORT=3000
```

---

### 6. Authorise Dropbox (one-time)

Start the server:

```bash
npm start
```

Visit `https://YOUR_DOMAIN/dropbox/auth` in your browser.  
Approve the Dropbox permission screen.  
You'll be shown your **refresh token** — copy it into `.env`:

```
DROPBOX_REFRESH_TOKEN=sl.xxxxxxxxxxxxxxxxxxxxx
```

Restart the server.

---

### 7. Register the add-on with ServiceM8

In your ServiceM8 Developer account, set the **Callback URL / Action URL** to:

```
https://YOUR_DOMAIN/action
```

Go to the Add-on Store (even in dev mode), find your add-on, and click **Connect** to complete the OAuth flow for your own account.

---

### 8. Test it

Open any job in ServiceM8. You should see a **"Send Photos to Dropbox"** button in the job actions. Click it — a modal will open and walk you through the upload.

---

## File structure

```
sm8-photos-to-dropbox/
├── server.js                  # Express entry point
├── manifest.json              # ServiceM8 add-on manifest
├── package.json
├── .env.example
├── routes/
│   ├── action.js              # Receives ServiceM8 JWT, opens modal
│   ├── sync.js                # Core worker: fetch photos → Dropbox
│   └── dropbox-callback.js    # OAuth setup flow
├── lib/
│   ├── servicem8.js           # ServiceM8 REST API helpers
│   └── dropbox.js             # Dropbox API helpers
└── public/
    └── modal.html             # The in-app modal UI
```

---

## Deployment tips

- **Railway / Render**: push to GitHub, connect repo, set env vars in dashboard
- **Heroku**: `heroku create`, set config vars with `heroku config:set`
- Ensure your server has a valid TLS certificate (required by ServiceM8)

---

## Publishing to the ServiceM8 Add-on Store

See https://developer.servicem8.com/docs/addon-store-requirements for the full checklist.  
Key points:
- Add-on name must not contain "ServiceM8", "M8", or "Mate"
- Provide a 512×512px icon
- Include a support URL and email
- Test on both web and mobile (add `"type": "app"` action if you want mobile support)

---

## License

MIT
