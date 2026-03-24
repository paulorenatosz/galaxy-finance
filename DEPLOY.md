# SolarZ Finance - Deploy VPS (Easypanel)

## Visão Geral

Deploy do SolarZ Finance em VPS com Easypanel:
- **Frontend**: React (build estático, serve via Nginx)
- **Backend**: Python FastAPI (roda em porta 8000)
- **Banco**: Supabase (já na nuvem)
- **Domínio**: https://solarz-eventos.yeixie.easypanel.host

---

## Passo 1: Clonar o Repositório

```bash
cd /var/www
git clone https://github.com/paulorenatosz/solarz-finance.git solarz-finance
cd solarz-finance
```

---

## Passo 2: Configurar Backend

### 2.1 Criar ambiente virtual
```bash
cd /var/www/solarz-finance/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

### 2.2 Criar arquivo .env
```bash
nano /var/www/solarz-finance/backend/.env
```

**Conteúdo:**
```env
# Supabase
SUPABASE_URL=https://udsnfatqoedogawpkgkc.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkc25mYXRxb2Vkb2dhd3BrZ2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDIyMDEsImV4cCI6MjA4OTQxODIwMX0.zQA0_C2xwM9aZzcD0vqaBEIkRcbRCvUuC4mOoa1RZM4

# Slack
SLACK_BOT_TOKEN=xoxb-731796675713-10706696192067-zzaYqCPnHarThH8S1G6bvapY
SLACK_CHANNEL=C0ALVLE6ZB7

# Google OAuth
GOOGLE_CLIENT_ID=1016016925552-kblu78ne686jj7g9srrdkqt49dsdnfoa.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://solarz-eventos.yeixie.easypanel.host/oauth/callback

# Frontend URL
FRONTEND_URL=https://solarz-eventos.yeixie.easypanel.host

# CORS
ALLOWED_ORIGINS=https://solarz-eventos.yeixie.easypanel.host

# Server
HOST=127.0.0.1
PORT=8000
```

### 2.3 Testar backend
```bash
source /var/www/solarz-finance/backend/venv/bin/activate
cd /var/www/solarz-finance/backend
uvicorn main:app --host 127.0.0.1 --port 8000
```
Verifique: `curl http://127.0.0.1:8000/docs`

Pressione `Ctrl+C` para parar.

---

## Passo 3: Backend como Serviço (Systemd)

```bash
nano /etc/systemd/system/solarz-backend.service
```

```ini
[Unit]
Description=SolarZ Finance Backend API
After=network.target

[Service]
Type=simple
User=root
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

```bash
systemctl daemon-reload
systemctl enable solarz-backend
systemctl start solarz-backend
systemctl status solarz-backend
```

---

## Passo 4: Build do Frontend

```bash
cd /var/www/solarz-finance/frontend
npm install
npm run build
```

### Configurar .env do frontend
```bash
nano /var/www/solarz-finance/frontend/.env
```

```env
VITE_SUPABASE_URL=https://udsnfatqoedogawpkgkc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkc25mYXRxb2Vkb2dhd3BrZ2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NDIyMDEsImV4cCI6MjA4OTQxODIwMX0.zQA0_C2xwM9aZzcD0vqaBEIkRcbRCvUuC4mOoa1RZM4
VITE_GOOGLE_CLIENT_ID=1016016925552-kblu78ne686jj7g9srrdkqt49dsdnfoa.apps.googleusercontent.com
VITE_API_URL=https://solarz-eventos.yeixie.easypanel.host
```

```bash
npm run build
```

---

## Passo 5: Nginx

```bash
nano /etc/nginx/sites-available/solarz-finance
```

```nginx
server {
    listen 80;
    server_name solarz-eventos.yeixie.easypanel.host;

    root /var/www/solarz-finance/frontend/dist;
    index index.html;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

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
}
```

```bash
ln -s /etc/nginx/sites-available/solarz-finance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

---

## Passo 6: Configurar Google OAuth

No [Google Cloud Console](https://console.cloud.google.com):

1. Vá em **APIs e Serviços > Credenciais**
2. Edite o **Client ID OAuth**
3. Adicione em **URIs de redirect autorizados**:
   ```
   https://solarz-eventos.yeixie.easypanel.host/oauth/callback
   ```

---

## Passo 7: Configurar Supabase

No dashboard do Supabase, adicione `https://solarz-eventos.yeixie.easypanel.host` em:
- **Authentication > URL Configuration > Site URL**
- **Authentication > URL Configuration > Redirect URLs**

---

## Deploy Contínuo

Quando houver atualizações:

```bash
cd /var/www/solarz-finance
git pull

# Rebuild frontend
cd frontend && npm install && npm run build && cd ..

# Restart backend
systemctl restart solarz-backend

# Reload nginx
nginx -t && systemctl reload nginx
```

---

## Troubleshooting

### Backend não inicia
```bash
journalctl -u solarz-backend -n 50
cat /var/www/solarz-finance/backend/.env
```

### Frontend não carrega
```bash
systemctl status nginx
ls -la /var/www/solarz-finance/frontend/dist/
```

### CORS errors
Verifique `ALLOWED_ORIGINS` no .env:
```
https://solarz-eventos.yeixie.easypanel.host
```
Depois: `systemctl restart solarz-backend`

---

## Pronto!

Acesse: **https://solarz-eventos.yeixie.easypanel.host**
