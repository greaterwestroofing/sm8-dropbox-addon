 h1 { color: #1a1a2e; font-size: 1.4rem; margin-bottom: 8px; }
        p { color: #666; font-size: .9rem; line-height: 1.5; }
        .tick { font-size: 3rem; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="tick">✅</div>
        <h1>Dropbox Downloader Connected!</h1>
        <p>The add-on is now active. Open any job in ServiceM8 and click <strong>"Send Photos to Dropbox"</strong> to upload job photos and get a shareable link.</p>
        <p style="margin-top:16px;color:#aaa;font-size:.8rem">You can close this tab.</p>
      </div>
    </body>
    </html>
  `);
});
 
app.get('/dropbox/auth', (_req, res) => {
  const { DROPBOX_APP_KEY } = process.env;
  const redirect = `${process.env.BASE_URL}/dropbox/callback`;
  const url = `https://www.dropbox.com/oauth2/authorize?client_id=${DROPBOX_APP_KEY}&response_type=code&token_access_type=offline&redirect_uri=${encodeURIComponent(redirect)}`;
  res.redirect(url);
});
 
app.get('/health', (_req, res) => res.json({ ok: true }));
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
 
