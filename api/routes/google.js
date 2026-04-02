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
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal' // Minimal is safer for upserts if you don't need the result
};

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

// Helper para detectar URLs dinamicamente se as envs não estiverem lá
function getUrls(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  
  // API redirect: base + /api/google/oauth/callback
  // Frontend: se estiver em topaz.vercel.app, o frontend é o mesmo base
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/google/oauth/callback`;
  const frontendUrl = process.env.FRONTEND_URL || baseUrl;
  
  return { redirectUri, frontendUrl };
}

// ============================================
// TOKEN PERSISTENCE VIA SUPABASE
// ============================================

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

    // Upsert usando POST com resolution=merge-duplicates (PostgREST style)
    // Isso é mais atômico que PATCH + POST
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

    console.log('[Google] Tokens sincronizados no Supabase');
  } catch (err) {
    console.error('[Google] Erro ao salvar tokens:', err.response?.data || err.message);
    throw err; // Repassar para o callback tratar
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
    console.error('[Google] Erro ao carregar tokens:', err.response?.data || err.message);
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
    console.error('[Google] Erro ao renovar token:', err.response?.data || err.message);
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

// ============================================
// ROTAS
// ============================================

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

  if (!code) return res.redirect(`${frontendUrl}/integracoes?status=error&reason=no_code`);

  try {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    await saveTokens(response.data);
    res.redirect(`${frontendUrl}/integracoes?status=connected`);
  } catch (error) {
    console.error('Erro no OAuth Callback:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/integracoes?status=error&msg=${encodeURIComponent(error.message)}`);
  }
});

router.get('/status', async (req, res) => {
  const tokens = await getValidTokens();
  if (tokens?.access_token) {
    return res.json({ connected: true });
  }

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
    try {
      await axios.post('https://oauth2.googleapis.com/revoke', new URLSearchParams({ token: tokens.refresh_token }).toString());
    } catch (e) {}
  }

  try {
    await axios.delete(`${SUPABASE_URL}/rest/v1/google_tokens?id=eq.default`, { headers: supabaseHeaders });
  } catch (e) {}

  cachedTokens = null;
  res.json({ status: 'ok' });
});

module.exports = router;
module.exports.getValidTokens = getValidTokens;
