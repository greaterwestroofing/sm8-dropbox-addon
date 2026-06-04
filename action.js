const express = require('express');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();

router.get('/', (_req, res) => res.status(200).send('OK'));

router.post('/', express.raw({ type: '*/*' }), (req, res) => {
  const { APP_SECRET } = process.env;

  let jwtToken = null;
  if (req.body) {
    if (typeof req.body === 'string') jwtToken = req.body.trim();
    else if (Buffer.isBuffer(req.body)) jwtToken = req.body.toString('utf8').trim();
    else if (req.body.jwt) jwtToken = req.body.jwt;
  }

  let jobUUID = '';
  let accessToken = '';

  if (jwtToken) {
    try {
      const payload = jwt.decode(jwtToken);
      console.log('JWT payload:', JSON.stringify(payload));
      if (payload) {
        // eventArgs.jobUUID is the correct field per the logs
        jobUUID     = (payload.eventArgs && payload.eventArgs.jobUUID) ||
                      (payload.eventArgs && payload.eventArgs.uuid) ||
                      payload.job_uuid || '';
        accessToken = (payload.auth && payload.auth.accessToken) ||
                      payload.access_token || '';
      }
    } catch (err) {
      console.error('JWT decode error:', err.message);
    }
  }

  console.log('jobUUID:', jobUUID);
  console.log('accessToken:', accessToken ? 'present' : 'missing');

  try {
    let html = fs.readFileSync(path.join(__dirname, 'modal.html'), 'utf8');
    html = html.replace('__JOB_UUID__', jobUUID);
    html = html.replace('__SM8_TOKEN__', accessToken);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    console.error('Failed to read modal.html:', err.message);
    return res.status(500).send('<p>Server error: ' + err.message + '</p>');
  }
});

module.exports = router;
