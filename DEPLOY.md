# SolarZ Finance - Guia de Deploy VPS

## Visão Geral

Este guia explica como fazer deploy do SolarZ Finance em uma VPS com:
- **Frontend**: React (build estático, serve via Nginx)
- **Backend**: Python FastAPI (roda em porta 8000)
- **Banco**: Supabase (já configurado na nuvem)

---

## Pré-requisitos

- VPS com Ubuntu 20.04+ ou similar
- Nginx instalado
- Python 3.11+
- Node.js 18+
- Git
- Domínio configurado (opcional)

---

## Passo 1: Preparar a VPS

### 1.1 Conectar via SSH
```bash
ssh root@IP_DA_SUA_VPS
```

### 1.2 Atualizar sistema
```bash
apt update && apt upgrade -y
```

### 1.3 Instalar dependências
```bash
# Nginx
apt install -y nginx

# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Python
apt install -y python3.11 python3.11-venv python3-pip
```

### 1.4 Criar usuário para o app (recomendado)
```bash
adduser galaxy
usermod -aG www-data galaxy
```

---

## Passo 2: Configurar Diretórios

```bash
# Criar diretório
mkdir -p /var/www/galaxy-finance
chown -R galaxy:www-data /var/www/galaxy-finance

# Clonar o repositório
cd /var/www/galaxy-finance
git clone https://github.com/paulorenatosz/galaxy-finance.git .

# Definir permissões
chmod 755 /var/www/galaxy-finance
```

---

## Passo 3: Configurar Backend

### 3.1 Criar arquivo .env
```bash
cd /var/www/galaxy-finance/backend
nano .env
```

**Conteúdo do .env:**
```env
# Supabase
SUPABASE_URL=https://udsnfatqoedogawpkgkc.supabase.co
SUPABASE_KEY=SUA_SERVICE_ROLE_KEY_AQUI

# Slack
SLACK_BOT_TOKEN=xoxb-SEU_TOKEN
SLACK_CHANNEL=#financeiro

# Google OAuth (use as credenciais do projeto)
GOOGLE_CLIENT_ID=SEU_CLIENT_ID
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://SEU_DOMINIO.com/oauth/callback
FRONTEND_URL=https://SEU_DOMINIO.com

# CORS (domínios permitidos)
ALLOWED_ORIGINS=https://SEU_DOMINIO.com,http://IP_DA_VPS:3000
```

### 3.2 Instalar dependências Python
```bash
cd /var/www/galaxy-finance/backend
pip3 install -r requirements.txt
```

### 3.3 Testar backend
```bash
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Verifique se está rodando:
```bash
curl http://127.0.0.1:8000/docs
```

---

## Passo 4: Configurar como Serviço (SystemD)

### 4.1 Copiar arquivo de serviço
```bash
cp /var/www/galaxy-finance/deploy/galaxy-backend.service /etc/systemd/system/
```

### 4.2 Recarregar e iniciar
```bash
systemctl daemon-reload
systemctl enable galaxy-backend
systemctl start galaxy-backend
systemctl status galaxy-backend
```

### 4.3 Verificar logs
```bash
journalctl -u galaxy-backend -f
```

---

## Passo 5: Build e Configurar Frontend

### 5.1 Build do frontend
```bash
cd /var/www/galaxy-finance/frontend
npm install
npm run build
```

### 5.2 Atualizar URL da API no frontend
Edite `frontend/src/App.tsx`:
```typescript
// Se usando domínio próprio:
// export const API_URL = 'https://api.seudominio.com'

// Se usando IP:
// export const API_URL = 'http://IP_DA_VPS:8000'
```

### 5.3 Rebuild após mudança
```bash
npm run build
```

---

## Passo 6: Configurar Nginx

### 6.1 Copiar configuração
```bash
cp /var/www/galaxy-finance/deploy/nginx.conf /etc/nginx/sites-available/galaxy-finance
```

### 6.2 Editar configuração
```bash
nano /etc/nginx/sites-available/galaxy-finance
```

**Altere:**
- `server_name financeiro.seudominio.com;` → seu domínio ou IP
- `root /var/www/galaxy-finance/frontend/dist;` → caminho correto

### 6.3 Ativar site
```bash
ln -s /etc/nginx/sites-available/galaxy-finance /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## Passo 7: Configurar Firewall

```bash
# Permitir SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## Passo 8: SSL (Let's Encrypt) - Opcional

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Gerar certificado
certbot --nginx -d financeiro.seudominio.com

# Auto-renewal (já configurado automaticamente)
```

---

## Passo 9: Deploy Contínuo

### Script de deploy rápido
```bash
cd /var/www/galaxy-finance
git pull origin master

# Backend
systemctl restart galaxy-backend

# Frontend (rebuild se houver mudanças)
cd frontend && npm run build

# Nginx
nginx -t && systemctl reload nginx
```

---

## Variáveis de Ambiente Necessárias

### Backend (.env)
| Variável | Descrição | Onde obter |
|----------|-----------|------------|
| `SUPABASE_URL` | URL do projeto Supabase | Dashboard Supabase > Settings > API |
| `SUPABASE_KEY` | Service Role Key | Dashboard Supabase > Settings > API |
| `SLACK_BOT_TOKEN` | Token do bot Slack | Slack API > OAuth & Permissions |
| `GOOGLE_CLIENT_ID` | ID do cliente Google | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Secret do cliente Google | Google Cloud Console |

### Frontend (.env)
| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon Key (pública) |
| `VITE_API_URL` | URL da API backend |

---

## Troubleshooting

### Backend não inicia
```bash
# Ver logs
journalctl -u galaxy-backend -n 50

# Verificar .env
cat /var/www/galaxy-finance/backend/.env
```

### Frontend não carrega
```bash
# Verificar se Nginx está rodando
systemctl status nginx

# Ver logs Nginx
tail -f /var/log/nginx/galaxy-finance-error.log
```

### CORS errors
Verifique se as origens estão configuradas corretamente no backend:
```python
# main.py
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",")
```

---

## Estrutura Final

```
/var/www/galaxy-finance/
├── frontend/
│   ├── dist/          # Build do React (servido pelo Nginx)
│   └── src/           # Código fonte
├── backend/
│   ├── main.py        # API FastAPI
│   ├── .env           # Variáveis de ambiente (NÃO COMMITAR)
│   └── requirements.txt
├── deploy/
│   ├── nginx.conf
│   ├── galaxy-backend.service
│   └── vps-deploy.sh
└── DEPLOY.md
```

---

## Pronto!

Acesse:
- **Frontend**: http://IP_DA_VPS ou https://seudominio.com
- **Backend API**: http://IP_DA_VPS:8000/docs
