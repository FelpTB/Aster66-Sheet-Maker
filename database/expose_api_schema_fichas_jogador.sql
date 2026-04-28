-- =============================================================================
-- Tornar o schema `fichas_jogador` visível para a API REST do Supabase (PostgREST)
-- Execute no SQL Editor do projeto (Dashboard → SQL).
--
-- Sem isto, o cliente JS recebe erro tipo: "Invalid schema: fichas_jogador"
--
-- PASSO NO PAINEL (obrigatório):
-- Project Settings → Data API → "Exposed schemas" → inclua "fichas_jogador"
-- (em projetos antigos: Settings → API → Exposed schemas)
-- =============================================================================

BEGIN;

GRANT USAGE ON SCHEMA fichas_jogador TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA fichas_jogador TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA fichas_jogador TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA fichas_jogador TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fichas_jogador
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fichas_jogador
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA fichas_jogador
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

COMMIT;

-- Depois disso, volte a usar a chave ANON (public) no web/.env — não a service_role.
-- O acesso real é controlado por RLS (policies_fichas_jogador_rls.sql).
