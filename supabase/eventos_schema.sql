-- Criar tabela de eventos com campo ano
CREATE TABLE IF NOT EXISTS eventos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  subevento TEXT,
  ano INTEGER NOT NULL DEFAULT 2026,
  data_inicio DATE,
  data_fim DATE,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Se a tabela já existe, adicionar coluna ano se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'eventos' AND column_name = 'ano') THEN
    ALTER TABLE eventos ADD COLUMN ano INTEGER DEFAULT 2026;
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
DROP POLICY IF EXISTS "Eventos visiveis para todos" ON eventos;
CREATE POLICY "Eventos visiveis para todos"
  ON eventos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Eventos podem ser inseridos" ON eventos;
CREATE POLICY "Eventos podem ser inseridos"
  ON eventos FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Eventos podem ser atualizados" ON eventos;
CREATE POLICY "Eventos podem ser atualizados"
  ON eventos FOR UPDATE
  USING (true);

-- Adicionar coluna evento_id na tabela investimentos (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'investimentos' AND column_name = 'evento_id') THEN
    ALTER TABLE investimentos ADD COLUMN evento_id UUID REFERENCES eventos(id);
  END IF;
END $$;

-- Limpar eventos antigos e inserir novos com ano
DELETE FROM eventos;

INSERT INTO eventos (nome, tipo, subevento, ano) VALUES
-- 2025
('Intersolar Nordeste 2025', 'Intersolar', 'Nordeste', 2025),
('Intersolar SP 2025', 'Intersolar', 'SP', 2025),
('Imersão Galaxy - Edição NOV 2025', 'Imersão Galaxy', 'NOV', 2025),
-- 2026
('Intersolar Nordeste 2026', 'Intersolar', 'Nordeste', 2026),
('Intersolar SP 2026', 'Intersolar', 'SP', 2026),
('Imersão Galaxy - Edição MAR 2026', 'Imersão Galaxy', 'MAR', 2026),
('Imersão Galaxy - Edição JUL 2026', 'Imersão Galaxy', 'JUL', 2026),
('Imersão Galaxy - Edição NOV 2026', 'Imersão Galaxy', 'NOV', 2026),
('SolarZ Awards 2026', 'SolarZ Awards', '2026', 2026),
-- 2027
('Intersolar Nordeste 2027', 'Intersolar', 'Nordeste', 2027),
('Intersolar SP 2027', 'Intersolar', 'SP', 2027),
('Imersão Galaxy - Edição MAR 2027', 'Imersão Galaxy', 'MAR', 2027),
('Imersão Galaxy - Edição JUL 2027', 'Imersão Galaxy', 'JUL', 2027),
('Imersão Galaxy - Edição NOV 2027', 'Imersão Galaxy', 'NOV', 2027),
('SolarZ Awards 2027', 'SolarZ Awards', '2027', 2027);
