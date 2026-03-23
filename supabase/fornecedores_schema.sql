-- Tabela de fornecedores
CREATE TABLE fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  categoria TEXT,
  descricao TEXT,
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (SEGURANÇA CORRIGIDA)
-- Apenas usuários autenticados podem ver e gerenciar fornecedores
CREATE POLICY "Fornecedores visíveis para autenticados"
  ON fornecedores FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Fornecedores podem ser inseridos por autenticados"
  ON fornecedores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Fornecedores podem ser atualizados por autenticados"
  ON fornecedores FOR UPDATE
  USING (auth.role() = 'authenticated');

-- DELETAR fornecedores apenas para admins
CREATE POLICY "Fornecedores podem ser deletados por admins"
  ON fornecedores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir fornecedores iniciais
INSERT INTO fornecedores (nome, email, telefone, categoria) VALUES
('Espaço Altus Eventos', 'contato@altuseventos.com.br', '(11) 99999-9999', 'ESPAÇO E INFRAESTRUTURA'),
('Buffet Gourmet', 'vendas@buffetgourmet.com.br', '(11) 88888-8888', 'CATERING E BEBIDAS'),
('Hotel Grand', 'reservas@hotelgrand.com.br', '(11) 77777-7777', 'DESLOCAMENTO E HOSPEDAGEM'),
('Uber Brasil', 'suporte@uber.com', '4000-1111', 'DESLOCAMENTO E HOSPEDAGEM'),
('Studio Fotografia', 'contato@studiofoto.com.br', '(11) 66666-6666', 'PRESTAÇÃO DE SERVIÇOS'),
('Locadora de Móveis', 'vendas@locadoramoveis.com.br', '(11) 55555-5555', 'ESPAÇO E INFRAESTRUTURA'),
('Personal Brindes', 'pedidos@personalbrindes.com.br', '(11) 44444-4444', 'MATERIAIS E BRINDES'),
('Flores & Decorações', 'contato@floresdecora.com.br', '(11) 33333-3333', 'DECORAÇÃO E AMBIENTE'),
('Café Premium', 'vendas@cafepremium.com.br', '(11) 22222-2222', 'CATERING E BEBIDAS'),
('Translado Express', 'contato@transladoexpress.com.br', '(11) 11111-1111', 'DESLOCAMENTO E HOSPEDAGEM');
