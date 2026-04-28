/** Tipos mínimos alinhados ao schema fichas_jogador (consultas Supabase). */

export interface RacaRow {
  id_raca: number;
  nome_raca: string;
  vida_inicial: number;
  energia_inicial: number;
  atributos_iniciais: unknown;
  habilidade_inata_id: number | null;
  texto_descricao?: string | null;
}

export interface ClasseRow {
  id_classe: number;
  nome_classe: string;
  vida_inicial: number;
  energia_inicial: number;
  atributos_iniciais: unknown;
  habilidade_caracteristica_id: number | null;
  texto_descricao?: string | null;
}

export interface CartaRow {
  id_carta: number;
  nome_carta: string;
  tipo?: string;
  atributos_concedidos?: unknown;
  vida_concedida?: number | null;
  energia_concedida?: number | null;
}

export interface PersonagemRow {
  id_personagem: string;
  id_usuario: string;
  nome: string;
  idade: number | null;
  descricao: string | null;
  id_raca: number;
  corpo: number;
  mente: number;
  alma: number;
  destreza: number;
  conhecimento: number;
  foco: number;
  vida_maxima: number;
  vida_atual: number;
  energia_maxima: number;
  energia_atual: number;
  reacoes_por_turno: number;
  esquiva: number;
  bloqueio: number;
  /** NUMERIC no Postgres pode vir como string no JSON do PostgREST */
  deslocamento_metros: number | string;
  cicatrizes: number;
  ligacao: number;
  slots_em_maos: number;
  slots_equipado: number;
  slots_acesso_rapido: number;
  slots_guardado: number;
}
