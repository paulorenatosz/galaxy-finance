-- Adicionar coluna responsavel_avatar na tabela investimentos
ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS responsavel_avatar TEXT;
