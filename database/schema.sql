-- =============================================================================
-- Esquema relacional — Ficha / Cartas / Origens / Usuários (PostgreSQL / Supabase)
-- Implantação no Supabase: usar `schema_fichas_jogador.sql` (schema `fichas_jogador`).
-- Este arquivo permanece como referência em `public` sem prefixo de schema.
-- =============================================================================
-- Convenções:
-- - IDs numéricos (BIGSERIAL) para catálogos estáveis (raças, classes, cartas, origens).
-- - UUID para fichas de personagem e vínculos sensíveis a merge/sync.
-- - Origens normalizadas em tabela `origem` + relações N:N para composição da ficha.
-- - Requisitos de carta: modelo em conjuntos (AND entre conjuntos, OR dentro do conjunto).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Extensões (Supabase já inclui pgcrypto; gen_random_uuid é nativo em PG 13+)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos enumerados (ajuste valores conforme o Guia de Regras)
-- -----------------------------------------------------------------------------
CREATE TYPE modo_uso_carta AS ENUM (
  'Passivo',
  'Reacao',
  'Acao',
  'Descanso',
  'Morrendo'
);

CREATE TYPE tipo_carta AS ENUM (
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

-- -----------------------------------------------------------------------------
-- Usuário jogador (perfil ligado ao Auth do Supabase)
-- id deve coincidir com auth.users(id). Crie via trigger ou signup hook se preferir.
-- -----------------------------------------------------------------------------
CREATE TABLE perfil_usuario (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nome_exibicao TEXT,
  avatar_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfil_usuario_criado ON perfil_usuario (criado_em DESC);

-- -----------------------------------------------------------------------------
-- Catálogo de origens (tags únicas: "Hemomante", "Magia de Fogo", etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE origem (
  id_origem BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT
);

CREATE INDEX idx_origem_nome_lower ON origem (LOWER(nome));

-- -----------------------------------------------------------------------------
-- Cartas (habilidades, magias, treinos…)
-- -----------------------------------------------------------------------------
CREATE TABLE carta (
  id_carta BIGSERIAL PRIMARY KEY,
  nome_carta TEXT NOT NULL,
  tipo tipo_carta NOT NULL DEFAULT 'Outro',
  modo_uso modo_uso_carta NOT NULL DEFAULT 'Acao',
  tempo_de_uso TEXT,
  alcance TEXT,
  custo_energia INTEGER,
  custo_extra TEXT,
  condicao_de_aprendizado TEXT,
  palavras_chave TEXT[],
  -- Modificadores estruturados (treinos, passivos); livre para JSON sem derrotar migrações
  atributos_concedidos JSONB DEFAULT '{}'::JSONB,
  vida_concedida INTEGER DEFAULT 0,
  energia_concedida INTEGER DEFAULT 0,
  -- Árvore de evolução / dependência
  habilidade_relacionada_id BIGINT REFERENCES carta (id_carta) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carta_nome_unique UNIQUE (nome_carta)
);

CREATE INDEX idx_carta_tipo ON carta (tipo);
CREATE INDEX idx_carta_modo ON carta (modo_uso);
CREATE INDEX idx_carta_habilidade_pai ON carta (habilidade_relacionada_id);

-- Origens que a carta concede ao ser aprendida
CREATE TABLE carta_origem_concedida (
  id_carta BIGINT NOT NULL REFERENCES carta (id_carta) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES origem (id_origem) ON DELETE CASCADE,
  PRIMARY KEY (id_carta, id_origem)
);

-- Requisitos de origem: vários "conjuntos"; satisfazer TODOS os conjuntos;
-- em cada conjunto, basta possuir UMA das origens listadas (OR interno).
-- Carta "livre": sem linhas em carta_origem_requisito_conjunto.
CREATE TABLE carta_origem_requisito_conjunto (
  id_conjunto BIGSERIAL PRIMARY KEY,
  id_carta BIGINT NOT NULL REFERENCES carta (id_carta) ON DELETE CASCADE,
  ordem SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE carta_origem_requisito_opcao (
  id_conjunto BIGINT NOT NULL REFERENCES carta_origem_requisito_conjunto (id_conjunto) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES origem (id_origem) ON DELETE CASCADE,
  PRIMARY KEY (id_conjunto, id_origem)
);

CREATE INDEX idx_req_conjunto_carta ON carta_origem_requisito_conjunto (id_carta);

-- -----------------------------------------------------------------------------
-- Raças
-- -----------------------------------------------------------------------------
CREATE TABLE raca (
  id_raca BIGSERIAL PRIMARY KEY,
  nome_raca TEXT NOT NULL UNIQUE,
  -- Legado / exportação: pode espelhar texto agregado; fonte de verdade são raca_origem + JSON
  origens_relacionadas_legacy TEXT,
  atributos_iniciais JSONB DEFAULT '{}'::JSONB,
  vida_inicial INTEGER NOT NULL DEFAULT 0,
  energia_inicial INTEGER NOT NULL DEFAULT 0,
  habilidade_inata_id BIGINT REFERENCES carta (id_carta) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE raca_origem (
  id_raca BIGINT NOT NULL REFERENCES raca (id_raca) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES origem (id_origem) ON DELETE CASCADE,
  PRIMARY KEY (id_raca, id_origem)
);

CREATE INDEX idx_raca_origem_origem ON raca_origem (id_origem);

-- -----------------------------------------------------------------------------
-- Classes (múltiplas por personagem via personagem_classe)
-- -----------------------------------------------------------------------------
CREATE TABLE classe (
  id_classe BIGSERIAL PRIMARY KEY,
  nome_classe TEXT NOT NULL UNIQUE,
  origem_relacionada_legacy TEXT,
  atributos_iniciais JSONB DEFAULT '{}'::JSONB,
  vida_inicial INTEGER NOT NULL DEFAULT 0,
  energia_inicial INTEGER NOT NULL DEFAULT 0,
  habilidade_caracteristica_id BIGINT REFERENCES carta (id_carta) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Uma ou mais origens concedidas pela classe (ex.: principal + arcadas futuras)
CREATE TABLE classe_origem (
  id_classe BIGINT NOT NULL REFERENCES classe (id_classe) ON DELETE CASCADE,
  id_origem BIGINT NOT NULL REFERENCES origem (id_origem) ON DELETE CASCADE,
  eh_principal BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id_classe, id_origem)
);

CREATE INDEX idx_classe_origem_origem ON classe_origem (id_origem);

-- -----------------------------------------------------------------------------
-- Personagem (ficha)
-- -----------------------------------------------------------------------------
CREATE TABLE personagem (
  id_personagem UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES perfil_usuario (id) ON DELETE CASCADE,

  nome TEXT NOT NULL,
  idade INTEGER,
  descricao TEXT,

  id_raca BIGINT NOT NULL REFERENCES raca (id_raca),

  -- Atributos base (valores já consolidados de raça + classes + treinos conforme regras)
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

CREATE INDEX idx_personagem_usuario ON personagem (id_usuario);
CREATE INDEX idx_personagem_nome ON personagem (LOWER(nome));

-- -----------------------------------------------------------------------------
-- Associações N:N
-- -----------------------------------------------------------------------------
CREATE TABLE personagem_classe (
  id_personagem UUID NOT NULL REFERENCES personagem (id_personagem) ON DELETE CASCADE,
  id_classe BIGINT NOT NULL REFERENCES classe (id_classe) ON DELETE RESTRICT,
  ordem SMALLINT NOT NULL DEFAULT 0,
  adquirido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id_personagem, id_classe)
);

CREATE INDEX idx_personagem_classe_classe ON personagem_classe (id_classe);

CREATE TABLE personagem_carta (
  id_personagem UUID NOT NULL REFERENCES personagem (id_personagem) ON DELETE CASCADE,
  id_carta BIGINT NOT NULL REFERENCES carta (id_carta) ON DELETE RESTRICT,
  aprendido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notas TEXT,
  PRIMARY KEY (id_personagem, id_carta)
);

CREATE INDEX idx_personagem_carta_carta ON personagem_carta (id_carta);

-- -----------------------------------------------------------------------------
-- Função: origens efetivas do personagem (raça + classes + cartas aprendidas)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION origens_personagem(p_id UUID)
RETURNS TABLE (id_origem BIGINT)
LANGUAGE SQL
STABLE
AS $$
  SELECT DISTINCT ro.id_origem
  FROM personagem p
  JOIN raca_origem ro ON ro.id_raca = p.id_raca
  WHERE p.id_personagem = p_id
  UNION
  SELECT DISTINCT co.id_origem
  FROM personagem_classe pc
  JOIN classe_origem co ON co.id_classe = pc.id_classe
  WHERE pc.id_personagem = p_id
  UNION
  SELECT DISTINCT coc.id_origem
  FROM personagem_carta pec
  JOIN carta_origem_concedida coc ON coc.id_carta = pec.id_carta
  WHERE pec.id_personagem = p_id;
$$;

-- -----------------------------------------------------------------------------
-- Função: verifica se o personagem pode aprender a carta (requisitos de origem)
-- Regra: para cada conjunto da carta, existe pelo menos uma origem do conjunto
--        presente nas origens efetivas do personagem.
-- Carta sem conjuntos = livre para aprendizado (retorna TRUE).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION personagem_pode_aprender_carta(p_personagem UUID, p_carta BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  WITH reqs AS (
    SELECT c.id_conjunto
    FROM carta_origem_requisito_conjunto c
    WHERE c.id_carta = p_carta
  ),
  satisf AS (
    SELECT r.id_conjunto
    FROM reqs r
    WHERE EXISTS (
      SELECT 1
      FROM carta_origem_requisito_opcao o
      JOIN origens_personagem(p_personagem) op ON op.id_origem = o.id_origem
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

-- -----------------------------------------------------------------------------
-- Trigger: atualizar atualizado_em
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_perfil_usuario_au BEFORE UPDATE ON perfil_usuario
  FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

CREATE TRIGGER tr_carta_au BEFORE UPDATE ON carta
  FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

CREATE TRIGGER tr_raca_au BEFORE UPDATE ON raca
  FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

CREATE TRIGGER tr_classe_au BEFORE UPDATE ON classe
  FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

CREATE TRIGGER tr_personagem_au BEFORE UPDATE ON personagem
  FOR EACH ROW EXECUTE PROCEDURE set_atualizado_em();

-- -----------------------------------------------------------------------------
-- Row Level Security (Supabase): usuário vê/edita apenas suas fichas
-- Ative após criar políticas no painel ou descomente exemplos:
-- -----------------------------------------------------------------------------
-- ALTER TABLE personagem ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY personagem_is_owner ON personagem
--   FOR ALL USING (auth.uid() = id_usuario);

COMMIT;
