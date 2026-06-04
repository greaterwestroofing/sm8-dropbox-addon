const express = require('express');
const jwt     = require('jsonwebtoken');
const https   = require('https');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();

let sm8AccessToken = null;
let sm8TokenExpiry = 0;

async function getSM8AccessToken() {
  if (sm8AccessToken && Date.now() < sm8TokenExpiry - 60000) return sm8AccessToken;

  const { SM8_APP_ID, APP_SECRET, SM8_REFRESH_TOKEN } = process.env;
  if (!SM8_REFRESH_TOKEN) throw new Error('SM8_REFRESH_TOKEN not set');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: SM8_REFRESH_TOKEN,
    client_id: SM8_APP_ID,
    client_secret: APP_SECRET,
  }).toString();

  const data = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'go.servicem8.com',
      path: '/oauth/access_token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  if (!data.access_token) throw new Error('Failed to refresh token: ' + JSON.stringify(data));
  sm8AccessToken = data.access_token;
  sm8TokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return sm8AccessToken;
}

router.get('/', (_req, res) => res.status(200).send('OK'));

router.post('/', express.raw({ type: '*/*' }), async (req, res) => {
  let jwtToken = null;
  if (req.body) {
    if (typeof req.body === 'string') jwtToken = req.body.trim();
    else if (Buffer.isBuffer(req.body)) jwtToken = req.body.toString('utf8').trim();
    else if (req.body.jwt) jwtToken = req.body.jwt;
  }

  let jobUUID = '';
  if (jwtToken) {
    try {
      const payload = jwt.decode(jwtToken);
      jobUUID = (payload.eventArgs && payload.eventArgs.jobUUID) || '';
    } catch (err) {
      console.error('JWT decode error:', err.message);
    }
  }

  let accessToken = '';
  try {
    accessToken = await getSM8AccessToken();
  } catch (err) {
    console.error('Token error:', err.message);
  }

  console.log('jobUUID:', jobUUID, '| accessToken:', accessToken ? 'present' : 'MISSING');

  try {
    let html = fs.readFileSync(path.join(__dirname, 'modal.html'), 'utf8');
    html = html.replace('__JOB_UUID__', jobUUID);
    html = html.replace('__SM8_TOKEN__', accessToken);

    // ServiceM8 expects JSON with an "html" key
    res.setHeader('Content-Type', 'application/json');
    return res.json({ html });
  } catch (err) {
    return res.status(500).json({ html: '<p>Server error: ' + err.message + '</p>' });
  }
});

module.exports = router;
