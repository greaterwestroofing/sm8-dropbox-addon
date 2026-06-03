const express = require('express');
const https   = require('https');
const router  = express.Router();

router.get('/', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET } = process.env;
  const redirect = `${process.env.BASE_URL}/dropbox/callback`;

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: DROPBOX_APP_KEY,
    client_secret: DROPBOX_APP_SECRET,
    redirect_uri: redirect,
  }).toString();

  try {
    const data = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.dropbox.com',
        path: '/oauth2/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
      };
      const req2 = https.request(options, (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } });
      });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });

    if (!data.refresh_token) return res.status(500).send(`Dropbox error: ${JSON.stringify(data)}`);

    res.send(`
      <h2>✅ Dropbox connected!</h2>
      <p>Add this to your Railway Variables:</p>
      <pre style="background:#f4f4f4;padding:12px;border-radius:6px">DROPBOX_REFRESH_TOKEN=${data.refresh_token}</pre>
      <p>Then redeploy. You can close this tab.</p>
    `);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

module.exports = router;
