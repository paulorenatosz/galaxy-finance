-- Tabelas para funcionários e passagens
-- Execute no SQL Editor do Supabase

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data_nascimento DATE,
  cpf TEXT UNIQUE,
  email TEXT,
  setor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela de passagens
CREATE TABLE IF NOT EXISTS passagens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT CHECK (tipo IN ('aereo', 'onibus')),
  nome_passageiro TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  data_ida DATE,
  hora_ida TEXT,
  trecho_ida TEXT,
  numero_voo_ida TEXT,
  companhia_ida TEXT,
  data_volta DATE,
  hora_volta TEXT,
  trecho_volta TEXT,
  numero_voo_volta TEXT,
  companhia_volta TEXT,
  valor DECIMAL(10,2),
  evento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE passagens ENABLE ROW LEVEL SECURITY;

-- Políticas para funcionários
CREATE POLICY "Funcionários visíveis apenas para criadores"
  ON funcionarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Funcionários podem ser inseridos"
  ON funcionarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Funcionários podem ser atualizados"
  ON funcionarios FOR UPDATE
  USING (auth.uid() = user_id);

-- Políticas para passagens
CREATE POLICY "Passagens visíveis apenas para criadores"
  ON passagens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Passagens podem ser inseridas"
  ON passagens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Passagens podem ser atualizadas"
  ON passagens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Passagens podem ser deletadas"
  ON passagens FOR DELETE
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_funcionarios_cpf ON funcionarios(cpf);
CREATE INDEX idx_funcionarios_setor ON funcionarios(setor);
CREATE INDEX idx_passagens_tipo ON passagens(tipo);
CREATE INDEX idx_passagens_evento ON passagens(evento);