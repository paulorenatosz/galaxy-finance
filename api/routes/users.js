const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SERVER_PORT = process.env.PORT || 3000;

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// GET /api/users/list
router.get('/list', async (req, res) => {
  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/user_profiles?ativo=eq.true&select=*`,
      { headers }
    );
    res.json({ users: response.data });
  } catch (error) {
    console.error('Erro ao listar usuários:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/invite
router.post('/invite', async (req, res) => {
  const { email, nome, role } = req.body || {};

  if (!email || !nome) {
    return res.status(400).json({ error: 'Email e nome são obrigatórios' });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Verificar se email já existe
    const existingResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/user_profiles?email=eq.${encodeURIComponent(email.toLowerCase())}`,
      { headers }
    );

    if (existingResponse.data?.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criar convite
    const inviteData = {
      email: email.toLowerCase(),
      nome,
      role: role || 'usuario',
      token,
      expires_at: expiresAt,
      status: 'pendente'
    };

    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/user_invites`,
      inviteData,
      { headers }
    );

    const inviteLink = `${FRONTEND_URL}/convite?token=${token}`;

    res.json({
      status: 'ok',
      message: 'Convite criado!',
      invite_link: inviteLink,
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('Erro ao criar convite:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/validate-invite
router.get('/validate-invite', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token é obrigatório' });

  try {
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/user_invites?token=eq.${token}&status=eq.pendente&expires_at=gt.${new Date().toISOString()}`,
      { headers }
    );

    const invites = response.data;
    if (invites?.length > 0) {
      res.json({ valid: true, invite: invites[0] });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Erro ao validar convite:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/accept-invite
router.post('/accept-invite', async (req, res) => {
  const { token, password } = req.body || {};

  if (!token || !password) {
    return res.status(400).json({ error: 'Token e senha são obrigatórios' });
  }

  try {
    // Validar convite
    const inviteResponse = await axios.get(
      `${SUPABASE_URL}/rest/v1/user_invites?token=eq.${token}&status=eq.pendente`,
      { headers }
    );

    const invites = inviteResponse.data;
    if (!invites?.length) {
      return res.status(400).json({ error: 'Convite inválido ou expirado' });
    }

    const invite = invites[0];

    // Criar usuário no Supabase Auth
    const authResponse = await axios.post(
      `${SUPABASE_URL}/auth/v1/signup`,
      {
        email: invite.email,
        password,
        data: { name: invite.nome, role: invite.role }
      },
      { headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' } }
    );

    if (authResponse.status !== 200 && authResponse.status !== 201) {
      const errorText = authResponse.data?.message || authResponse.data?.error || '';
      if (errorText.includes('already been registered')) {
        return res.status(400).json({ error: 'Este email já está cadastrado. Faça login normalmente.' });
      }
      return res.status(400).json({ error: `Erro ao criar usuário: ${errorText}` });
    }

    const userData = authResponse.data;
    const userId = userData.user?.id;

    if (userId) {
      // Criar perfil
      await axios.post(
        `${SUPABASE_URL}/rest/v1/user_profiles`,
        {
          user_id: userId,
          email: invite.email,
          nome: invite.nome,
          role: invite.role,
          ativo: true
        },
        { headers }
      );

      // Atualizar status do convite
      await axios.patch(
        `${SUPABASE_URL}/rest/v1/user_invites?token=eq.${token}`,
        { status: 'aceito' },
        { headers }
      );

      res.json({ status: 'ok', message: 'Usuário criado com sucesso!' });
    } else {
      res.status(400).json({ error: 'Falha ao obter ID do usuário' });
    }
  } catch (error) {
    console.error('Erro ao aceitar convite:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/users/update
router.patch('/update', async (req, res) => {
  const { user_id, updates } = req.body || {};

  if (!user_id) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório' });
  }

  try {
    const response = await axios.patch(
      `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${user_id}`,
      updates,
      { headers }
    );
    res.json({ status: 'ok', message: 'Usuário atualizado!' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/users/deactivate
router.post('/deactivate', async (req, res) => {
  const { user_id } = req.body || {};

  if (!user_id) {
    return res.status(400).json({ error: 'ID do usuário é obrigatório' });
  }

  try {
    await axios.patch(
      `${SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${user_id}`,
      { ativo: false },
      { headers }
    );
    res.json({ status: 'ok', message: 'Usuário desativado!' });
  } catch (error) {
    console.error('Erro ao desativar usuário:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/permissions
router.get('/permissions', (req, res) => {
  res.json({
    roles: {
      admin: {
        name: 'Administrador',
        description: 'Acesso completo ao sistema',
        permissions: ['gerenciar_usuarios', 'criar_investimentos', 'editar_investimentos', 'excluir_investimentos', 'exportar_planilhas', 'gerenciar_cadastros', 'upload_boletos', 'ver_relatorios']
      },
      gestor: {
        name: 'Gestor',
        description: 'Gestão de equipe e investimentos',
        permissions: ['criar_investimentos', 'editar_investimentos', 'exportar_planilhas', 'gerenciar_cadastros', 'upload_boletos', 'ver_relatorios']
      },
      financeiro: {
        name: 'Financeiro',
        description: 'Acesso ao financeiro',
        permissions: ['criar_investimentos', 'editar_investimentos', 'exportar_planilhas', 'upload_boletos', 'ver_relatorios']
      },
      usuario: {
        name: 'Usuário',
        description: 'Acesso básico',
        permissions: ['criar_investimentos', 'ver_relatorios']
      }
    }
  });
});

module.exports = router;
