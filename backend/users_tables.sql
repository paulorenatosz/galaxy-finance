-- Tabela de perfis de usuários
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    role TEXT DEFAULT 'usuario' CHECK (role IN ('admin', 'gestor', 'usuario', 'financeiro')),
    avatar_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email)
);

-- Tabela de convites
CREATE TABLE IF NOT EXISTS user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    role TEXT DEFAULT 'usuario' CHECK (role IN ('admin', 'gestor', 'usuario', 'financeiro')),
    token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
    invited_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'expirado')),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profiles
CREATE POLICY "Allow all for authenticated users" ON user_profiles
    FOR ALL TO authenticated USING (true);

-- Políticas para user_invites (apenas admin)
CREATE POLICY "Allow all for authenticated users" ON user_invites
    FOR ALL TO authenticated USING (true);

-- Adicionar coluna role na tabela investimentos para controle
ALTER TABLE investimentos ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
