-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    tipo TEXT,
    contato TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#0066CC'
);

-- Adicionar coluna link_boleto na tabela investimentos se não existir
ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS link_boleto TEXT;

-- Habilitar RLS
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;

-- Políticas para fornecedores
CREATE POLICY "Allow all for authenticated users" ON fornecedores
    FOR ALL TO authenticated USING (true);

-- Políticas para categorias
CREATE POLICY "Allow all for authenticated users" ON categorias
    FOR ALL TO authenticated USING (true);
