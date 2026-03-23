# SolarZ Finance - Deploy VPS Debian

## Visão Geral

Deploy completo do SolarZ Finance em VPS Debian 11+:
- **Frontend**: React (build estático, serve via Nginx)
- **Backend**: Python FastAPI (roda em porta 8000)
- **Banco**: Supabase (já na nuvem)
- **Domínio**: investimentos.solarzmkt.com.br

---

## Pré-requisitos

- VPS com **Debian 11 ou 12**
- SSH acesso root
- Domínio `investimentos.solarzmkt.com.br` apontando para o IP da VPS
- Git, Nginx, Python 3.11+, Node.js 18+

---

## Passo 1: Preparar a VPS

### 1.1 Conectar via SSH
```bash
ssh root@IP_DA_VPS
```

### 1.2 Atualizar sistema
```bash
apt update && apt upgrade -y
```

### 1.3 Instalar dependências
```bash
# Nginx
apt install -y nginx

# Node.js 18 (Debian 11)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Python 3.11 e venv
apt install -y python3.11 python3.11-venv python3-pip curl git certbot python3-certbot-nginx

# Ferramentas úteis
apt install -y vim htop ufw
```

### 1.4 Criar usuário para o app
```bash
adduser solarz
usermod -aG sudo solarz
usermod -aG www-data solarz
mkdir -p /var/www/solarz-finance
chown -R solarz:www-data /var/www/solarz-finance
```

---

## Passo 2: Clonar o Repositório

```bash
# Como usuário solarz
su - solarz

# Clonar o repositório
cd /var/www/solarz-finance
git clone https://github.com/paulorenatosz/galaxy-finance.git .

# Volta para root
exit
```

---

## Passo 3: Configurar Backend

### 3.1 Criar ambiente virtual e instalar dependências
```bash
cd /var/www/solarz-finance/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

### 3.2 Criar arquivo .env
```bash
nano /var/www/solarz-finance/backend/.env
```

**Conteúdo do .env:**
```env
# Supabase
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_KEY=SUA_SERVICE_ROLE_KEY_AQUI

# Slack
SLACK_BOT_TOKEN=xoxb-SEU_TOKEN
SLACK_CHANNEL=#financeiro

# Google OAuth
GOOGLE_CLIENT_ID=SEU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=SEU_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://investimentos.solarzmkt.com.br/oauth/callback
FRONTEND_URL=https://investimentos.solarzmkt.com.br

# CORS
ALLOWED_ORIGINS=https://investimentos.solarzmkt.com.br
```

### 3.3 Testar backend
```bash
source /var/www/solarz-finance/backend/venv/bin/activate
cd /var/www/solarz-finance/backend
uvicorn main:app --host 127.0.0.1 --port 8000
```
Verifique em: `curl http://127.0.0.1:8000/docs`

Pressione `Ctrl+C` para parar.

---

## Passo 4: Configurar Backend como Serviço (SystemD)

### 4.1 Criar arquivo de serviço
```bash
nano /etc/systemd/system/solarz-backend.service
```

```ini
[Unit]
Description=SolarZ Finance Backend API
After=network.target

[Service]
Type=simple
User=solarz
WorkingDirectory=/var/www/solarz-finance/backend
Environment="PATH=/var/www/solarz-finance/backend/venv/bin"
Environment="PYTHONUNBUFFERED=1"
ExecStart=/var/www/solarz-finance/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

EnvironmentFile=/var/www/solarz-finance/backend/.env

[Install]
WantedBy=multi-user.target
```

### 4.2 Ativar e iniciar
```bash
systemctl daemon-reload
systemctl enable solarz-backend
systemctl start solarz-backend
systemctl status solarz-backend
```

### 4.3 Verificar logs
```bash
journalctl -u solarz-backend -f
```

---

## Passo 5: Build do Frontend

```bash
su - solarz
cd /var/www/solarz-finance/frontend
npm install
npm run build
exit
```

### Configurar .env do frontend (opcional)
```bash
nano /var/www/solarz-finance/frontend/.env
```
```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY_AQUI
VITE_API_URL=https://investimentos.solarzmkt.com.br
```
```bash
su - solarz
cd /var/www/solarz-finance/frontend
npm run build
exit
```

---

## Passo 6: Configurar Nginx

### 6.1 Criar configuração do site
```bash
nano /etc/nginx/sites-available/solarz-finance
```

```nginx
server {
    listen 80;
    server_name investimentos.solarzmkt.com.br;

    root /var/www/solarz-finance/frontend/dist;
    index index.html;

    # Cache de arquivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    access_log /var/log/nginx/solarz-finance-access.log;
    error_log /var/log/nginx/solarz-finance-error.log;
}
```

### 6.2 Ativar site
```bash
ln -s /etc/nginx/sites-available/solarz-finance /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default se existir
nginx -t
systemctl reload nginx
```

---

## Passo 7: SSL com Let's Encrypt

```bash
certbot --nginx -d investimentos.solarzmkt.com.br
```
Escolha a opção de redirecionar HTTP para HTTPS.

### Verificar renovação automática
```bash
systemctl status certbot.timer
```

---

## Passo 8: Firewall (UFW)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

---

## Passo 9: Deploy Contínuo

Quando houver atualizações no código:

```bash
# SSH na VPS
ssh solarz@IP_DA_VPS

# Pull e rebuild
cd /var/www/solarz-finance
git pull origin master

# Rebuild frontend
cd frontend && npm install && npm run build && cd ..

# Restart backend
sudo systemctl restart solarz-backend

# Reload nginx
sudo nginx -t && sudo systemctl reload nginx

exit
```

Ou use o script automático:
```bash
cd /var/www/solarz-finance
./deploy/vps-deploy.sh
```

---

## Configuração do Domínio

No seu provedor de domínio (registro.br, Cloudflare, etc.):

| Tipo | Nome | Valor |
|------|------|-------|
| A | investimentos | IP_DA_VPS |
| A | @ | IP_DA_VPS |

Aguarde propagação DNS (~5-30 minutos).

---

## Configuração do Google OAuth

No [Google Cloud Console](https://console.cloud.google.com):

1. Vá em **APIs e Serviços > Credenciais**
2. Edite o **Client ID OAuth**
3. Adicione em **URIs de redirect autorizados**:
   ```
   https://investimentos.solarzmkt.com.br/oauth/callback
   ```

---

## Configuração do Supabase

No dashboard do Supabase, adicione `investimentos.solarzmkt.com.br` em:
- **Authentication > URL Configuration > Site URL**
- **Authentication > URL Configuration > Redirect URLs**

---

## Troubleshooting

### Backend não inicia
```bash
# Ver logs
journalctl -u solarz-backend -n 50

# Verificar .env
cat /var/www/solarz-finance/backend/.env

# Testar manualmente
source /var/www/solarz-finance/backend/venv/bin/activate
cd /var/www/solarz-finance/backend
python -c "from main import app; print('OK')"
```

### Frontend não carrega
```bash
# Verificar se Nginx está rodando
systemctl status nginx

# Ver logs
tail -f /var/log/nginx/solarz-finance-error.log

# Verificar arquivos
ls -la /var/www/solarz-finance/frontend/dist/
```

### SSL não funciona
```bash
# Verificar certificados
certbot certificates

# Renovar manualmente
certbot renew --dry-run
```

### CORS errors
Verifique se `ALLOWED_ORIGINS` no .env do backend inclui:
```
https://investimentos.solarzmkt.com.br
```
Depois: `systemctl restart solarz-backend`

---

## Estrutura Final

```
/var/www/solarz-finance/
├── frontend/
│   ├── dist/          # Build do React
│   └── src/           # Código fonte
├── backend/
│   ├── main.py        # API FastAPI
│   ├── .env           # Variáveis (NÃO COMMITAR)
│   ├── venv/          # Ambiente virtual
│   └── requirements.txt
├── deploy/
│   ├── nginx.conf
│   ├── solarz-backend.service
│   └── vps-deploy.sh
├── Dockerfile
└── README.md
```

---

## Pronto!

Acesse:
- **Frontend**: https://investimentos.solarzmkt.com.br
- **Backend API**: https://investimentos.solarzmkt.com.br/api/docs
