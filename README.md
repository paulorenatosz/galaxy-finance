# SolarZ Finance - Plataforma de Controle de Investimentos

Plataforma completa de controle de investimentos para eventos de marketing com dashboard em tempo real, notificações e integrações.

## 📱 Funcionalidades

### Dashboard
- ✅ Gráficos em tempo real (por categoria, status, evolução mensal)
- ✅ Indicadores financeiros (Total orçado, realizado, pago, pendente)
- ✅ Tabela de investimentos com filtros
- ✅ Atualização de status inline
- ✅ Tema SolarZ profissional

### Formulário de Entrada
- ✅ Todos os campos do Google Forms original
- ✅ Categorias e subcategorias automáticas
- ✅ Validação de campos

### Integrações
- 🔄 Slack Bot (lembretes automáticos)
- 🔄 Google Calendar (eventos de pagamento)
- 🔄 Google Email (notificações)
- 🔄 Google Sheets (exportação)

### Autenticação
- ✅ Login via Google OAuth
- ✅ Controle de acesso por usuário

---

## 🚀 Como Configurar

### 1. Supabase (Banco de Dados)

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Vá em **SQL Editor** e execute o conteúdo de `supabase/schema.sql`
3. Em **Settings > API**, copie:
   - Project URL
   - `service_role` key (para backend) ou `anon` key (para frontend)

### 2. Autenticação Google

1. Vá em [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto
3. Vá em **APIs e Serviços > Credenciais**
4. Criar **ID do cliente OAuth** para aplicação web
5. Adicione como URIs de redirect: `http://localhost:5173`
6. Copie o Client ID

### 3. Slack (Opcional)

1. Crie um app em [api.slack.com/apps](https://api.slack.com/apps)
2. Adicione o Bot Token (`xoxb-...`)
3. Convide o bot ao canal desejado

### 4. Variáveis de Ambiente

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

**Backend** (`backend/.env`):
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-service-role-key
SLACK_BOT_TOKEN=xoxb-seu-token
SLACK_CHANNEL=#financeiro
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-secret
```

---

## 💻 Como Rodar

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Acesse: http://localhost:5173

### Backend (Opcional)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure as variáveis
uvicorn main:app --reload --port 8000
```

---

## 📊 Estrutura do Banco

### Tabela: `investimentos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| tipo_fornecedor | TEXT | Categoria principal |
| nome_fornecedor | TEXT | Nome do fornecedor |
| descricao_despesa | TEXT | Descrição |
| valor_orcado | DECIMAL | Valor planejado |
| valor_realizado | DECIMAL | Valor final |
| quantidade | INTEGER | Quantidade |
| forma_pagamento | TEXT | PIX, Boleto, etc |
| numero_parcelas | INTEGER | Parcelas |
| data_vencimento | DATE | Data de pagamento |
| numero_nota_fiscal | TEXT | NF número |
| possui_boleto_nf | BOOLEAN | Tem documento? |
| categoria_detalhe | TEXT | Subcategoria |
| responsavel | TEXT | Responsável |
| mes_referencia | TEXT | Mês (ex: MAR_26) |
| observacoes | TEXT | Notas |
| status | TEXT | PENDENTE/RECEBIDO/APROVADO/PAGO |
| user_id | UUID | Usuário que criou |

---

## 🎨 Tema Visual

O dashboard usa o tema SolarZ com:
- Gradientes azul professional
- Design moderno Material Design 3
- Cores por status e categoria

---

## 📁 Estrutura do Projeto

```
solarz-finance/
├── frontend/           # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── InvestmentForm.tsx
│   │   │   ├── Importacao.tsx
│   │   │   ├── Cadastros.tsx
│   │   │   ├── Consulta.tsx
│   │   │   ├── Integrations.tsx
│   │   │   └── layout/
│   │   │       ├── TopNavBar.tsx
│   │   │       ├── SideNavBar.tsx
│   │   │       └── BottomNavBar.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── public/
│       └── solarz.svg
├── backend/           # Python FastAPI
│   ├── main.py
│   ├── requirements.txt
│   └── .env
├── supabase/
│   ├── schema.sql
│   ├── fornecedores_schema.sql
│   └── policies.sql
├── deploy/
│   ├── nginx.conf
│   ├── galaxy-backend.service
│   └── vps-deploy.sh
├── Dockerfile
└── README.md
```

---

## 🔜 Próximos Passos

1. ✅ Configurar Supabase
2. ✅ Configurar Google OAuth
3. ⬜ Configurar Slack Bot
4. ⬜ Configurar Google Calendar
5. ⬜ Configurar Email
6. ⬜ Implementar Exportação Sheets

---

Feito com ⭐ para SolarZ Marketing
