-- Schema do Banco de Dados - Galaxy Finance
-- Execute isso no editor SQL do Supabase

-- Tabela principal de investimentos
CREATE TABLE investimentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Seção 1: Identificação
  tipo_fornecedor TEXT NOT NULL,
  nome_fornecedor TEXT NOT NULL,
  descricao_despesa TEXT NOT NULL,

  -- Seção 2: Informações Financeiras
  valor_orcado DECIMAL(12,2) NOT NULL,
  valor_realizado DECIMAL(12,2) NOT NULL,
  quantidade INTEGER DEFAULT 1,
  forma_pagamento TEXT NOT NULL,
  numero_parcelas INTEGER DEFAULT 1,

  -- Seção 3: Prazos e Documentos
  data_vencimento DATE NOT NULL,
  numero_nota_fiscal TEXT,
  possui_boleto_nf BOOLEAN DEFAULT false,

  -- Seção 4: Arquivo
  arquivo_url TEXT,

  -- Seção 5-10: Detalhamento
  categoria_detalhe TEXT,
  subcategoria TEXT,

  -- Seção 11: Responsabilidades
  responsavel TEXT NOT NULL,
  mes_referencia TEXT NOT NULL,

  -- Seção 12: Observações
  observacoes TEXT,
  status TEXT DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'RECEBIDO', 'APROVADO', 'PAGO')),

  -- Controle de acesso
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de usuários com perfil
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'usuario' CHECK (role IN ('admin', 'usuario')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de logs de alterações
CREATE TABLE logs_alteracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investimento_id UUID REFERENCES investimentos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de configurações
CREATE TABLE configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  valor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_alteracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para investimentos
CREATE POLICY "Usuários veem apenas seus próprios investimentos"
  ON investimentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam investimentos"
  ON investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam seus próprios investimentos"
  ON investimentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam seus próprios investimentos"
  ON investimentos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para perfiles
CREATE POLICY "Perfil é visível para o próprio usuário"
  ON perfiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Perfil pode ser inserido"
  ON perfiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Perfil pode ser atualizado pelo próprio usuário"
  ON perfiles FOR UPDATE
  USING (auth.uid() = id);

-- Função para criar perfil automaticamente ao fazer signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nome, email, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp
DROP TRIGGER IF EXISTS investimentos_updated_at ON investimentos;
CREATE TRIGGER investimentos_updated_at
  BEFORE UPDATE ON investimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índices para performance
CREATE INDEX idx_investimentos_status ON investimentos(status);
CREATE INDEX idx_investimentos_mes ON investimentos(mes_referencia);
CREATE INDEX idx_investimentos_responsavel ON investimentos(responsavel);
CREATE INDEX idx_investimentos_data_vencimento ON investimentos(data_vencimento);
