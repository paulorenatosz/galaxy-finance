#!/bin/bash
# ============================================
# Script de Deploy - SolarZ Finance VPS
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SolarZ Finance - Deploy VPS${NC}"
echo -e "${GREEN}========================================${NC}"

# ============================================
# 1. CONFIGURAÇÕES (ALTERE AQUI)
# ============================================
APP_NAME="galaxy-finance"
APP_DIR="/var/www/galaxy-finance"
BACKEND_PORT=8000
FRONTEND_PORT=3000

# URLs (configure conforme seu domínio)
DOMAIN="financeiro.seudominio.com"
FRONTEND_URL="https://financeiro.seudominio.com"
API_URL="https://api.financeiro.seudominio.com"

# ============================================
# 2. ATUALIZAR CÓDIGO
# ============================================
echo -e "\n${YELLOW}[1/6] Atualizando código...${NC}"

cd $APP_DIR
git pull origin master

# ============================================
# 3. INSTALAR DEPENDÊNCIAS DO BACKEND
# ============================================
echo -e "\n${YELLOW}[2/6] Instalando backend...${NC}"

cd $APP_DIR/backend
pip install -r requirements.txt --quiet

# ============================================
# 4. BUILD DO FRONTEND
# ============================================
echo -e "\n${YELLOW}[3/6] Fazendo build do frontend...${NC}"

cd $APP_DIR/frontend
npm install
npm run build

# ============================================
# 5. REINICIAR SERVIÇOS
# ============================================
echo -e "\n${YELLOW}[4/6] Reiniciando serviços...${NC}"

# Reiniciar backend
sudo systemctl restart galaxy-backend

# Rebuild e restart do Nginx
sudo nginx -t && sudo systemctl reload nginx

echo -e "${GREEN}✓ Serviços reiniciados${NC}"

# ============================================
# 6. VERIFICAR STATUS
# ============================================
echo -e "\n${YELLOW}[5/6] Verificando status...${NC}"

echo -e "\nBackend API:"
curl -s $API_URL/docs | head -c 100 || echo "Backend não respondendo"

echo -e "\nFrontend:"
curl -s -o /dev/null -w "%{http_code}" $FRONTEND_URL || echo "Frontend não respondendo"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploy concluído!${NC}"
echo -e "${GREEN}========================================${NC}"
