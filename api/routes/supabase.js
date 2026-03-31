const express = require('express');
const router = express.Router();
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// GET /api/supabase/investimentos
router.get('/investimentos', async (req, res) => {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/investimentos`,
      {
        headers,
        params: { select: '*', order: 'data_vencimento.asc' }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar investimentos:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/supabase/resumo
router.get('/resumo', async (req, res) => {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/investimentos`,
      { headers, params: { select: '*' } }
    );
    const investimentos = response.data;

    const totalOrcado = investimentos.reduce((sum, i) => sum + (i.valor_orcado || 0), 0);
    const totalRealizado = investimentos.reduce((sum, i) => sum + (i.valor_realizado || 0), 0);
    const totalPago = investimentos.reduce((sum, i) => sum + (i.status === 'PAGO' ? (i.valor_realizado || 0) : 0), 0);

    const porStatus = {};
    investimentos.forEach(i => {
      const status = i.status || 'PENDENTE';
      porStatus[status] = (porStatus[status] || 0) + 1;
    });

    const porCategoria = {};
    investimentos.forEach(i => {
      const cat = i.tipo_fornecedor || 'Outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + (i.valor_realizado || 0);
    });

    res.json({
      total_orcado: totalOrcado,
      total_realizado: totalRealizado,
      total_pago: totalPago,
      pendente: totalOrcado - totalPago,
      por_status: porStatus,
      por_categoria: porCategoria,
      total_investimentos: investimentos.length
    });
  } catch (error) {
    console.error('Erro ao buscar resumo:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
