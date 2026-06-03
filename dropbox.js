/**
 * Dropbox API helpers (using Dropbox API v2 via fetch/https)
 *
 * Uses a long-lived refresh token + app credentials to get fresh access tokens.
 * On first run, the user must complete the Dropbox OAuth flow at /dropbox/auth.
 * The refresh token is stored in the DROPBOX_REFRESH_TOKEN env var.
 */

const https = require('https');

// ---------------------------------------------------------------------------
// Token management
// ---------------------------------------------------------------------------

let _cachedToken = null;
let _tokenExpiry = 0;

/**
 * Get a valid Dropbox access token, refreshing if needed.
 */
async function getDropboxToken() {
  if (_cachedToken && Date.now() < _tokenExpiry - 60_000) {
    return _cachedToken;
  }

  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN } = process.env;

  if (!DROPBOX_REFRESH_TOKEN) {
    throw new Error('DROPBOX_REFRESH_TOKEN not set. Visit /dropbox/auth to authorise Dropbox.');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: DROPBOX_REFRESH_TOKEN,
    client_id: DROPBOX_APP_KEY,
    client_secret: DROPBOX_APP_SECRET,
  }).toString();

  const data = await httpsPost('api.dropbox.com', '/oauth2/token', body, {
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  _cachedToken = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000;
  return _cachedToken;
}

// ---------------------------------------------------------------------------
// Core Dropbox operations
// ---------------------------------------------------------------------------

/**
 * Upload a file to Dropbox.
 * @param {string} dropboxPath - e.g. '/Job Photos/JOB-001/photo1.jpg'
 * @param {Buffer} buffer      - file contents
 * @returns {object}           - Dropbox file metadata
 */
async function uploadFile(dropboxPath, buffer) {
  const token = await getDropboxToken();

  return new Promise((resolve, reject) => {
    const arg = JSON.stringify({ path: dropboxPath, mode: 'add', autorename: true });

    const options = {
      hostname: 'content.dropboxapi.com',
      path: '/2/files/upload',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': arg,
        'Content-Length': buffer.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });

    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

/**
 * Create or retrieve a shared link for a Dropbox folder.
 * @param {string} folderPath - e.g. '/Job Photos/JOB-001'
 * @returns {string}          - The shared URL
 */
async function getSharedFolderLink(folderPath) {
  const token = await getDropboxToken();

  // Try to create
  const result = await httpsPostJSON(
    'api.dropboxapi.com',
    '/2/sharing/create_shared_link_with_settings',
    { path: folderPath },
    token
  );

  if (result.url) return result.url;

  // If already shared, fetch existing
  if (result.error && result.error['.tag'] === 'shared_link_already_exists') {
    const existing = await httpsPostJSON(
      'api.dropboxapi.com',
      '/2/sharing/list_shared_links',
      { path: folderPath, direct_only: true },
      token
    );
    if (existing.links && existing.links.length > 0) {
      return existing.links[0].url;
    }
  }

  throw new Error('Could not get shared link: ' + JSON.stringify(result));
}

/**
 * Ensure a folder exists in Dropbox (create if missing).
 */
async function ensureFolder(folderPath) {
  const token = await getDropboxToken();
  const result = await httpsPostJSON(
    'api.dropboxapi.com',
    '/2/files/create_folder_v2',
    { path: folderPath, autorename: false },
    token
  );
  // Ignore "path/conflict/folder" error — folder already exists
  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function httpsPostJSON(hostname, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function httpsPost(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { uploadFile, getSharedFolderLink, ensureFolder, getDropboxToken };
