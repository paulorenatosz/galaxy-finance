const express = require('express');
const router = express.Router();
const axios = require('axios');
const { URLSearchParams } = require('url');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/oauth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive'
];

// Tokens em memória (em produção, usar banco de dados)
let googleTokens = null;

function saveTokens(tokens) {
  googleTokens = tokens;
}

function loadTokens() {
  return googleTokens;
}

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

    saveTokens(response.data);
    res.redirect(`${FRONTEND_URL}/integrations?status=connected`);
  } catch (error) {
    console.error('Erro no OAuth:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/integrations?status=error`);
  }
});

// GET /api/google/status
router.get('/status', (req, res) => {
  const tokens = loadTokens();
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
  const tokens = loadTokens();
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
  googleTokens = null;
  res.json({ status: 'ok', message: 'Acesso Google revogado' });
});

module.exports = router;
