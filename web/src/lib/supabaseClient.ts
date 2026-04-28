/**
 * Cliente Supabase com schema `fichas_jogador`.
 * Configuração via `SUPABASE_URL` + `ANON_KEY` (ou `SUPABASE_ANON_KEY`), ou `URL|anon` numa linha.
 *
 * `createClient` lança se URL/chave forem vazias — isso derrubava o bundle inteiro (tela branca).
 * Usamos placeholders só para o módulo carregar; use `isSupabaseConfigured` antes de confiar nas chamadas.
 */
import { createClient } from "@supabase/supabase-js";
import { parseSupabaseConnection } from "./parseSupabaseConnection";

/** Chave anon em variável separada (ordem de preferência). */
function anonFromSeparateEnv(): string {
  return (
    import.meta.env.SUPABASE_ANON_KEY ??
    import.meta.env.ANON_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY ??
    ""
  ).trim();
}

function loadClientConfig(): { url: string; anonKey: string } {
  const anonExtra = anonFromSeparateEnv();

  const single = import.meta.env.SUPABASE_URL;
  if (single) {
    const parsed = parseSupabaseConnection(single);
    const url = parsed.url.trim();
    const anonKey = (parsed.anonKey.trim() || anonExtra).trim();
    return { url, anonKey };
  }

  const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
  return { url, anonKey: anonExtra };
}

const cfg = loadClientConfig();

/** True quando há URL HTTPS e chave anon reais (não placeholder). */
export const isSupabaseConfigured = Boolean(cfg.url?.trim() && cfg.anonKey?.trim());

/** URL/chave só para satisfazer o construtor quando o .env ainda não foi preenchido. */
const PLACEHOLDER_URL = "https://invalid.invalid";
const PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-not-a-real-jwt";

const resolvedUrl = isSupabaseConfigured ? cfg.url.trim() : PLACEHOLDER_URL;
const resolvedKey = isSupabaseConfigured ? cfg.anonKey.trim() : PLACEHOLDER_KEY;

if (!isSupabaseConfigured) {
  console.warn(
    "[Criador de Ficha] Defina SUPABASE_URL + ANON_KEY (ou SUPABASE_ANON_KEY), ou URL|anon numa linha, " +
      "em web/.env — e reinicie o servidor de desenvolvimento."
  );
}

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: { persistSession: true, autoRefreshToken: true },
  db: { schema: "fichas_jogador" },
});
