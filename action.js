const express = require('express');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const path    = require('path');

const router = express.Router();

// Serve modal for both GET and POST
function serveModal(jobUUID, accessToken, res) {
  try {
    let html = fs.readFileSync(path.join(__dirname, 'modal.html'), 'utf8');
    html = html.replace('__JOB_UUID__', jobUUID || '');
    html = html.replace('__SM8_TOKEN__', accessToken || '');
    return res.send(html);
  } catch (err) {
    console.error('Failed to read modal.html:', err.message);
    return res.status(500).send('Server error: ' + err.message);
  }
}

router.get('/', (req, res) => {
  // GET - no JWT available, serve modal with empty values (SDK will fill them in)
  serveModal('', '', res);
});

router.post('/', (req, res) => {
  const { APP_SECRET } = process.env;
  const jwtToken = req.body.jwt;

  let jobUUID = '';
  let accessToken = '';

  if (jwtToken) {
    try {
      const payload = jwt.decode(jwtToken);
      console.log('JWT payload:', JSON.stringify(payload));
      if (payload) {
        jobUUID     = payload.job_uuid || payload.jobUuid || payload.object_uuid || '';
        accessToken = payload.access_token || payload.accessToken ||
                      (payload.auth && payload.auth.accessToken) || '';
      }
    } catch (err) {
      console.error('JWT error:', err.message);
    }
  }

  serveModal(jobUUID, accessToken, res);
});

module.exports = router;
