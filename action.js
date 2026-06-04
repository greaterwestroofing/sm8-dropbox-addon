const express = require('express');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();

router.get('/', (_req, res) => res.status(200).send('OK'));

router.post('/', express.raw({ type: '*/*' }), (req, res) => {
  const { APP_SECRET } = process.env;

  // JWT may come as raw body or form field
  let jwtToken = null;
  if (req.body) {
    if (typeof req.body === 'string') {
      jwtToken = req.body.trim();
    } else if (Buffer.isBuffer(req.body)) {
      jwtToken = req.body.toString('utf8').trim();
    } else if (req.body.jwt) {
      jwtToken = req.body.jwt;
    }
  }

  console.log('Raw body type:', typeof req.body);
  console.log('JWT token (first 50):', jwtToken ? jwtToken.substring(0, 50) : 'NONE');

  let jobUUID = '';
  let accessToken = '';

  if (jwtToken) {
    try {
      const payload = jwt.decode(jwtToken);
      console.log('JWT payload:', JSON.stringify(payload));
      if (payload) {
        jobUUID      = payload.job_uuid || payload.jobUuid ||
                       (payload.eventArgs && payload.eventArgs.uuid) || '';
        accessToken  = payload.access_token || payload.accessToken ||
                       (payload.auth && payload.auth.accessToken) || '';
      }
    } catch (err) {
      console.error('JWT decode error:', err.message);
    }
  }

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
