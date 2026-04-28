-- RLS e perfil automático para schema fichas_jogador (Supabase)
-- Execute no SQL Editor após o schema base.

BEGIN;

ALTER TABLE fichas_jogador.perfil_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.personagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.personagem_classe ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.personagem_carta ENABLE ROW LEVEL SECURITY;

-- Leitura pública opcional do catálogo (somente leitura para usuários autenticados)
ALTER TABLE fichas_jogador.origem ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.carta ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.raca ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.classe ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.raca_origem ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.classe_origem ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.carta_origem_concedida ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.carta_origem_requisito_conjunto ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_jogador.carta_origem_requisito_opcao ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfil_sel ON fichas_jogador.perfil_usuario FOR SELECT USING (auth.uid() = id);
CREATE POLICY perfil_upd ON fichas_jogador.perfil_usuario FOR UPDATE USING (auth.uid() = id);
CREATE POLICY perfil_ins ON fichas_jogador.perfil_usuario FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY personagem_all ON fichas_jogador.personagem FOR ALL USING (auth.uid() = id_usuario);
CREATE POLICY pc_all ON fichas_jogador.personagem_classe FOR ALL USING (
  EXISTS (SELECT 1 FROM fichas_jogador.personagem p WHERE p.id_personagem = personagem_classe.id_personagem AND p.id_usuario = auth.uid())
);
CREATE POLICY pca_all ON fichas_jogador.personagem_carta FOR ALL USING (
  EXISTS (SELECT 1 FROM fichas_jogador.personagem p WHERE p.id_personagem = personagem_carta.id_personagem AND p.id_usuario = auth.uid())
);

CREATE POLICY cat_read_origem ON fichas_jogador.origem FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_carta ON fichas_jogador.carta FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_raca ON fichas_jogador.raca FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_classe ON fichas_jogador.classe FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_ro ON fichas_jogador.raca_origem FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_co ON fichas_jogador.classe_origem FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_coc ON fichas_jogador.carta_origem_concedida FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_crc ON fichas_jogador.carta_origem_requisito_conjunto FOR SELECT TO authenticated USING (true);
CREATE POLICY cat_read_cro ON fichas_jogador.carta_origem_requisito_opcao FOR SELECT TO authenticated USING (true);

-- Função: criar perfil ao registrar (opcional; o front também faz upsert)
CREATE OR REPLACE FUNCTION fichas_jogador.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO fichas_jogador.perfil_usuario (id, nome_exibicao)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_auth_user_perfil ON auth.users;
CREATE TRIGGER tr_auth_user_perfil
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE fichas_jogador.handle_new_user();

COMMIT;
