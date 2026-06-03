const express  = require('express');
const router   = express.Router();
const sm8      = require('./servicem8');
const dropbox  = require('./dropbox');

router.post('/', async (req, res) => {
  const { job_uuid, sm8_token } = req.body;
  if (!job_uuid || !sm8_token) return res.status(400).json({ ok: false, error: 'Missing job_uuid or sm8_token' });

  try {
    const job = await sm8.getJob(job_uuid, sm8_token);
    const jobLabel = buildJobLabel(job);
    const photos = await sm8.getJobPhotos(job_uuid, sm8_token);

    if (photos.length === 0) return res.json({ ok: true, count: 0, link: null, jobName: jobLabel });

    const folderPath = `/Job Photos/${sanitize(jobLabel)}`;
    await dropbox.ensureFolder(folderPath);

    let uploaded = 0;
    for (const photo of photos) {
      try {
        const { buffer, contentType } = await sm8.downloadPhoto(photo.uuid, sm8_token);
        const ext  = extensionFromContentType(contentType);
        const name = photo.filename || `photo_${photo.uuid}${ext}`;
        await dropbox.uploadFile(`${folderPath}/${name}`, buffer);
        uploaded++;
      } catch (e) {
        console.error(`Failed photo ${photo.uuid}:`, e.message);
      }
    }

    const link = await dropbox.getSharedFolderLink(folderPath);
    return res.json({ ok: true, count: uploaded, link, jobName: jobLabel });

  } catch (err) {
    console.error('Sync error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

function buildJobLabel(job) {
  const num  = job.generated_job_id || job.uuid?.slice(0, 8) || 'Unknown';
  const addr = job.job_address ? job.job_address.split(',')[0].trim() : '';
  return addr ? `${num} – ${addr}` : num;
}

function sanitize(str) {
  return str.replace(/[\\/:*?"<>|]/g, '-').substring(0, 100);
}

function extensionFromContentType(ct) {
  if (!ct) return '.jpg';
  if (ct.includes('png'))  return '.png';
  if (ct.includes('gif'))  return '.gif';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('heic')) return '.heic';
  return '.jpg';
}

module.exports = router;
