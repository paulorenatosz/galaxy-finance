-- Adicionar coluna datas_pagamento na tabela investimentos
ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS datas_pagamento TEXT[];
