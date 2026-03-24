-- Adicionar coluna datas_pagamento para rastrear múltiplas datas de pagamento (parcelas)
ALTER TABLE investimentos
ADD COLUMN IF NOT EXISTS datas_pagamento TEXT[] DEFAULT '{}';

-- Adicionar RLS policy para a nova coluna (se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'investimentos' AND policyname = 'Usuários veem own investments'
  ) THEN
    ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Comentário
COMMENT ON COLUMN investimentos.datas_pagamento IS 'Array de datas de pagamento para cada parcela (formato: YYYY-MM-DD)';

-- Adicionar coluna responsavel_avatar
ALTER TABLE investimentos
ADD COLUMN IF NOT EXISTS responsavel_avatar TEXT DEFAULT '';

COMMENT ON COLUMN investimentos.responsavel_avatar IS 'URL do avatar do responsável pelo investimento';
