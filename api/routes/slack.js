const express = require('express');
const router = express.Router();
const { WebClient } = require('@slack/web-api');

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#financeiro';

const slackClient = SLACK_BOT_TOKEN ? new WebClient(SLACK_BOT_TOKEN) : null;

// POST /api/slack/test
router.post('/test', async (req, res) => {
  if (!slackClient) {
    return res.json({ status: 'Slack não configurado' });
  }

  try {
    await slackClient.chat.postMessage({
      channel: SLACK_CHANNEL,
      text: '✅ SolarZ Finance Bot conectado com sucesso!'
    });
    res.json({ status: 'ok', message: 'Mensagem enviada!' });
  } catch (error) {
    console.error('Erro Slack:', error.message);
    res.status(500).json({ status: 'error', detail: error.message });
  }
});

// POST /api/slack/notificar
router.post('/notificar', async (req, res) => {
  if (!slackClient) {
    return res.status(500).json({ error: 'Slack não configurado' });
  }

  const { investimento } = req.body || {};
  if (!investimento) {
    return res.status(400).json({ error: 'Dados do investimento são obrigatórios' });
  }

  const emojiStatus = { PENDENTE: '⏳', RECEBIDO: '📥', APROVADO: '✅', PAGO: '💚' };
  const emoji = emojiStatus[investimento.status] || '💰';

  const mensagem = `${emoji} *Novo Investimento Cadastrado*

*Fornecedor:* ${investimento.nome_fornecedor || 'N/A'}
*Categoria:* ${investimento.tipo_fornecedor || 'N/A'}
*Valor:* R$ ${(investimento.valor_realizado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
*Vencimento:* ${investimento.data_vencimento || 'N/A'}
*Status:* ${investimento.status || 'PENDENTE'}
*Responsável:* ${investimento.responsavel || 'N/A'}`;

  try {
    await slackClient.chat.postMessage({
      channel: SLACK_CHANNEL,
      text: mensagem,
      mrkdwn: true
    });
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Erro Slack:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
