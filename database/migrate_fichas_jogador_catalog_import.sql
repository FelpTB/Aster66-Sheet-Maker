-- Metadados de importação (Notion / HTML) + textos longos nas tabelas de catálogo
BEGIN;

ALTER TABLE fichas_jogador.carta
  ADD COLUMN IF NOT EXISTS notion_page_id UUID,
  ADD COLUMN IF NOT EXISTS arquivo_fonte TEXT,
  ADD COLUMN IF NOT EXISTS texto_corpo TEXT,
  ADD COLUMN IF NOT EXISTS custo_energia_texto TEXT,
  ADD COLUMN IF NOT EXISTS propriedades_importacao JSONB DEFAULT '{}'::JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carta_notion_page_id
  ON fichas_jogador.carta (notion_page_id)
  WHERE notion_page_id IS NOT NULL;

ALTER TABLE fichas_jogador.raca
  ADD COLUMN IF NOT EXISTS notion_page_id UUID,
  ADD COLUMN IF NOT EXISTS arquivo_fonte TEXT,
  ADD COLUMN IF NOT EXISTS texto_descricao TEXT,
  ADD COLUMN IF NOT EXISTS propriedades_importacao JSONB DEFAULT '{}'::JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_raca_notion_page_id
  ON fichas_jogador.raca (notion_page_id)
  WHERE notion_page_id IS NOT NULL;

ALTER TABLE fichas_jogador.classe
  ADD COLUMN IF NOT EXISTS notion_page_id UUID,
  ADD COLUMN IF NOT EXISTS arquivo_fonte TEXT,
  ADD COLUMN IF NOT EXISTS texto_descricao TEXT,
  ADD COLUMN IF NOT EXISTS propriedades_importacao JSONB DEFAULT '{}'::JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_classe_notion_page_id
  ON fichas_jogador.classe (notion_page_id)
  WHERE notion_page_id IS NOT NULL;

COMMIT;
