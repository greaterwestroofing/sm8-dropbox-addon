/**
 * ServiceM8 OAuth token manager.
 * Handles refresh token rotation — each refresh returns a new refresh token.
 * Stores the latest refresh token in memory (persists until server restart).
 */

const https = require('https');

let cachedAccessToken  = null;
let accessTokenExpiry  = 0;
let currentRefreshToken = null;

async function getAccessToken() {
  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < accessTokenExpiry - 60000) {
    return cachedAccessToken;
  }

  const { SM8_APP_ID, APP_SECRET, SM8_REFRESH_TOKEN } = process.env;

  // Use the in-memory rotated token if available, otherwise fall back to env
  const refreshToken = currentRefreshToken || SM8_REFRESH_TOKEN;

  if (!refreshToken) throw new Error('No SM8 refresh token available');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SM8_APP_ID,
    client_secret: APP_SECRET,
  }).toString();

  const data = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'go.servicem8.com',
      path: '/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
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

  if (!data.access_token) {
    throw new Error('Token refresh failed: ' + JSON.stringify(data));
  }

  // Store new tokens
  cachedAccessToken  = data.access_token;
  accessTokenExpiry  = Date.now() + (data.expires_in || 3600) * 1000;

  // Rotate refresh token if a new one was provided
  if (data.refresh_token) {
    currentRefreshToken = data.refresh_token;
    console.log('SM8 refresh token rotated — update SM8_REFRESH_TOKEN to:', data.refresh_token);
  }

  return cachedAccessToken;
}

// Store a new refresh token (called after OAuth connect flow)
function storeRefreshToken(token) {
  currentRefreshToken = token;
  cachedAccessToken = null; // Force refresh on next call
}

module.exports = { getAccessToken, storeRefreshToken };
