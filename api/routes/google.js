const express = require('express');
const router = express.Router();
const axios = require('axios');
const { URLSearchParams } = require('url');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

function getUrls(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/google/oauth/callback`;
  const frontendUrl = process.env.FRONTEND_URL || baseUrl;
  return { redirectUri, frontendUrl };
}

let cachedTokens = null;

async function saveTokens(tokens) {
  cachedTokens = {
    ...cachedTokens,
    ...tokens,
    expiry_date: tokens.expiry_date || (Date.now() + (tokens.expires_in || 3600) * 1000)
  };

  try {
    const payload = {
      id: 'default',
      access_token: cachedTokens.access_token,
      refresh_token: cachedTokens.refresh_token || null,
      expiry_date: cachedTokens.expiry_date,
      updated_at: new Date().toISOString()
    };

    console.log('[Google DB] Salvando no Supabase:', SUPABASE_URL);
    await axios.post(
      `${SUPABASE_URL}/rest/v1/google_tokens`,
      payload,
      { 
        headers: { 
          ...supabaseHeaders, 
          'Prefer': 'resolution=merge-duplicates,return=minimal' 
        } 
      }
    );
    console.log('[Google DB] Salvo com sucesso');
  } catch (err) {
    const errorBody = err.response?.data || err.message;
    console.error('[Google DB] Erro Supabase:', errorBody);
    const errorPrefix = `DB_SAVE_ERROR: `;
    const finalError = typeof errorBody === 'object' ? JSON.stringify(errorBody) : errorBody;
    throw new Error(errorPrefix + finalError);
  }
}

async function loadTokens() {
  if (cachedTokens?.access_token && cachedTokens.expiry_date && Date.now() < cachedTokens.expiry_date - 60000) {
    return cachedTokens;
  }

  try {
    const res = await axios.get(
      `${SUPABASE_URL}/rest/v1/google_tokens?id=eq.default&select=*`,
      { headers: supabaseHeaders }
    );
    if (res.data && res.data.length > 0) {
      cachedTokens = res.data[0];
      return cachedTokens;
    }
  } catch (err) {
    console.error('[Google DB] Erro Load:', err.response?.data || err.message);
  }
  return null;
}

async function refreshAccessToken() {
  const tokens = await loadTokens();
  if (!tokens?.refresh_token) return null;

  try {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token'
    });

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const newTokens = {
      ...tokens,
      access_token: response.data.access_token,
      expiry_date: Date.now() + (response.data.expires_in || 3600) * 1000
    };

    await saveTokens(newTokens);
    return newTokens;
  } catch (err) {
    console.error('[Google Refresh] Erro:', err.response?.data || err.message);
    return null;
  }
}

async function getValidTokens() {
  let tokens = await loadTokens();
  if (!tokens?.access_token) return null;
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
    tokens = await refreshAccessToken();
  }
  return tokens;
}

router.get('/authorize', (req, res) => {
  const { redirectUri } = getUrls(req);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/auth?${params.toString()}`);
});

router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  const { redirectUri, frontendUrl } = getUrls(req);

  if (!code) return res.redirect(`${frontendUrl}/integracoes?status=error&msg=missing_code`);

  try {
    console.log('[Google Auth] Trocando code por token...');
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });

    let response;
    try {
      response = await axios.post(
        'https://oauth2.googleapis.com/token',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (googleErr) {
      const errorBody = googleErr.response?.data || googleErr.message;
      console.error('[Google Auth] Erro Token Exchange:', errorBody);
      return res.redirect(`${frontendUrl}/integracoes?status=error&msg=GOOGLE_AUTH_ERROR:${encodeURIComponent(JSON.stringify(errorBody))}`);
    }

    await saveTokens(response.data);
    res.redirect(`${frontendUrl}/integracoes?status=connected`);
  } catch (error) {
    console.error('[Google Auth] Erro Final:', error.message);
    res.redirect(`${frontendUrl}/integracoes?status=error&msg=${encodeURIComponent(error.message)}`);
  }
});

router.get('/status', async (req, res) => {
  const tokens = await getValidTokens();
  if (tokens?.access_token) return res.json({ connected: true });

  const { redirectUri } = getUrls(req);
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });

  res.json({
    connected: false,
    authorize_url: `https://accounts.google.com/o/oauth2/auth?${params.toString()}`
  });
});

router.post('/revoke', async (req, res) => {
  const tokens = await loadTokens();
  if (tokens?.refresh_token) {
    try { await axios.post('https://oauth2.googleapis.com/revoke', new URLSearchParams({ token: tokens.refresh_token }).toString()); } catch (e) {}
  }
  try { await axios.delete(`${SUPABASE_URL}/rest/v1/google_tokens?id=eq.default`, { headers: supabaseHeaders }); } catch (e) {}
  cachedTokens = null;
  res.json({ status: 'ok' });
});

module.exports = router;
module.exports.getValidTokens = getValidTokens;
