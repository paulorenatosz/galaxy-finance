-- Adicionar coluna telefone na tabela funcionarios
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS telefone TEXT;