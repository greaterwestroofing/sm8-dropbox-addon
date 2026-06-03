const express = require('express');
const jwt     = require('jsonwebtoken');

const router = express.Router();

// GET handler so ServiceM8 can verify the endpoint is alive
router.get('/', (_req, res) => {
  res.status(200).send('OK');
});

router.post('/', (req, res) => {
  const { APP_SECRET } = process.env;
  const token = req.body.jwt;
  if (!token) return res.status(400).send('Missing JWT');

  let payload;
  try {
    payload = jwt.verify(token, APP_SECRET);
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).send('Invalid JWT');
  }

  const { job_uuid, access_token } = payload;
  if (!job_uuid || !access_token) return res.status(400).send('Incomplete JWT payload');

  return res.redirect(
    `/action/ui?job=${encodeURIComponent(job_uuid)}&token=${encodeURIComponent(access_token)}`
  );
});

router.get('/ui', (_req, res) => {
  res.sendFile('modal.html', { root: __dirname });
});

module.exports = router;
