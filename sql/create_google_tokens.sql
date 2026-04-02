-- ============================================
-- Tabela para persistir tokens do Google OAuth
-- Execute este SQL no Editor SQL do Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS google_tokens (
  id TEXT PRIMARY KEY DEFAULT 'default',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permitir que a API (service role) acesse a tabela
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

-- Policy para o service_role poder ler/escrever
CREATE POLICY "Service role can manage google_tokens"
  ON google_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Inserir row padrão (será atualizada quando o usuário conectar)
-- Comentado pois será criado automaticamente pela API
-- INSERT INTO google_tokens (id) VALUES ('default') ON CONFLICT DO NOTHING;
