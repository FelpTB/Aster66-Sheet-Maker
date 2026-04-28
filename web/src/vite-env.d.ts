/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL HTTPS ou postgres:// (pode omitir "|anon" se ANON_KEY estiver definido). */
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_ANON_KEY?: string;
  /** Exposto no cliente com envPrefix ANON_ */
  readonly ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
