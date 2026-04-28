/**
 * Lê um único SUPABASE_URL do .env.
 *
 * O cliente @supabase/supabase-js precisa da URL REST (https://*.supabase.co) e da chave anon.
 * A "connection string" do Postgres não inclui a chave anon — por isso o formato aceito é:
 *   <connection ou URL REST>|<chave_anon_jwt>
 *
 * Se a senha do Postgres contiver "|", use a URL HTTPS do painel em vez do URI postgres.
 */

function trimQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Extrai https://<ref>.supabase.co a partir de URIs comuns do Supabase. */
export function deriveRestApiUrlFromPostgresUri(postgresUri: string): string | null {
  const raw = postgresUri.trim();
  let u: URL;
  try {
    u = new URL(raw.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:"));
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  const user = decodeURIComponent(u.username || "");

  if (host.endsWith(".supabase.co") && host.startsWith("db.")) {
    const ref = host.slice("db.".length).replace(/\.supabase\.co$/i, "");
    if (ref) return `https://${ref}.supabase.co`;
  }

  if (host.includes("pooler.supabase.com") && user.startsWith("postgres.")) {
    const ref = user.slice("postgres.".length);
    if (ref) return `https://${ref}.supabase.co`;
  }

  return null;
}

export type ParsedSupabaseConnection = { url: string; anonKey: string };

/**
 * Interpreta SUPABASE_URL único.
 * Formato: `https://xxx.supabase.co|<anon>` ou `postgresql://...|<anon>`
 */
export function parseSupabaseConnection(raw: string | undefined): ParsedSupabaseConnection {
  const full = trimQuotes(raw ?? "");
  if (!full) {
    return { url: "", anonKey: "" };
  }

  const pipe = full.indexOf("|");
  const connPart = pipe >= 0 ? full.slice(0, pipe).trim() : full.trim();
  const anonKey = pipe >= 0 ? full.slice(pipe + 1).trim() : "";

  let url = "";
  if (connPart.startsWith("https://")) {
    url = connPart;
  } else if (/^postgres(ql)?:\/\//i.test(connPart)) {
    url = deriveRestApiUrlFromPostgresUri(connPart) ?? "";
  }

  return { url, anonKey };
}
