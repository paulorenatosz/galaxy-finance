const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

const ADMIN_KEY = process.env.ADMIN_KEY || 'solarz-admin-2024';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[crypto.randomInt(chars.length)]).join('');
}

// POST /api/convites/gerar?admin_key=xxx&role=xxx
router.post('/gerar', async (req, res) => {
  const { admin_key, role } = req.query || {};

  if (admin_key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Chave admin inválida' });
  }

  const codigo = generateCode();

  try {
    await axios.post(
      `${SUPABASE_URL}/rest/v1/convites`,
      { codigo, role: role || 'usuario', usado: false },
      { headers: supabaseHeaders }
    );

    res.json({
      status: 'ok',
      codigo,
      role: role || 'usuario',
      link: `/convite?codigo=${codigo}`
    });
  } catch (error) {
    console.error('Erro ao criar convite:', error.response?.data || error.message);
    const msg = error.response?.data?.message || error.message;
    if (msg.includes('does not exist') || msg.includes('convites')) {
      return res.status(500).json({ error: 'Tabela convites não existe. Crie no Supabase Dashboard → SQL Editor.' });
    }
    res.status(500).json({ error: msg });
  }
});

// POST /api/convites/validar
router.post('/validar', async (req, res) => {
  const { codigo } = req.body || {};

  if (!codigo) {
    return res.status(400).json({ error: 'Código é obrigatório' });
  }

  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/convites?codigo=eq.${codigo.toUpperCase().trim()}`,
      { headers: supabaseHeaders }
    );

    const convite = response.data[0];

    if (!convite) {
      return res.json({ valido: false, detail: 'Código de convite inválido' });
    }

    if (convite.usado) {
      return res.json({ valido: false, detail: 'Este código já foi utilizado' });
    }

    res.json({
      valido: true,
      role: convite.role,
      detail: 'Código válido! Você pode fazer login.'
    });
  } catch (error) {
    console.error('Erro ao validar convite:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/convites/usar
router.post('/usar', async (req, res) => {
  const { codigo, email } = req.body || {};

  if (!codigo || !email) {
    return res.status(400).json({ error: 'Código e email são obrigatórios' });
  }

  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/convites?codigo=eq.${codigo.toUpperCase().trim()}`,
      { headers: supabaseHeaders }
    );

    const convite = response.data[0];

    if (!convite) {
      return res.json({ valido: false, detail: 'Código de convite inválido' });
    }

    if (convite.usado) {
      return res.json({ valido: false, detail: 'Este código já foi utilizado por outro usuário' });
    }

    await axios.patch(
      `${SUPABASE_URL}/rest/v1/convites?codigo=eq.${codigo.toUpperCase().trim()}`,
      {
        usado: true,
        usado_por: email.toLowerCase(),
        usado_em: new Date().toISOString()
      },
      { headers: supabaseHeaders }
    );

    res.json({
      valido: true,
      role: convite.role,
      detail: 'Convite vinculado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao usar convite:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/convites/listar?admin_key=xxx
router.get('/listar', (req, res) => {
  const { admin_key } = req.query || {};

  if (admin_key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Chave admin inválida' });
  }

  res.json({ convites });
});

// DELETE /api/convites/:codigo?admin_key=xxx
router.delete('/:codigo', (req, res) => {
  const { admin_key } = req.query || {};
  const { codigo } = req.params;

  if (admin_key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Chave admin inválida' });
  }

  try {
    await axios.delete(
      `${SUPABASE_URL}/rest/v1/convites?codigo=eq.${codigo.toUpperCase()}`,
      { headers: supabaseHeaders }
    );

    res.json({ status: 'ok', message: `Convite ${codigo} deletado` });
  } catch (error) {
    console.error('Erro ao deletar convite:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
