const express = require('express');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();

// GET - health check only
router.get('/', (_req, res) => res.status(200).send('OK'));

// POST - ServiceM8 sends JWT here when button is clicked
// We decode it and return the modal HTML with job data embedded
router.post('/', (req, res) => {
  const { APP_SECRET } = process.env;
  const jwtToken = req.body.jwt;

  if (!jwtToken) {
    return res.status(400).send('Missing JWT');
  }

  let payload;
  try {
    payload = jwt.verify(jwtToken, APP_SECRET);
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    // Try without verification for debugging
    payload = jwt.decode(jwtToken);
    if (!payload) return res.status(401).send('Invalid JWT');
  }

  console.log('JWT payload keys:', Object.keys(payload));
  console.log('JWT payload:', JSON.stringify(payload));

  // Extract job UUID and access token from payload
  const jobUUID    = payload.job_uuid || payload.jobUuid || payload.object_uuid;
  const accessToken = payload.access_token || payload.accessToken || 
                      (payload.auth && payload.auth.accessToken);

  // Read modal HTML and inject the job data
  let html = fs.readFileSync(path.join(__dirname, 'modal.html'), 'utf8');
  html = html.replace('__JOB_UUID__', jobUUID || '');
  html = html.replace('__SM8_TOKEN__', accessToken || '');

  res.send(html);
});

module.exports = router;
