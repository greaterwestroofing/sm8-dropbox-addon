const express  = require('express');
const jwt      = require('jsonwebtoken');
const https    = require('https');
const sm8auth  = require('./sm8auth');
require('dotenv').config();

const syncRouter     = require('./sync');
const callbackRouter = require('./dropbox-callback');

const app = express();
app.use(express.static(__dirname));

app.post('/action', express.raw({ type: '*/*' }), async (req, res) => {
  let jwtToken = null;
  if (req.body) {
    if (Buffer.isBuffer(req.body)) jwtToken = req.body.toString('utf8').trim();
    else if (typeof req.body === 'string') jwtToken = req.body.trim();
  }

  let jobUUID = '';
  if (jwtToken) {
    try {
      const payload = jwt.decode(jwtToken);
      jobUUID = (payload && payload.eventArgs && payload.eventArgs.jobUUID) || '';
    } catch (err) {}
  }

  let accessToken = '';
  try { accessToken = await sm8auth.getAccessToken(); } catch (err) {}

  console.log('jobUUID:', jobUUID, '| accessToken:', accessToken ? 'present' : 'MISSING');

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;padding:20px"><h2>It works!</h2><p>Job: ' + jobUUID + '</p></body></html>';

  res.removeHeader('X-Frame-Options');

  // Try raw HTML - no JSON wrapper
  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
});

app.get('/action', (_req, res) => res.status(200).send('OK'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/sync',         syncRouter);
app.use('/dropbox/callback', callbackRouter);

app.get('/connect', async (req, res) => {
  const { code } = req.query;
  const { SM8_APP_ID, APP_SECRET, BASE_URL } = process.env;
  if (!code) {
    const url = `https://go.servicem8.com/oauth/authorize?response_type=code&client_id=${SM8_APP_ID}&scope=read_jobs+read_job_attachments+read_staff&redirect_uri=${encodeURIComponent(BASE_URL + '/connect')}`;
    return res.redirect(url);
  }
  try {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: SM8_APP_ID, client_secret: APP_SECRET, redirect_uri: BASE_URL + '/connect' }).toString();
    const data = await new Promise((resolve, reject) => {
      const options = { hostname: 'go.servicem8.com', path: '/oauth/access_token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } };
      const req2 = https.request(options, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(d); } }); });
      req2.on('error', reject); req2.write(body); req2.end();
    });
    console.log('OAuth response:', JSON.stringify(data));
    if (data.refresh_token) sm8auth.storeRefreshToken(data.refresh_token);
    res.send('<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5"><div style="background:white;border-radius:12px;padding:40px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.1)"><div style="font-size:3rem">&#9989;</div><h1>Connected!</h1><p>You can close this tab.</p></div></body></html>');
  } catch (err) { res.status(500).send('Error: ' + err.message); }
});

app.get('/dropbox/auth', (_req, res) => {
  const redirect = `${process.env.BASE_URL}/dropbox/callback`;
  const url = `https://www.dropbox.com/oauth2/authorize?client_id=${process.env.DROPBOX_APP_KEY}&response_type=code&token_access_type=offline&redirect_uri=${encodeURIComponent(redirect)}`;
  res.redirect(url);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
