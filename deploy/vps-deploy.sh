#!/bin/bash
# ============================================
# Script de Deploy - SolarZ Finance VPS (Debian)
# ============================================

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SolarZ Finance - Deploy VPS Debian${NC}"
echo -e "${GREEN}========================================${NC}"

# ============================================
# CONFIGURAÇÕES
# ============================================
APP_DIR="/var/www/solarz-finance"
DOMAIN="solarz-eventos.yeixie.easypanel.host"
BACKEND_SERVICE="solarz-backend"

# ============================================
# 1. ATUALIZAR CÓDIGO
# ============================================
echo -e "\n${YELLOW}[1/5] Atualizando código...${NC}"

cd $APP_DIR
git pull origin master

# ============================================
# 2. INSTALAR DEPENDÊNCIAS DO BACKEND
# ============================================
echo -e "\n${YELLOW}[2/5] Instalando dependências do backend...${NC}"

cd $APP_DIR/backend
$APP_DIR/backend/venv/bin/pip install -r requirements.txt -q

# ============================================
# 3. BUILD DO FRONTEND
# ============================================
echo -e "\n${YELLOW}[3/5] Fazendo build do frontend...${NC}"

cd $APP_DIR/frontend
npm install -q
npm run build

# ============================================
# 4. REINICIAR SERVIÇOS
# ============================================
echo -e "\n${YELLOW}[4/5] Reiniciando serviços...${NC}"

# Reiniciar backend
sudo systemctl restart $BACKEND_SERVICE

# Verificar Nginx
sudo nginx -t && sudo systemctl reload nginx

echo -e "${GREEN}✓ Serviços reiniciados${NC}"

# ============================================
# 5. VERIFICAR STATUS
# ============================================
echo -e "\n${YELLOW}[5/5] Verificando status...${NC}"

# Status do backend
if sudo systemctl is-active --quiet $BACKEND_SERVICE; then
    echo -e "${GREEN}✓ Backend rodando${NC}"
else
    echo -e "${RED}✗ Backend com problema${NC}"
    sudo systemctl status $BACKEND_SERVICE --no-pager
fi

# Status do Nginx
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx rodando${NC}"
else
    echo -e "${RED}✗ Nginx com problema${NC}"
fi

# Teste de resposta
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend respondendo (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠ Frontend respondeu HTTP $HTTP_CODE${NC}"
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deploy concluído!${NC}"
echo -e "${GREEN}  https://$DOMAIN${NC}"
echo -e "${GREEN}========================================${NC}"
