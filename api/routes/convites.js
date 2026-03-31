const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const ADMIN_KEY = process.env.ADMIN_KEY || 'solarz-admin-2024';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Convites em memória (em produção seria banco de dados)
const convites = [];

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[crypto.randomInt(chars.length)]).join('');
}

// POST /api/convites/gerar?admin_key=xxx&role=xxx
router.post('/gerar', (req, res) => {
  const { admin_key, role } = req.query || {};

  if (admin_key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Chave admin inválida' });
  }

  const codigo = generateCode();
  convites.push({
    codigo,
    role: role || 'usuario',
    usado: false,
    usado_por: null,
    criado_em: new Date().toISOString(),
    usado_em: null,
    email: null
  });

  res.json({
    status: 'ok',
    codigo,
    role: role || 'usuario',
    link: `/convite?codigo=${codigo}`
  });
});

// POST /api/convites/validar
router.post('/validar', (req, res) => {
  const { codigo } = req.body || {};

  if (!codigo) {
    return res.status(400).json({ error: 'Código é obrigatório' });
  }

  const convite = convites.find(c => c.codigo === codigo.toUpperCase().trim());
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
});

// POST /api/convites/usar
router.post('/usar', (req, res) => {
  const { codigo, email } = req.body || {};

  if (!codigo || !email) {
    return res.status(400).json({ error: 'Código e email são obrigatórios' });
  }

  const convite = convites.find(c => c.codigo === codigo.toUpperCase().trim());
  if (!convite) {
    return res.json({ valido: false, detail: 'Código de convite inválido' });
  }

  if (convite.usado) {
    return res.json({ valido: false, detail: 'Este código já foi utilizado por outro usuário' });
  }

  if (convite.email && convite.email !== email.toLowerCase()) {
    return res.json({ valido: false, detail: 'Este código foi gerado para outro email' });
  }

  convite.usado = true;
  convite.usado_por = email.toLowerCase();
  convite.usado_em = new Date().toISOString();
  if (!convite.email) convite.email = email.toLowerCase();

  res.json({
    valido: true,
    role: convite.role,
    detail: 'Convite vinculado com sucesso!'
  });
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

  const index = convites.findIndex(c => c.codigo === codigo.toUpperCase());
  if (index !== -1) {
    convites.splice(index, 1);
  }

  res.json({ status: 'ok', message: `Convite ${codigo} deletado` });
});

module.exports = router;
