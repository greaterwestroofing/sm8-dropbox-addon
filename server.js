const express = require('express');
const path    = require('path');
require('dotenv').config();

const actionRouter   = require('./action');
const syncRouter     = require('./sync');
const callbackRouter = require('./dropbox-callback');

const app = express();

// Don't pre-parse body for /action — it handles its own body parsing
app.use('/action', actionRouter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use('/api/sync',         syncRouter);
app.use('/dropbox/callback', callbackRouter);

app.get('/connect', async (req, res) => {
  const { code } = req.query;
  const { SM8_APP_ID, APP_SECRET, BASE_URL } = process.env;

  if (!code) {
    const url = `https://go.servicem8.com/oauth/authorize?response_type=code&client_id=${SM8_APP_ID}&scope=read_jobs+read_job_attachments+read_staff&redirect_uri=${encodeURIComponent(BASE_URL + '/connect')}`;
    return res.redirect(url);
  }

  const https = require('https');
  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: SM8_APP_ID,
      client_secret: APP_SECRET,
      redirect_uri: BASE_URL + '/connect',
    }).toString();

    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'go.servicem8.com',
        path: '/oauth/access_token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      };
      const req2 = https.request(options, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
      });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    console.log('OAuth response:', JSON.stringify(data));
    res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Connected</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
    .card{background:white;border-radius:12px;padding:40px;max-width:400px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)}</style>
    </head><body><div class="card"><div style="font-size:3rem;margin-bottom:16px">✅</div>
    <h1 style="color:#1a1a2e;font-size:1.4rem;margin-bottom:8px">Dropbox Downloader Connected!</h1>
    <p style="color:#666;font-size:.9rem">Open any job and click <strong>Send Photos to Dropbox</strong> in the More menu.</p>
    <p style="margin-top:16px;color:#aaa;font-size:.8rem">You can close this tab.</p>
    </div></body></html>`);
  } catch (err) {
    res.status(500).send('Connection failed: ' + err.message);
  }
});

app.get('/dropbox/auth', (_req, res) => {
  const { DROPBOX_APP_KEY } = process.env;
  const redirect = `${process.env.BASE_URL}/dropbox/callback`;
  const url = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=code&token_access_type=offline&redirect_uri=${encodeURIComponent(redirect)}`;
  res.redirect(url);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
