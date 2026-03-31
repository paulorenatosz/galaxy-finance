# Deploy na Vercel - Galaxy Finance

## Estrutura do Projeto

```
galaxy-finance/
├── api/                    # Backend Node.js/Express
│   ├── routes/
│   │   ├── supabase.js    # Rotas do Supabase
│   │   ├── google.js       # OAuth Google
│   │   ├── slack.js        # Integração Slack
│   │   ├── sheets.js       # Google Sheets
│   │   ├── drive.js        # Google Drive
│   │   ├── users.js        # Gestão de usuários
│   │   └── convites.js     # Sistema de convites
│   ├── index.js            # Entry point
│   └── vercel.json
├── frontend/               # Frontend React/Vite
│   ├── src/
│   └── package.json
├── vercel.json             # Config raiz
└── package.json
```

---

## Passo 1: Configurar Variáveis de Ambiente

No dashboard da Vercel, configure as seguintes variáveis:

### Environment Variables (em Settings > Environment Variables):

| Nome | Valor |
|------|-------|
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `SUPABASE_KEY` | `sua-supabase-anon-key` |
| `SLACK_BOT_TOKEN` | `xoxb-xxx` |
| `SLACK_CHANNEL` | `C0ALVLE6ZB7` |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `xxx` |
| `GOOGLE_REDIRECT_URI` | `https://SEU_DOMINIO.vercel.app/api/google/oauth/callback` |
| `GOOGLE_DRIVE_PASTA_ID` | `xxx` |
| `GOOGLE_DRIVE_BOLETOS_ID` | `xxx` |
| `GOOGLE_SHEET_ID` | `xxx` |
| `FRONTEND_URL` | `https://SEU_DOMINIO.vercel.app` |
| `ADMIN_KEY` | `sua-chave-admin-segura` |

---

## Passo 2: Deploy via GitHub

### 2.1 Push para GitHub

```bash
cd galaxy-finance
git init
git add .
git commit -m "feat: migrate to Vercel"
git remote add origin https://github.com/SEU_USUARIO/galaxy-finance.git
git push -u origin main
```

### 2.2 Importar na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New..." > Project**
3. Importe o repositório do GitHub
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (raiz)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`

### 2.3 Configurar Domínio

1. Vá em **Settings > Domains**
2. Adicione seu novo domínio (ex: `galaxy.seudominio.com`)
3. Configure os registros DNS conforme instruído

---

## Passo 3: Atualizar Google OAuth

No [Google Cloud Console](https://console.cloud.google.com):

1. Vá em **APIs e Serviços > Credenciais**
2. Edite o **Client ID OAuth**
3. Adicione em **URIs de redirect autorizados**:
   ```
   https://SEU_DOMINIO.vercel.app/api/google/oauth/callback
   ```

---

## Passo 4: Atualizar Supabase

No dashboard do Supabase:

1. Vá em **Authentication > URL Configuration**
2. Atualize **Site URL** para o novo domínio
3. Adicione o novo domínio em **Redirect URLs**

---

## Passo 5: Configurar Frontend

Crie o arquivo `frontend/.env.production`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_GOOGLE_CLIENT_ID=seu-client-id
VITE_API_URL=https://SEU_DOMINIO.vercel.app
```

---

## API Endpoints (após deploy)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api` | Health check |
| GET | `/api/supabase/investimentos` | Lista investimentos |
| GET | `/api/supabase/resumo` | Resumo financeiro |
| POST | `/api/slack/test` | Testar Slack |
| POST | `/api/slack/notificar` | Notificar investimento |
| GET | `/api/google/status` | Status Google OAuth |
| GET | `/api/google/authorize` | Iniciar OAuth |
| GET | `/api/google/oauth/callback` | Callback OAuth |
| POST | `/api/sheets/atualizar` | Atualizar planilha |
| POST | `/api/drive/criar-evento` | Criar pasta evento |
| POST | `/api/drive/upload-boleto` | Upload boleto |
| GET | `/api/users/list` | Listar usuários |
| POST | `/api/users/invite` | Criar convite |
| POST | `/api/convites/gerar` | Gerar código |
| POST | `/api/convites/validar` | Validar código |

---

## Nota Importante - Tokens Google

Os tokens OAuth do Google são armazenados **em memória** no backend Node.js. Isso significa que:
- ✅ Funciona para sessões ativas
- ⚠️ Tokens se perdem ao reiniciar o servidor (cold start na Vercel)

**Recomendação**: Para produção, implemente persistência de tokens (banco de dados ou Redis).

---

## Troubleshooting

### Erro de CORS
Verifique se as variáveis `FRONTEND_URL` e `ALLOWED_ORIGINS` estão corretas.

### Erro 500 nas rotas
Verifique os logs da Vercel (Functions > Logs) para identificar o erro.

### OAuth não funciona
Confirme que `GOOGLE_REDIRECT_URI` está exatamente igual ao configurado no Google Cloud Console.

---

## Pronto!

Após seguir todos os passos, seu projeto estará no ar em:
**`https://SEU_DOMINIO.vercel.app`**
