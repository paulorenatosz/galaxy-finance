const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getValidTokens } = require('./google');

const PASTA_BASE_ID = process.env.GOOGLE_DRIVE_PASTA_ID || '1hdT3TSn4FjlyrUg75LNoYG1GsrLiXpPV';

// ============================================
// HELPERS - NAVEGAÇÃO DE PASTAS
// ============================================

async function getAuthHeader() {
  const tokens = await getValidTokens();
  if (!tokens?.access_token) return null;
  return { 'Authorization': `Bearer ${tokens.access_token}` };
}

async function buscarPastaPorNome(authHeader, nome, paiId = null, trashed = false) {
  let query = `mimeType='application/vnd.google-apps.folder' and trashed=${trashed}`;
  
  // Buscar por nome exato ou parcial
  if (nome.includes('*')) {
    // Busca parcial: nome contém o texto
    const searchTerm = nome.replace(/\*/g, '');
    query += ` and name contains '${searchTerm}'`;
  } else {
    query += ` and name='${nome}'`;
  }
  
  if (paiId) query += ` and '${paiId}' in parents`;

  try {
    const response = await axios.get(
      'https://www.googleapis.com/drive/v3/files',
      {
        headers: authHeader,
        params: { q: query, fields: 'files(id,name)', pageSize: 50 }
      }
    );
    return response.data.files || [];
  } catch (e) {
    console.error('[Drive] Erro ao buscar pasta:', e.message);
    return [];
  }
}

async function buscarPastaUnica(authHeader, nome, paiId = null) {
  const pastas = await buscarPastaPorNome(authHeader, nome, paiId);
  return pastas.length > 0 ? pastas[0] : null;
}

async function criarPasta(authHeader, nome, paiId) {
  const metadata = {
    name: nome,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (paiId) metadata.parents = [paiId];

  try {
    const response = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      metadata,
      {
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        params: { fields: 'id,name' }
      }
    );
    return response.data;
  } catch (e) {
    console.error('[Drive] Erro ao criar pasta:', e.message);
    return null;
  }
}

async function listarSubpastas(authHeader, paiId) {
  try {
    const query = `'${paiId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const response = await axios.get(
      'https://www.googleapis.com/drive/v3/files',
      {
        headers: authHeader,
        params: { q: query, fields: 'files(id,name)', pageSize: 100, orderBy: 'name' }
      }
    );
    return response.data.files || [];
  } catch (e) {
    console.error('[Drive] Erro ao listar subpastas:', e.message);
    return [];
  }
}

// Navegar pela estrutura: Evento > OG | ORGANIZAÇÃO > NF ou OR | ORÇAMENTOS
async function navegarParaPastaDocumento(authHeader, eventoPastaId, tipoDocumento) {
  // 1. Buscar pasta "OG | ORGANIZAÇÃO" dentro do evento
  let pastaOG = await buscarPastaUnica(authHeader, 'OG | ORGANIZAÇÃO', eventoPastaId);
  
  // Tentar variações do nome
  if (!pastaOG) {
    const subpastas = await listarSubpastas(authHeader, eventoPastaId);
    pastaOG = subpastas.find(p => 
      p.name.toUpperCase().includes('OG') && p.name.toUpperCase().includes('ORGANIZAÇÃO')
    ) || subpastas.find(p => 
      p.name.toUpperCase().startsWith('OG')
    );
  }

  if (!pastaOG) {
    // Criar se não existir
    pastaOG = await criarPasta(authHeader, 'OG | ORGANIZAÇÃO', eventoPastaId);
  }

  if (!pastaOG?.id) {
    throw new Error('Não foi possível encontrar/criar pasta OG | ORGANIZAÇÃO');
  }

  // 2. Buscar subpasta de destino (NF ou OR | ORÇAMENTOS)
  let pastaDestino;
  
  if (tipoDocumento === 'NF') {
    pastaDestino = await buscarPastaUnica(authHeader, 'NF', pastaOG.id);
    if (!pastaDestino) {
      // Procurar variações
      const subpastas = await listarSubpastas(authHeader, pastaOG.id);
      pastaDestino = subpastas.find(p => p.name.toUpperCase() === 'NF');
    }
    if (!pastaDestino) {
      pastaDestino = await criarPasta(authHeader, 'NF', pastaOG.id);
    }
  } else {
    // ORÇAMENTO
    pastaDestino = await buscarPastaUnica(authHeader, 'OR | ORÇAMENTOS', pastaOG.id);
    if (!pastaDestino) {
      const subpastas = await listarSubpastas(authHeader, pastaOG.id);
      pastaDestino = subpastas.find(p => 
        p.name.toUpperCase().includes('OR') && p.name.toUpperCase().includes('ORÇAMENTO')
      ) || subpastas.find(p => 
        p.name.toUpperCase().startsWith('OR')
      );
    }
    if (!pastaDestino) {
      pastaDestino = await criarPasta(authHeader, 'OR | ORÇAMENTOS', pastaOG.id);
    }
  }

  if (!pastaDestino?.id) {
    throw new Error(`Não foi possível encontrar/criar pasta ${tipoDocumento === 'NF' ? 'NF' : 'OR | ORÇAMENTOS'}`);
  }

  return { pastaOG, pastaDestino };
}

// ============================================
// NOMENCLATURA PADRONIZADA
// ============================================

function gerarNomeArquivo(tipoDocumento, nomeFornecedor, dataVencimento, extras = {}) {
  // Normalizar nome do fornecedor: UPPER CASE, sem acentos, espaços viram _
  const nomeNorm = nomeFornecedor
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);

  // Formatar data: DD_MM_AAAA
  let dataFormatada = '';
  if (dataVencimento) {
    const d = new Date(dataVencimento);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const aaaa = d.getFullYear();
    dataFormatada = `${dd}_${mm}_${aaaa}`;
  } else {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const aaaa = now.getFullYear();
    dataFormatada = `${dd}_${mm}_${aaaa}`;
  }

  if (tipoDocumento === 'NF') {
    const numNF = extras.numero_nota_fiscal || 'SN';
    return `NF_${nomeNorm}_${dataFormatada}_${numNF}`;
  } else {
    const valor = extras.valor ? `R$${Math.round(Number(extras.valor))}` : '';
    return `ORC_${nomeNorm}_${dataFormatada}${valor ? '_' + valor : ''}`;
  }
}

// ============================================
// ROTAS
// ============================================

// GET /api/drive/status
router.get('/status', async (req, res) => {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return res.json({ connected: false });
  }
  res.json({ connected: true });
});

// GET /api/drive/listar-pastas-evento
// Lista pastas disponíveis na raiz do Drive base para o usuário escolher
router.get('/listar-pastas-evento', async (req, res) => {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return res.status(401).json({ error: 'Google não conectado' });
  }

  try {
    const pastas = await listarSubpastas(authHeader, PASTA_BASE_ID);
    res.json({ 
      pastas: pastas.map(p => ({ id: p.id, name: p.name })),
      pasta_base_id: PASTA_BASE_ID
    });
  } catch (error) {
    console.error('[Drive] Erro ao listar pastas:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/drive/listar-subpastas/:pastaId
// Lista subpastas de uma pasta específica (para navegar)
router.get('/listar-subpastas/:pastaId', async (req, res) => {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return res.status(401).json({ error: 'Google não conectado' });
  }

  try {
    const pastas = await listarSubpastas(authHeader, req.params.pastaId);
    res.json({ pastas: pastas.map(p => ({ id: p.id, name: p.name })) });
  } catch (error) {
    console.error('[Drive] Erro ao listar subpastas:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drive/buscar-pasta-evento
// Tenta encontrar a pasta do evento pelo nome
router.post('/buscar-pasta-evento', async (req, res) => {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return res.status(401).json({ error: 'Google não conectado' });
  }

  const { nome_evento } = req.body || {};
  if (!nome_evento) {
    return res.status(400).json({ error: 'Nome do evento é obrigatório' });
  }

  try {
    // Buscar em todas as subpastas da base
    const todasPastas = await listarSubpastas(authHeader, PASTA_BASE_ID);
    
    // Tentar match exato
    let match = todasPastas.find(p => p.name === nome_evento);
    
    // Tentar match parcial (nome do evento contido no nome da pasta)
    if (!match) {
      const termosBusca = nome_evento.toLowerCase().split(' ').filter(t => t.length > 2);
      match = todasPastas.find(p => {
        const nomePasta = p.name.toLowerCase();
        return termosBusca.every(t => nomePasta.includes(t));
      });
    }

    // Tentar match por palavras-chave
    if (!match) {
      match = todasPastas.find(p => {
        const nomePasta = p.name.toLowerCase();
        const nomeEvento = nome_evento.toLowerCase();
        // Se pelo menos 60% das palavras do evento estão na pasta
        const palavrasEvento = nomeEvento.split(' ').filter(t => t.length > 2);
        const matches = palavrasEvento.filter(t => nomePasta.includes(t));
        return matches.length >= Math.ceil(palavrasEvento.length * 0.6);
      });
    }

    if (match) {
      // Listar subpastas para mostrar a estrutura
      const subpastas = await listarSubpastas(authHeader, match.id);
      res.json({ 
        encontrada: true, 
        pasta: { id: match.id, name: match.name },
        subpastas: subpastas.map(p => ({ id: p.id, name: p.name }))
      });
    } else {
      res.json({ 
        encontrada: false, 
        sugestoes: todasPastas.slice(0, 20).map(p => ({ id: p.id, name: p.name }))
      });
    }
  } catch (error) {
    console.error('[Drive] Erro ao buscar pasta do evento:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drive/upload
// Upload inteligente: navega até a pasta correta e sobe o arquivo
router.post('/upload', async (req, res) => {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return res.status(401).json({ error: 'Google não conectado. Conecte na página de Integrações.' });
  }

  const { 
    file,              // base64 do arquivo
    file_name,         // nome original do arquivo (ex: boleto.pdf)
    tipo_documento,    // 'NF' ou 'ORCAMENTO'
    evento_pasta_id,   // ID da pasta do evento no Drive
    nome_fornecedor,   // nome do fornecedor
    data_vencimento,   // data de vencimento
    numero_nota_fiscal,// número da NF (para tipo NF)
    valor              // valor (para tipo ORCAMENTO)
  } = req.body || {};

  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  if (!evento_pasta_id) {
    return res.status(400).json({ error: 'Pasta do evento não informada' });
  }

  if (!tipo_documento || !['NF', 'ORCAMENTO'].includes(tipo_documento)) {
    return res.status(400).json({ error: 'Tipo de documento inválido. Use NF ou ORCAMENTO.' });
  }

  try {
    // 1. Navegar até a pasta correta (Evento > OG | ORGANIZAÇÃO > NF ou OR | ORÇAMENTOS)
    const { pastaOG, pastaDestino } = await navegarParaPastaDocumento(
      authHeader, evento_pasta_id, tipo_documento
    );

    // 2. Gerar nome do arquivo padronizado
    const extensao = file_name ? '.' + file_name.split('.').pop() : '.pdf';
    const nomeGerado = gerarNomeArquivo(tipo_documento, nome_fornecedor || 'FORNECEDOR', data_vencimento, {
      numero_nota_fiscal,
      valor
    });
    const nomeArquivoFinal = nomeGerado + extensao;

    // 3. Upload usando multipart
    const fileBuffer = Buffer.from(file, 'base64');
    
    const boundary = '-------314159265358979323846';
    const metadata = JSON.stringify({
      name: nomeArquivoFinal,
      parents: [pastaDestino.id]
    });

    // Detectar mimeType
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const mimeType = mimeTypes[extensao.toLowerCase()] || 'application/octet-stream';

    const multipartBody = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n`
      ),
      fileBuffer,
      Buffer.from(`\r\n--${boundary}--`)
    ]);

    const uploadResponse = await axios.post(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
      multipartBody,
      {
        headers: {
          ...authHeader,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartBody.length
        }
      }
    );

    const fileId = uploadResponse.data.id;

    // 4. Tornar acessível por link (anyone with link can view)
    try {
      await axios.post(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        { type: 'anyone', role: 'reader' },
        { headers: { ...authHeader, 'Content-Type': 'application/json' } }
      );
    } catch (permErr) {
      console.warn('[Drive] Aviso: não foi possível tornar arquivo público:', permErr.message);
    }

    res.json({
      status: 'ok',
      message: `Arquivo enviado com sucesso para ${pastaDestino.name}!`,
      fileId,
      fileName: nomeArquivoFinal,
      webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
      pasta_destino: pastaDestino.name,
      pasta_og: pastaOG.name,
      caminho: `${pastaOG.name} > ${pastaDestino.name} > ${nomeArquivoFinal}`
    });
  } catch (error) {
    console.error('[Drive] Erro no upload:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Erro ao fazer upload' });
  }
});

// POST /api/drive/criar-evento (mantido para compatibilidade)
router.post('/criar-evento', async (req, res) => {
  const authHeader = await getAuthHeader();
  if (!authHeader) {
    return res.status(401).json({ error: 'Google não conectado' });
  }

  const { nome_evento } = req.body || {};

  try {
    // Criar pasta do evento
    let pastaEvento = await buscarPastaUnica(authHeader, nome_evento, PASTA_BASE_ID);
    if (!pastaEvento) {
      pastaEvento = await criarPasta(authHeader, nome_evento, PASTA_BASE_ID);
    }

    if (!pastaEvento?.id) {
      return res.status(500).json({ error: 'Não foi possível criar pasta do evento' });
    }

    // Criar estrutura OG | ORGANIZAÇÃO > NF + OR | ORÇAMENTOS
    let pastaOG = await buscarPastaUnica(authHeader, 'OG | ORGANIZAÇÃO', pastaEvento.id);
    if (!pastaOG) {
      pastaOG = await criarPasta(authHeader, 'OG | ORGANIZAÇÃO', pastaEvento.id);
    }

    if (pastaOG?.id) {
      let pastaNF = await buscarPastaUnica(authHeader, 'NF', pastaOG.id);
      if (!pastaNF) await criarPasta(authHeader, 'NF', pastaOG.id);

      let pastaORC = await buscarPastaUnica(authHeader, 'OR | ORÇAMENTOS', pastaOG.id);
      if (!pastaORC) await criarPasta(authHeader, 'OR | ORÇAMENTOS', pastaOG.id);
    }

    res.json({
      status: 'ok',
      evento: nome_evento,
      pasta_evento: `https://drive.google.com/drive/folders/${pastaEvento.id}`,
      pasta_evento_id: pastaEvento.id
    });
  } catch (error) {
    console.error('[Drive] Erro ao criar evento:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
