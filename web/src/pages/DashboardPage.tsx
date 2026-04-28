import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

type Linha = {
  id_personagem: string;
  nome: string;
  vida_atual: number;
  vida_maxima: number;
  criado_em?: string;
};

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const [lista, setLista] = useState<Linha[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("personagem")
        .select("id_personagem, nome, vida_atual, vida_maxima, criado_em")
        .order("criado_em", { ascending: false });
      if (error) setLoadErr(error.message);
      else setLista((data ?? []) as Linha[]);
    })();
  }, [user]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <strong>Criador de Ficha</strong>
        <span>
          {user?.email}{" "}
          <button type="button" className="btn secondary" onClick={() => signOut()}>
            Sair
          </button>
        </span>
      </header>

      <div className="sheet-paper">
        <h1 className="sheet-title">Suas fichas</h1>
        <p className="help" style={{ marginBottom: "1rem" }}>
          Personagens ficam ligados ao seu usuário (Supabase Auth). Use “Nova ficha” para o fluxo
          guiado conforme o Guia do Jogador.
        </p>
        {loadErr ? <p className="error-msg">{loadErr}</p> : null}
        <p style={{ marginBottom: "0.75rem" }}>
          <Link className="btn" to="/nova">
            + Nova ficha
          </Link>
        </p>
        <div className="list-cards">
          {lista.length === 0 && !loadErr ? (
            <p style={{ color: "var(--ink-muted)" }}>Nenhuma ficha ainda.</p>
          ) : null}
          {lista.map((p) => (
            <Link key={p.id_personagem} to={`/ficha/${p.id_personagem}`}>
              <strong>{p.nome}</strong>
              <div style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                PV {p.vida_atual}/{p.vida_maxima}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
