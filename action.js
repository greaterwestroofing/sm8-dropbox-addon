const express = require('express');
const jwt     = require('jsonwebtoken');

const router = express.Router();

// ServiceM8 loads this URL in the modal iframe
router.get('/', (req, res) => {
  const { job, token } = req.query;

  // If ServiceM8 passed job/token params, show the modal UI
  if (job || token) {
    return res.sendFile('modal.html', { root: __dirname });
  }

  // Health check for ServiceM8 validation
  res.status(200).send('OK');
});

// ServiceM8 may also POST a JWT
router.post('/', (req, res) => {
  const { APP_SECRET } = process.env;
  const jwtToken = req.body.jwt;

  if (!jwtToken) {
    // No JWT — just serve the modal
    return res.sendFile('modal.html', { root: __dirname });
  }

  let payload;
  try {
    payload = jwt.verify(jwtToken, APP_SECRET);
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).send('Invalid JWT');
  }

  const { job_uuid, access_token } = payload;
  if (!job_uuid || !access_token) return res.status(400).send('Incomplete JWT payload');

  return res.redirect(
    `/action?job=${encodeURIComponent(job_uuid)}&token=${encodeURIComponent(access_token)}`
  );
});

module.exports = router;
