-- =============================================================================
-- Schema: fichas_jogador — Fichas / Cartas / Origens / Perfis (PostgreSQL / Supabase)
-- Execute após conectar com DATABASE_URL (recomendado: sslmode=require).
-- =============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS fichas_jogador;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos enumerados no schema
CREATE TYPE fichas_jogador.modo_uso_carta AS ENUM (
  'Passivo',
  'Reacao',
  'Acao',
  'Descanso',
  'Morrendo'
);

CREATE TYPE fichas_jogador.tipo_carta AS ENUM (
  'Habilidade',
  'Musica',
  'Magia',
  'Ritual',
  'Lingua',
  'Golpe',
  'Receita',
  'Treinamento',
  'Tecnica_Inigualavel',
  'Outro'
);

CREATE TABLE fichas_jogador.perfil_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome_exibicao TEXT,
  avatar_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfil_usuario_criado ON fichas_jogador.perfil_usuario (criado_em DESC);

CREATE TABLE fichas_jogador.origem (
  id_origem BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT
);

CREATE INDEX idx_origem_nome_lower ON fichas_jogador.origem (LOWER(nome));

CREATE TABLE fichas_jogador.carta (
  id_carta BIGSERIAL PRIMARY KEY,
  nome_carta TEXT NOT NULL,
  tipo fichas_jogador.tipo_carta NOT NULL DEFAULT 'Outro',
  modo_uso fichas_jogador.modo_uso_carta NOT NULL DEFAULT 'Acao',
  tempo_de_uso TEXT,
  alcance TEXT,
  custo_energia INTEGER,
  custo_extra TEXT,
  condicao_de_aprendizado TEXT,
  palavras_chave TEXT[],
  atributos_concedidos JSONB DEFAULT '{}'::JSONB,
  vida_concedida INTEGER DEFAULT 0,
  energia_concedida INTEGER DEFAULT 0,
  habilidade_relacionada_id BIGINT REFERENCES fichas_jogador.carta (id_carta) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carta_nome_unique UNIQUE (nome_carta)
);

CREATE INDEX idx_carta_tipo ON fichas_jogador.carta (tipo);
CREATE INDEX idx_carta_modo ON fichas_jogador.carta (modo_uso);
CREATE INDEX idx_carta_habilidade_pai ON fichas_jogador.carta (habilidade_relacionada_id);

CREATE TABLE fichas_jogador.carta_origem_concedida (
  id_carta BIGINT NOT NULL REFERENCES fichas_jogador.carta (id_carta) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES fichas_jogador.origem (id_origem) ON DELETE CASCADE,
  PRIMARY KEY (id_carta, id_origem)
);

CREATE TABLE fichas_jogador.carta_origem_requisito_conjunto (
  id_conjunto BIGSERIAL PRIMARY KEY,
  id_carta BIGINT NOT NULL REFERENCES fichas_jogador.carta (id_carta) ON DELETE CASCADE,
  ordem SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE fichas_jogador.carta_origem_requisito_opcao (
  id_conjunto BIGINT NOT NULL REFERENCES fichas_jogador.carta_origem_requisito_conjunto (id_conjunto) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES fichas_jogador.origem (id_origem) ON DELETE CASCADE,
  PRIMARY KEY (id_conjunto, id_origem)
);

CREATE INDEX idx_req_conjunto_carta ON fichas_jogador.carta_origem_requisito_conjunto (id_carta);

CREATE TABLE fichas_jogador.raca (
  id_raca BIGSERIAL PRIMARY KEY,
  nome_raca TEXT NOT NULL UNIQUE,
  origens_relacionadas_legacy TEXT,
  atributos_iniciais JSONB DEFAULT '{}'::JSONB,
  vida_inicial INTEGER NOT NULL DEFAULT 0,
  energia_inicial INTEGER NOT NULL DEFAULT 0,
  habilidade_inata_id BIGINT REFERENCES fichas_jogador.carta (id_carta) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fichas_jogador.raca_origem (
  id_raca BIGINT NOT NULL REFERENCES fichas_jogador.raca (id_raca) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES fichas_jogador.origem (id_origem) ON DELETE CASCADE,
  PRIMARY KEY (id_raca, id_origem)
);

CREATE INDEX idx_raca_origem_origem ON fichas_jogador.raca_origem (id_origem);

CREATE TABLE fichas_jogador.classe (
  id_classe BIGSERIAL PRIMARY KEY,
  nome_classe TEXT NOT NULL UNIQUE,
  origem_relacionada_legacy TEXT,
  atributos_iniciais JSONB DEFAULT '{}'::JSONB,
  vida_inicial INTEGER NOT NULL DEFAULT 0,
  energia_inicial INTEGER NOT NULL DEFAULT 0,
  habilidade_caracteristica_id BIGINT REFERENCES fichas_jogador.carta (id_carta) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fichas_jogador.classe_origem (
  id_classe BIGINT NOT NULL REFERENCES fichas_jogador.classe (id_classe) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES fichas_jogador.origem (id_origem) ON DELETE CASCADE,
  eh_principal BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id_classe, id_origem)
);

CREATE INDEX idx_classe_origem_origem ON fichas_jogador.classe_origem (id_origem);

CREATE TABLE fichas_jogador.personagem (
  id_personagem UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES fichas_jogador.perfil_usuario (id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  idade INTEGER,
  descricao TEXT,

  id_raca BIGINT NOT NULL REFERENCES fichas_jogador.raca (id_raca),

  corpo INTEGER NOT NULL DEFAULT 0,
  mente INTEGER NOT NULL DEFAULT 0,
  alma INTEGER NOT NULL DEFAULT 0,
  destreza INTEGER NOT NULL DEFAULT 0,
  conhecimento INTEGER NOT NULL DEFAULT 0,
  foco INTEGER NOT NULL DEFAULT 0,

  vida_maxima INTEGER NOT NULL DEFAULT 0,
  vida_atual INTEGER NOT NULL DEFAULT 0,
  energia_maxima INTEGER NOT NULL DEFAULT 0,
  energia_atual INTEGER NOT NULL DEFAULT 0,

  reacoes_por_turno INTEGER NOT NULL DEFAULT 1,
  esquiva INTEGER NOT NULL DEFAULT 6,
  bloqueio INTEGER NOT NULL DEFAULT 0,
  deslocamento_metros NUMERIC(6, 2) NOT NULL DEFAULT 3,

  cicatrizes SMALLINT NOT NULL DEFAULT 0 CHECK (cicatrizes >= 0 AND cicatrizes <= 5),
  condicoes_ativas TEXT[] DEFAULT ARRAY[]::TEXT[],
  ligacao SMALLINT NOT NULL DEFAULT 0 CHECK (ligacao >= 0 AND ligacao <= 20),

  slots_em_maos SMALLINT NOT NULL DEFAULT 2 CHECK (slots_em_maos >= 0),
  slots_equipado SMALLINT NOT NULL DEFAULT 4 CHECK (slots_equipado >= 0),
  slots_acesso_rapido SMALLINT NOT NULL DEFAULT 0 CHECK (slots_acesso_rapido >= 0),
  slots_guardado SMALLINT NOT NULL DEFAULT 4 CHECK (slots_guardado >= 0),

  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_personagem_usuario ON fichas_jogador.personagem (id_usuario);
CREATE INDEX idx_personagem_nome ON fichas_jogador.personagem (LOWER(nome));

CREATE TABLE fichas_jogador.personagem_classe (
  id_personagem UUID NOT NULL REFERENCES fichas_jogador.personagem (id_personagem) ON DELETE CASCADE,
  id_classe BIGINT NOT NULL REFERENCES fichas_jogador.classe (id_classe) ON DELETE RESTRICT,
  ordem SMALLINT NOT NULL DEFAULT 0,
  adquirido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_personagem, id_classe)
);

CREATE INDEX idx_personagem_classe_classe ON fichas_jogador.personagem_classe (id_classe);

CREATE TABLE fichas_jogador.personagem_carta (
  id_personagem UUID NOT NULL REFERENCES fichas_jogador.personagem (id_personagem) ON DELETE CASCADE,
  id_carta BIGINT NOT NULL REFERENCES fichas_jogador.carta (id_carta) ON DELETE RESTRICT,
  aprendido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT,
  PRIMARY KEY (id_personagem, id_carta)
);

CREATE INDEX idx_personagem_carta_carta ON fichas_jogador.personagem_carta (id_carta);

CREATE OR REPLACE FUNCTION fichas_jogador.origens_personagem(p_id UUID)
RETURNS TABLE (id_origem BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT DISTINCT ro.id_origem
  FROM fichas_jogador.personagem p
  JOIN fichas_jogador.raca_origem ro ON ro.id_raca = p.id_raca
  WHERE p.id_personagem = p_id
  UNION
  SELECT DISTINCT co.id_origem
  FROM fichas_jogador.personagem_classe pc
  JOIN fichas_jogador.classe_origem co ON co.id_classe = pc.id_classe
  WHERE pc.id_personagem = p_id
  UNION
  SELECT DISTINCT coc.id_origem
  FROM fichas_jogador.personagem_carta pec
  JOIN fichas_jogador.carta_origem_concedida coc ON coc.id_carta = pec.id_carta
  WHERE pec.id_personagem = p_id;
$$;

CREATE OR REPLACE FUNCTION fichas_jogador.personagem_pode_aprender_carta(p_personagem UUID, p_carta BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  WITH reqs AS (
    SELECT c.id_conjunto
    FROM fichas_jogador.carta_origem_requisito_conjunto c
    WHERE c.id_carta = p_carta
  ),
  satisf AS (
    SELECT r.id_conjunto
    FROM reqs r
    WHERE EXISTS (
      SELECT 1
      FROM fichas_jogador.carta_origem_requisito_opcao o
      JOIN fichas_jogador.origens_personagem(p_personagem) op ON op.id_origem = o.id_origem
      WHERE o.id_conjunto = r.id_conjunto
    )
  ),
  cnt_req AS (SELECT COUNT(*)::INT AS n FROM reqs),
  cnt_sat AS (SELECT COUNT(*)::INT AS n FROM satisf)
  SELECT CASE
    WHEN (SELECT n FROM cnt_req) = 0 THEN TRUE
    ELSE (SELECT n FROM cnt_sat) = (SELECT n FROM cnt_req)
  END;
$$;

CREATE OR REPLACE FUNCTION fichas_jogador.set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_perfil_usuario_au BEFORE UPDATE ON fichas_jogador.perfil_usuario
  FOR EACH ROW EXECUTE PROCEDURE fichas_jogador.set_atualizado_em();

CREATE TRIGGER tr_carta_au BEFORE UPDATE ON fichas_jogador.carta
  FOR EACH ROW EXECUTE PROCEDURE fichas_jogador.set_atualizado_em();

CREATE TRIGGER tr_raca_au BEFORE UPDATE ON fichas_jogador.raca
  FOR EACH ROW EXECUTE PROCEDURE fichas_jogador.set_atualizado_em();

CREATE TRIGGER tr_classe_au BEFORE UPDATE ON fichas_jogador.classe
  FOR EACH ROW EXECUTE PROCEDURE fichas_jogador.set_atualizado_em();

CREATE TRIGGER tr_personagem_au BEFORE UPDATE ON fichas_jogador.personagem
  FOR EACH ROW EXECUTE PROCEDURE fichas_jogador.set_atualizado_em();

-- Permissões Supabase (roles padrão do projeto)
GRANT USAGE ON SCHEMA fichas_jogador TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fichas_jogador TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fichas_jogador TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA fichas_jogador TO postgres, service_role, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA fichas_jogador
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA fichas_jogador
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA fichas_jogador TO authenticated, service_role;

COMMENT ON SCHEMA fichas_jogador IS 'Catálogo e fichas de jogador — Criador de Ficha';

COMMIT;
