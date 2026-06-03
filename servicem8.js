const https = require('https');

function sm8Get(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.servicem8.com',
      path: `/api_1.0${path}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function sm8GetAttachmentBinary(uuid, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.servicem8.com',
      path: `/api_1.0/Attachment/${uuid}.file`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function getJob(jobUUID, token) {
  return sm8Get(`/Job/${jobUUID}.json`, token);
}

async function getJobPhotos(jobUUID, token) {
  const all = await sm8Get(`/Attachment.json?%24filter=related_object_uuid%20eq%20'${jobUUID}'`, token);
  if (!Array.isArray(all)) return [];
  return all.filter(a => a.active === 1 && a.file_type && (a.file_type.startsWith('image/') || /\.(jpg|jpeg|png|gif|heic|webp)$/i.test(a.uri || '')));
}

async function downloadPhoto(uuid, token) {
  return sm8GetAttachmentBinary(uuid, token);
}

module.exports = { getJob, getJobPhotos, downloadPhoto };
