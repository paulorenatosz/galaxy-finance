const express = require('express');
const router = express.Router();
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '2083282215';

const headers = supabaseHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// Tokens em memória (compartilhado com google.js em produção seria DB)
let googleTokens = null;
function setGoogleTokens(tokens) { googleTokens = tokens; }
function getGoogleTokens() { return googleTokens; }

// POST /api/sheets/atualizar
router.post('/atualizar', async (req, res) => {
  const tokens = getGoogleTokens();
  if (!tokens?.access_token) {
    return res.status(401).json({ error: 'Google não conectado' });
  }

  try {
    // Buscar investimentos
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/investimentos`,
      { headers: supabaseHeaders, params: { select: '*', order: 'data_vencimento' } }
    );
    const investimentos = response.data;

    // Calcular totais
    const totalOrcado = investimentos.reduce((sum, i) => sum + parseFloat(i.valor_orcado || 0), 0);
    const totalRealizado = investimentos.reduce((sum, i) => sum + parseFloat(i.valor_realizado || 0), 0);

    const formatCurrency = (val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).replace('.', ',').replace(',', '.')}`;
    const formatBRL = (val) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const values = [
      ['', '', '', '', 'TOTAL GERAL', formatCurrency(totalOrcado), formatCurrency(totalRealizado), '', '', '', '', '', '', '', '', '', '', ''],
      ['Fornecedor', 'Categoria', 'Descrição', 'Valor Orçado', 'Valor Realizado', 'Quantidade', 'Forma Pagamento', 'Parcelas', 'Data Vencimento', 'Datas Parcelas', 'NF', 'Possui Boleto', 'Resp.', 'Mês', 'Status', 'Observações']
    ];

    investimentos.forEach(i => {
      const statusLabels = { PENDENTE: 'Pendente', RECEBIDO: 'Recebido', APROVADO: 'Aprovado', PAGO: 'Pago' };
      let mesRef = i.mes_referencia || '';
      if (mesRef.includes('_')) {
        const [mes, ano] = mesRef.split('_');
        const meses = { FEV: 'Fev', MAR: 'Mar', ABR: 'Abr', MAI: 'Mai', JUN: 'Jun', JUL: 'Jul', AGO: 'Ago', SET: 'Set', OUT: 'Out', NOV: 'Nov', DEZ: 'Dez' };
        mesRef = `${meses[mes] || mes}/${ano}`;
      }

      let dataVenc = i.data_vencimento || '';
      if (dataVenc.includes('T')) dataVenc = dataVenc.split('T')[0];

      let datasPag = '';
      if (i.datas_pagamento) {
        if (Array.isArray(i.datas_pagamento)) {
          datasPag = i.datas_pagamento.map(d => String(d).slice(0, 10)).join(', ');
        } else {
          datasPag = String(i.datas_pagamento);
        }
      }

      values.push([
        i.nome_fornecedor || '',
        i.tipo_fornecedor || '',
        i.descricao_despesa || '',
        parseFloat(i.valor_orcado || 0),
        parseFloat(i.valor_realizado || 0),
        i.quantidade || 1,
        i.forma_pagamento || '',
        i.numero_parcelas || 1,
        dataVenc,
        datasPag,
        i.numero_nota_fiscal || '',
        i.possui_boleto_nf ? 'Sim' : 'Não',
        i.responsavel || '',
        mesRef,
        statusLabels[i.status] || i.status || '',
        i.observacoes || ''
      ]);
    });

    const authHeader = { 'Authorization': `Bearer ${tokens.access_token}` };

    // Limpar e escrever na planilha
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A1:ZZ9999:clear`,
      {},
      { headers: authHeader }
    );

    const writeResponse = await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/A1?valueInputOption=USER_ENTERED`,
      { values },
      { headers: authHeader }
    );

    if (writeResponse.status === 200) {
      res.json({
        status: 'ok',
        message: 'Planilha atualizada!',
        url: `https://docs.google.com/spreadsheets/d/${SHEET_ID}`
      });
    } else {
      res.status(500).json({ error: writeResponse.data });
    }
  } catch (error) {
    console.error('Erro ao atualizar planilha:', error.response?.data || error.message);
    res.status(500).json({ error: error.message, details: error.response?.data });
  }
});

// POST /api/sheets/criar
router.post('/criar', async (req, res) => {
  // Redireciona para atualizar
  req.url = '/atualizar';
  router.handle(req, res);
});

module.exports = router;
