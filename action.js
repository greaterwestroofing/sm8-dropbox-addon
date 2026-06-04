const express = require('express');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();

router.get('/', (_req, res) => res.status(200).send('OK'));

router.post('/', express.raw({ type: '*/*' }), (req, res) => {
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
      jobUUID = (payload.eventArgs && payload.eventArgs.jobUUID) ||
                (payload.eventArgs && payload.eventArgs.uuid) ||
                payload.job_uuid || '';
    } catch (err) {
      console.error('JWT decode error:', err.message);
    }
  }

  // Use the stored OAuth token from environment
  const accessToken = process.env.SM8_ACCESS_TOKEN || '';

  console.log('jobUUID:', jobUUID);
  console.log('accessToken:', accessToken ? 'present' : 'MISSING - set SM8_ACCESS_TOKEN');

  try {
    let html = fs.readFileSync(path.join(__dirname, 'modal.html'), 'utf8');
    html = html.replace('__JOB_UUID__', jobUUID);
    html = html.replace('__SM8_TOKEN__', accessToken);
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (err) {
    return res.status(500).send('<p>Server error: ' + err.message + '</p>');
  }
});

module.exports = router;
