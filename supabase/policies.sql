-- Políticas RLS para funcionarios e passagens
-- Execute no SQL Editor do Supabase (projeto: udsnfatqoedogawpkgkc)

-- Políticas para funcionarios
DROP POLICY IF EXISTS "Funcionários visíveis apenas para criadores" ON funcionarios;
DROP POLICY IF EXISTS "Funcionários podem ser inseridos" ON funcionarios;
DROP POLICY IF EXISTS "Funcionários podem ser atualizados" ON funcionarios;

CREATE POLICY "Funcionários visíveis apenas para criadores" ON funcionarios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Funcionários podem ser inseridos" ON funcionarios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Funcionários podem ser atualizados" ON funcionarios
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para passagens
DROP POLICY IF EXISTS "Passagens visíveis apenas para criadores" ON passagens;
DROP POLICY IF EXISTS "Passagens podem ser inseridas" ON passagens;
DROP POLICY IF EXISTS "Passagens podem ser atualizadas" ON passagens;
DROP POLICY IF EXISTS "Passagens podem ser deletadas" ON passagens;

CREATE POLICY "Passagens visíveis apenas para criadores" ON passagens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Passagens podem ser inseridas" ON passagens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Passagens podem ser atualizadas" ON passagens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Passagens podem ser deletadas" ON passagens
  FOR DELETE USING (auth.uid() = user_id);