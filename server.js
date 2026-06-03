const express = require('express');
const path    = require('path');
require('dotenv').config();

const actionRouter   = require('./action');
const syncRouter     = require('./sync');
const callbackRouter = require('./dropbox-callback');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

app.use('/action',           actionRouter);
app.use('/api/sync',         syncRouter);
app.use('/dropbox/callback', callbackRouter);

app.get('/dropbox/auth', (_req, res) => {
  const { DROPBOX_APP_KEY } = process.env;
  const redirect = `${process.env.BASE_URL}/dropbox/callback`;
  const url = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=code&token_access_type=offline&redirect_uri=${encodeURIComponent(redirect)}`;
  res.redirect(url);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
