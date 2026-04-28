import { CartaDetalheCompleto } from "./CartaDetalheCompleto";
import type { OrigemRow } from "../lib/catalogQueries";
import { textoAtributosIniciais } from "../lib/catalogQueries";
import type { CartaCompleta } from "../lib/catalogQueries";

function ListaOrigens({ origens }: { origens: OrigemRow[] }) {
  if (!origens.length) return <p className="help">Nenhuma origem vinculada no catálogo.</p>;
  return (
    <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.2rem" }}>
      {origens.map((o) => (
        <li key={o.id_origem}>
          <strong>{o.nome}</strong>
          {o.descricao ? <span style={{ color: "var(--ink-muted)" }}> — {o.descricao}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function SecaoCartasPorOrigem({
  titulo,
  origens,
  concedemPorOrigem,
}: {
  titulo: string;
  origens: OrigemRow[];
  concedemPorOrigem: Map<number, CartaCompleta[]>;
}) {
  return (
    <div style={{ marginTop: "0.75rem" }}>
      <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem" }}>{titulo}</h4>
      <p className="help" style={{ marginTop: 0 }}>
        Cartas associadas a cada origem no catálogo (concedem essa origem ao aprender).
      </p>
      {origens.map((o) => {
        const lista = concedemPorOrigem.get(o.id_origem) ?? [];
        return (
          <div key={o.id_origem} style={{ marginBottom: "0.65rem" }}>
            <strong>{o.nome}</strong> ({lista.length} no catálogo)
            {lista.length === 0 ? (
              <span style={{ color: "var(--ink-muted)", fontSize: "0.88rem" }}> — sem amostra</span>
            ) : (
              <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.25rem" }}>
                {lista.slice(0, 8).map((c) => (
                  <CartaDetalheCompleto key={c.id_carta} carta={c} compact />
                ))}
                {lista.length > 8 ? (
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                    +{lista.length - 8} outras…
                  </span>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PreviewPainelRaca(props: {
  nomeRaca: string;
  textoDescricao?: string | null;
  vida: number;
  energia: number;
  atributosJson: unknown;
  origens: OrigemRow[];
  inata: CartaCompleta | null;
  concedemPorOrigem: Map<number, CartaCompleta[]>;
  exigemOrigem: CartaCompleta[];
}) {
  const { attrs, pontosLivres } = textoAtributosIniciais(props.atributosJson);
  return (
    <div className="stat-block" style={{ gridColumn: "1 / -1" }}>
      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>{props.nomeRaca}</h3>
      {props.textoDescricao ? (
        <p style={{ whiteSpace: "pre-wrap", marginBottom: "0.65rem" }}>{props.textoDescricao}</p>
      ) : null}
      <p style={{ margin: "0.25rem 0" }}>
        <strong>Vida / Energia base:</strong> {props.vida} / {props.energia}
      </p>
      <p style={{ margin: "0.25rem 0" }}>
        <strong>Atributos concedidos:</strong> {attrs}
      </p>
      <p style={{ margin: "0.25rem 0" }}>
        <strong>Pontos livres:</strong> {pontosLivres}
      </p>
      <div>
        <strong>Origens concedidas pela raça</strong>
        <ListaOrigens origens={props.origens} />
      </div>
      <div style={{ marginTop: "0.65rem" }}>
        <strong>Habilidade inata</strong>
        {props.inata ? (
          <div style={{ marginTop: "0.35rem" }}>
            <CartaDetalheCompleto carta={props.inata} />
          </div>
        ) : (
          <p className="help">—Sem carta inata no catálogo.</p>
        )}
      </div>
      <SecaoCartasPorOrigem
        titulo="Cartas ligadas às origens da raça"
        origens={props.origens}
        concedemPorOrigem={props.concedemPorOrigem}
      />
      {props.exigemOrigem.length > 0 ? (
        <div style={{ marginTop: "0.75rem" }}>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem" }}>
            Amostra de cartas que exigem alguma dessas origens para aprender
          </h4>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            {props.exigemOrigem.slice(0, 12).map((c) => (
              <CartaDetalheCompleto key={c.id_carta} carta={c} compact />
            ))}
            {props.exigemOrigem.length > 12 ? (
              <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                +{props.exigemOrigem.length - 12} outras no catálogo.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PreviewPainelClasse(props: {
  nomeClasse: string;
  textoDescricao?: string | null;
  vida: number;
  energia: number;
  atributosJson: unknown;
  origens: OrigemRow[];
  caracteristica: CartaCompleta | null;
  concedemPorOrigem: Map<number, CartaCompleta[]>;
  exigemOrigem: CartaCompleta[];
}) {
  const { attrs, pontosLivres } = textoAtributosIniciais(props.atributosJson);
  return (
    <div className="stat-block" style={{ gridColumn: "1 / -1" }}>
      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>{props.nomeClasse}</h3>
      {props.textoDescricao ? (
        <p style={{ whiteSpace: "pre-wrap", marginBottom: "0.65rem" }}>{props.textoDescricao}</p>
      ) : null}
      <p style={{ margin: "0.25rem 0" }}>
        <strong>Vida / Energia base:</strong> {props.vida} / {props.energia}
      </p>
      <p style={{ margin: "0.25rem 0" }}>
        <strong>Atributos concedidos (classe inicial):</strong> {attrs}
      </p>
      <p style={{ margin: "0.25rem 0" }}>
        <strong>Pontos livres:</strong> {pontosLivres}
      </p>
      <div>
        <strong>Origens concedidas pela classe</strong>
        <ListaOrigens origens={props.origens} />
      </div>
      <div style={{ marginTop: "0.65rem" }}>
        <strong>Habilidade característica</strong>
        {props.caracteristica ? (
          <div style={{ marginTop: "0.35rem" }}>
            <CartaDetalheCompleto carta={props.caracteristica} />
          </div>
        ) : (
          <p className="help">—Sem carta no catálogo.</p>
        )}
      </div>
      <SecaoCartasPorOrigem
        titulo="Cartas ligadas às origens da classe"
        origens={props.origens}
        concedemPorOrigem={props.concedemPorOrigem}
      />
      {props.exigemOrigem.length > 0 ? (
        <div style={{ marginTop: "0.75rem" }}>
          <h4 style={{ margin: "0 0 0.35rem", fontSize: "0.95rem" }}>
            Amostra de cartas que exigem alguma dessas origens para aprender
          </h4>
          <div style={{ display: "grid", gap: "0.35rem" }}>
            {props.exigemOrigem.slice(0, 12).map((c) => (
              <CartaDetalheCompleto key={c.id_carta} carta={c} compact />
            ))}
            {props.exigemOrigem.length > 12 ? (
              <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                +{props.exigemOrigem.length - 12} outras no catálogo.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
