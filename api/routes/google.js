const express = require('express');
const router = express.Router();
const axios = require('axios');
const { URLSearchParams } = require('url');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/oauth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

// ============================================
// TOKEN PERSISTENCE VIA SUPABASE
// ============================================

// Cache em memória para não bater no Supabase toda request
let cachedTokens = null;

async function saveTokens(tokens) {
  cachedTokens = tokens;
  try {
    // Upsert: insere ou atualiza
    const payload = {
      id: 'default',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || cachedTokens?.refresh_token || null,
      expiry_date: tokens.expiry_date || (Date.now() + (tokens.expires_in || 3600) * 1000),
      updated_at: new Date().toISOString()
    };

    // Tentar update primeiro
    const updateRes = await axios.patch(
      `${SUPABASE_URL}/rest/v1/google_tokens?id=eq.default`,
      payload,
      { headers: supabaseHeaders }
    );

    // Se não encontrou row para update, inserir
    if (!updateRes.data || updateRes.data.length === 0) {
      await axios.post(
        `${SUPABASE_URL}/rest/v1/google_tokens`,
        payload,
        { headers: { ...supabaseHeaders, 'Prefer': 'return=representation,resolution=merge-duplicates' } }
      );
    }

    console.log('[Google] Tokens salvos no Supabase com sucesso');
  } catch (err) {
    console.error('[Google] Erro ao salvar tokens no Supabase:', err.message);
  }
}

async function loadTokens() {
  // Se já tem em cache e não expirou, retorna
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
      console.log('[Google] Tokens carregados do Supabase');

      // Se expirou, tentar renovar
      if (cachedTokens.expiry_date && Date.now() >= cachedTokens.expiry_date - 60000) {
        console.log('[Google] Token expirado, renovando...');
        await refreshAccessToken();
      }

      return cachedTokens;
    }
  } catch (err) {
    console.error('[Google] Erro ao carregar tokens do Supabase:', err.message);
  }

  return null;
}

async function refreshAccessToken() {
  if (!cachedTokens?.refresh_token) {
    console.error('[Google] Sem refresh_token para renovar');
    return null;
  }

  try {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: cachedTokens.refresh_token,
      grant_type: 'refresh_token'
    });

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const newTokens = {
      ...cachedTokens,
      access_token: response.data.access_token,
      expiry_date: Date.now() + (response.data.expires_in || 3600) * 1000
    };

    await saveTokens(newTokens);
    console.log('[Google] Token renovado com sucesso');
    return newTokens;
  } catch (err) {
    console.error('[Google] Erro ao renovar token:', err.response?.data || err.message);
    return null;
  }
}

// Função exportada para outros módulos usarem
async function getValidTokens() {
  let tokens = await loadTokens();
  if (!tokens?.access_token) return null;

  // Se expirou, renovar
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
    tokens = await refreshAccessToken();
  }

  return tokens;
}

// ============================================
// ROTAS
// ============================================

// GET /api/google/authorize
router.get('/authorize', (req, res) => {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/auth?${params.toString()}`);
});

// GET /api/google/oauth/callback
router.get('/oauth/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Código não fornecido' });
  }

  try {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: GOOGLE_REDIRECT_URI
    });

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    await saveTokens(response.data);
    res.redirect(`${FRONTEND_URL}/integracoes?status=connected`);
  } catch (error) {
    console.error('Erro no OAuth:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/integracoes?status=error`);
  }
});

// GET /api/google/status
router.get('/status', async (req, res) => {
  const tokens = await getValidTokens();
  if (tokens?.access_token) {
    return res.json({ connected: true });
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
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

// POST /api/google/revoke
router.post('/revoke', async (req, res) => {
  const tokens = await loadTokens();
  if (tokens?.refresh_token) {
    try {
      await axios.post(
        'https://oauth2.googleapis.com/revoke',
        new URLSearchParams({ token: tokens.refresh_token }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
    } catch (e) {
      console.error('Erro ao revogar token:', e.message);
    }
  }

  // Limpar do Supabase
  try {
    await axios.delete(
      `${SUPABASE_URL}/rest/v1/google_tokens?id=eq.default`,
      { headers: supabaseHeaders }
    );
  } catch (e) {
    console.error('Erro ao limpar tokens do Supabase:', e.message);
  }

  cachedTokens = null;
  res.json({ status: 'ok', message: 'Acesso Google revogado' });
});

module.exports = router;
module.exports.getValidTokens = getValidTokens;
