const express = require('express');
const router = express.Router();
const axios = require('axios');

const PASTA_BASE_ID = process.env.GOOGLE_DRIVE_PASTA_ID || '1hdT3TSn4FjlyrUg75LNoYG1GsrLiXpPV';
const PASTA_BOLETOS_ID = process.env.GOOGLE_DRIVE_BOLETOS_ID || '1jgGeKq512GqaCsvlj_IvZ8YZxjOWIS61';

// Tokens em memória (compartilhado)
let googleTokens = null;
function setGoogleTokens(tokens) { googleTokens = tokens; }
function getGoogleTokens() { return googleTokens; }

async function buscarPastaPorNome(client, authHeader, nome, paiId = null) {
  let query = `name='${nome}' and mimeType='application/vnd.google-apps.folder'`;
  if (paiId) query += ` and '${paiId}' in parents`;
  else query += " and 'root' in parents";

  try {
    const response = await client.get(
      'https://www.googleapis.com/drive/v3/files',
      {
        headers: authHeader,
        params: { q: query, fields: 'files(id,name)' }
      }
    );
    if (response.data.files?.length > 0) return response.data.files[0];
  } catch (e) {
    console.error('Erro ao buscar pasta:', e.message);
  }
  return null;
}

async function criarPasta(client, authHeader, nome, paiId) {
  const pasta = {
    name: nome,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (paiId) pasta.parents = [paiId];

  try {
    const response = await client.post(
      'https://www.googleapis.com/drive/v3/files',
      pasta,
      {
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        params: { fields: 'id,name' }
      }
    );
    return response.data;
  } catch (e) {
    console.error('Erro ao criar pasta:', e.message);
    return null;
  }
}

// GET /api/drive/status
router.get('/status', (req, res) => {
  const tokens = getGoogleTokens();
  if (!tokens?.access_token) {
    return res.json({ connected: false });
  }
  res.json({ connected: true });
});

// POST /api/drive/criar-evento
router.post('/criar-evento', async (req, res) => {
  const tokens = getGoogleTokens();
  if (!tokens?.access_token) {
    return res.status(401).json({ error: 'Google não conectado' });
  }

  const { nome_evento, mes, edicao } = req.body || {};

  try {
    const authHeader = { 'Authorization': `Bearer ${tokens.access_token}` };
    const client = axios.create({ baseURL: 'https://www.googleapis.com' });

    // Criar FINANCEIRO
    let pastaFinanceiro = await buscarPastaPorNome(client, authHeader, 'FINANCEIRO', PASTA_BASE_ID);
    if (!pastaFinanceiro) {
      pastaFinanceiro = await criarPasta(client, authHeader, 'FINANCEIRO', PASTA_BASE_ID);
    }

    if (!pastaFinanceiro?.id) {
      return res.status(500).json({ error: 'Não foi possível criar pasta FINANCEIRO' });
    }

    // Criar PLANILHAS dentro de FINANCEIRO
    let pastaPlanilhas = await buscarPastaPorNome(client, authHeader, 'PLANILHAS', pastaFinanceiro.id);
    if (!pastaPlanilhas) {
      pastaPlanilhas = await criarPasta(client, authHeader, 'PLANILHAS', pastaFinanceiro.id);
    }

    if (!pastaPlanilhas?.id) {
      return res.status(500).json({ error: 'Não foi possível criar pasta PLANILHAS' });
    }

    res.json({
      status: 'ok',
      evento: nome_evento,
      mes,
      edicao,
      pasta_financeiro: `https://drive.google.com/drive/folders/${pastaFinanceiro.id}`,
      pasta_planilhas: `https://drive.google.com/drive/folders/${pastaPlanilhas.id}`,
      pastas: [
        { nome: 'FINANCEIRO', id: pastaFinanceiro.id, tipo: 'Financeiro' },
        { nome: 'PLANILHAS', id: pastaPlanilhas.id, tipo: 'Planilhas' }
      ]
    });
  } catch (error) {
    console.error('Erro ao criar evento:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drive/upload-boleto
router.post('/upload-boleto', async (req, res) => {
  const tokens = getGoogleTokens();
  if (!tokens?.access_token) {
    return res.status(401).json({ error: 'Google não conectado' });
  }

  const { file, filename, investimento_id } = req.body || {};

  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const nomeArquivo = filename || 'boleto.pdf';

  try {
    const authHeader = { 'Authorization': `Bearer ${tokens.access_token}` };

    // Criar arquivo
    const fileBuffer = Buffer.from(file, 'base64');
    const metadata = {
      name: nomeArquivo,
      parents: [PASTA_BOLETOS_ID]
    };

    const response = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      metadata,
      {
        headers: authHeader,
        params: { uploadType: 'multipart' }
      }
    );

    const fileId = response.data.id;

    // Tornar público
    await axios.post(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      { type: 'anyone', role: 'reader' },
      { headers: authHeader }
    );

    res.json({
      status: 'ok',
      message: 'Arquivo enviado com sucesso!',
      fileId,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
