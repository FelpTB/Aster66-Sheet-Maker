import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export function LoginPage() {
  const { signIn, signUp, user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading)
    return (
      <div className="app-shell">
        <p style={{ color: "#e8dcc8" }}>Carregando…</p>
      </div>
    );
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const fn = mode === "login" ? signIn : signUp;
      const { error } = await fn(email.trim(), password);
      if (error) setErr(error.message);
      else nav("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="sheet-paper login-panel">
        <h1 className="sheet-title" style={{ fontSize: "1.35rem" }}>
          Criador de Ficha
        </h1>
        <p className="help">
          Entre com sua conta Supabase Auth. Novos usuários podem registrar-se abaixo.
        </p>
        {!isSupabaseConfigured ? (
          <p className="error-msg" style={{ marginBottom: "1rem" }}>
            <strong>Supabase não configurado.</strong> Em <code>web/.env</code> use{" "}
            <code>SUPABASE_URL</code> + <code>ANON_KEY</code>, ou <code>SUPABASE_URL=…|…</code> numa linha
            (veja <code>.env.example</code>) e reinicie <code>npm run dev</code>.
          </p>
        ) : null}
        <form onSubmit={onSubmit}>
          <div className="field" style={{ marginBottom: "0.75rem" }}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: "1rem" }}>
            <label htmlFor="pw">Senha</label>
            <input
              id="pw"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {err ? <p className="error-msg">{err}</p> : null}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="btn" type="submit" disabled={busy}>
              {mode === "login" ? "Entrar" : "Criar conta"}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setErr(null);
              }}
            >
              {mode === "login" ? "Registrar" : "Já tenho conta"}
            </button>
          </div>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.88rem" }}>
          <Link to="/">← Voltar</Link>
        </p>
      </div>
    </div>
  );
}
