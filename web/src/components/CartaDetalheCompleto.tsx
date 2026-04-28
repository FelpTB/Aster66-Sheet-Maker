import { ATTR_KEYS, ATTR_LABEL } from "../lib/fichaRules";
import type { AttrKey } from "../lib/fichaRules";
import { bonusAttrsCarta } from "../lib/fichaRules";
import type { CartaCompleta } from "../lib/catalogQueries";

function linhaBonus(json: unknown): string {
  const p = bonusAttrsCarta(json);
  const parts: string[] = [];
  for (const k of ATTR_KEYS) {
    const v = p[k];
    if (v != null && v !== 0) parts.push(`${v > 0 ? "+" : ""}${v} ${ATTR_LABEL[k as AttrKey]}`);
  }
  return parts.join(", ") || "—";
}

export function CartaDetalheCompleto({ carta, compact }: { carta: CartaCompleta; compact?: boolean }) {
  return (
    <div
      className="carta-detalhe"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: compact ? "0.5rem 0.65rem" : "0.75rem 1rem",
        background: "rgba(255,255,255,0.35)",
        fontSize: compact ? "0.9rem" : "1rem",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{carta.nome_carta}</div>
      <div style={{ color: "var(--ink-muted)", fontSize: "0.85rem", marginBottom: "0.35rem" }}>
        {[carta.tipo, carta.modo_uso].filter(Boolean).join(" · ")}
      </div>
      <dl style={{ margin: 0, display: "grid", gap: "0.2rem", fontSize: "0.88rem" }}>
        {carta.tempo_de_uso ? (
          <>
            <dt style={{ fontWeight: 600 }}>Tempo de uso</dt>
            <dd style={{ margin: 0 }}>{carta.tempo_de_uso}</dd>
          </>
        ) : null}
        {carta.alcance ? (
          <>
            <dt style={{ fontWeight: 600 }}>Alcance</dt>
            <dd style={{ margin: 0 }}>{carta.alcance}</dd>
          </>
        ) : null}
        {(carta.custo_energia != null || carta.custo_extra) ? (
          <>
            <dt style={{ fontWeight: 600 }}>Custo</dt>
            <dd style={{ margin: 0 }}>
              {carta.custo_energia != null ? `${carta.custo_energia} energia` : ""}
              {carta.custo_extra ? ` · ${carta.custo_extra}` : ""}
            </dd>
          </>
        ) : null}
        <dt style={{ fontWeight: 600 }}>Atributos concedidos</dt>
        <dd style={{ margin: 0 }}>{linhaBonus(carta.atributos_concedidos)}</dd>
        {(carta.vida_concedida ?? 0) !== 0 || (carta.energia_concedida ?? 0) !== 0 ? (
          <>
            <dt style={{ fontWeight: 600 }}>Vida / energia concedida</dt>
            <dd style={{ margin: 0 }}>
              {(carta.vida_concedida ?? 0) !== 0
                ? `PV ${(carta.vida_concedida ?? 0) > 0 ? "+" : ""}${carta.vida_concedida ?? 0}`
                : ""}
              {(carta.vida_concedida ?? 0) !== 0 && (carta.energia_concedida ?? 0) !== 0 ? " · " : ""}
              {(carta.energia_concedida ?? 0) !== 0
                ? `Energia ${(carta.energia_concedida ?? 0) > 0 ? "+" : ""}${carta.energia_concedida ?? 0}`
                : ""}
            </dd>
          </>
        ) : null}
        {carta.condicao_de_aprendizado ? (
          <>
            <dt style={{ fontWeight: 600 }}>Condição de aprendizado</dt>
            <dd style={{ margin: 0 }}>{carta.condicao_de_aprendizado}</dd>
          </>
        ) : null}
        {carta.palavras_chave && carta.palavras_chave.length > 0 ? (
          <>
            <dt style={{ fontWeight: 600 }}>Palavras-chave</dt>
            <dd style={{ margin: 0 }}>{carta.palavras_chave.join(", ")}</dd>
          </>
        ) : null}
      </dl>
      {!compact && carta.texto_descricao ? (
        <p style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap", fontSize: "0.92rem" }}>{carta.texto_descricao}</p>
      ) : null}
      {!compact && carta.texto_corpo ? (
        <p style={{ marginTop: "0.35rem", whiteSpace: "pre-wrap", fontSize: "0.88rem", color: "var(--ink-muted)" }}>
          {carta.texto_corpo}
        </p>
      ) : null}
    </div>
  );
}
