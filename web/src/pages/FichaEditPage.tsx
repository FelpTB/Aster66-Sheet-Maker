import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ATTR_KEYS, ATTR_LABEL, ATTR_MAX_BASE } from "../lib/fichaRules";
import type { AttrKey } from "../lib/fichaRules";
import { mergeAttrsBaseECartas } from "../lib/personagemDerived";
import { podeAprenderCartaDraft } from "../lib/origensDraft";
import { idsCartasObrigatorias, mergeIdsCartasComObrigatorias, substituirCartasPersonagem } from "../lib/personagemCartas";
import { recalcularESalvarPersonagem } from "../lib/updateFicha";
import { supabase } from "../lib/supabaseClient";
import type { CartaCompleta } from "../lib/catalogQueries";
import type { ClasseRow, PersonagemRow, RacaRow } from "../lib/types";
import { HabilidadesPainelAoVivo } from "../components/HabilidadesPainelAoVivo";

type PCRow = {
  ordem: number;
  classe: ClasseRow;
};

type PCRRow = {
  id_carta: number;
  carta: CartaCompleta;
};

function attrsFromPersonagem(p: PersonagemRow): Record<AttrKey, number> {
  return {
    corpo: p.corpo,
    mente: p.mente,
    alma: p.alma,
    destreza: p.destreza,
    conhecimento: p.conhecimento,
    foco: p.foco,
  };
}

function zeroAttrs(): Record<AttrKey, number> {
  return {
    corpo: 0,
    mente: 0,
    alma: 0,
    destreza: 0,
    conhecimento: 0,
    foco: 0,
  };
}

export function FichaEditPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [personagem, setPersonagem] = useState<PersonagemRow | null>(null);
  const [raca, setRaca] = useState<RacaRow | null>(null);
  const [classesList, setClassesList] = useState<ClasseRow[]>([]);
  const [pcCartas, setPcCartas] = useState<PCRRow[]>([]);

  const [nome, setNome] = useState("");
  const [idade, setIdade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [attrs, setAttrs] = useState<Record<AttrKey, number>>(() => zeroAttrs());
  const [bloqueio, setBloqueio] = useState(0);
  const [deslocamento, setDeslocamento] = useState(3);
  const [cicatrizes, setCicatrizes] = useState(0);
  const [ligacao, setLigacao] = useState(0);
  const [vidaAtual, setVidaAtual] = useState(0);
  const [energiaAtual, setEnergiaAtual] = useState(0);
  const [slotsMaos, setSlotsMaos] = useState(2);
  const [slotsEq, setSlotsEq] = useState(4);
  const [slotsRap, setSlotsRap] = useState(0);
  const [slotsGuard, setSlotsGuard] = useState(4);

  const [saving, setSaving] = useState(false);

  const cartasEfeito = useMemo(
    () =>
      pcCartas.map((r) => ({
        atributos_concedidos: r.carta.atributos_concedidos ?? {},
        vida_concedida: r.carta.vida_concedida ?? 0,
        energia_concedida: r.carta.energia_concedida ?? 0,
      })),
    [pcCartas]
  );

  const attrsEfetivos = useMemo(() => {
    if (!personagem) return null;
    return mergeAttrsBaseECartas(attrs, cartasEfeito);
  }, [personagem, attrs, cartasEfeito]);

  const idsCartasFixasEdit = useMemo(() => {
    if (!raca) return new Set<number>();
    return idsCartasObrigatorias(raca, classesList);
  }, [raca, classesList]);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    const { data: p, error: e1 } = await supabase
      .from("personagem")
      .select("*")
      .eq("id_personagem", id)
      .maybeSingle();
    if (e1 || !p) {
      setErr(e1?.message ?? "Ficha não encontrada");
      setLoading(false);
      return;
    }
    const row = p as PersonagemRow;
    setPersonagem(row);
    setNome(row.nome);
    setIdade(row.idade != null ? String(row.idade) : "");
    setDescricao(row.descricao ?? "");
    setAttrs(attrsFromPersonagem(row));
    setBloqueio(row.bloqueio);
    setDeslocamento(Number(row.deslocamento_metros));
    setCicatrizes(row.cicatrizes);
    setLigacao(row.ligacao);
    setVidaAtual(row.vida_atual);
    setEnergiaAtual(row.energia_atual);
    setSlotsMaos(row.slots_em_maos);
    setSlotsEq(row.slots_equipado);
    setSlotsRap(row.slots_acesso_rapido);
    setSlotsGuard(row.slots_guardado);

    const { data: racaData } = await supabase.from("raca").select("*").eq("id_raca", row.id_raca).single();
    setRaca(racaData as RacaRow);

    const { data: pcl } = await supabase
      .from("personagem_classe")
      .select("ordem, classe(*)")
      .eq("id_personagem", id)
      .order("ordem", { ascending: true });
    const cls: ClasseRow[] = [];
    for (const x of pcl ?? []) {
      const pc = x as unknown as PCRow;
      if (pc.classe) cls.push(pc.classe as ClasseRow);
    }
    setClassesList(cls);

    const { data: pcRows } = await supabase
      .from("personagem_carta")
      .select("id_carta, carta(*)")
      .eq("id_personagem", id);
    setPcCartas((pcRows ?? []) as unknown as PCRRow[]);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !personagem || !raca) return;
    setSaving(true);
    setErr(null);
    const attrsBase = { ...attrs };
    for (const k of ATTR_KEYS) {
      attrsBase[k] = Math.min(ATTR_MAX_BASE, Math.max(0, Math.floor(Number(attrsBase[k]) || 0)));
    }
    const { error } = await recalcularESalvarPersonagem({
      id_personagem: id,
      raca,
      classes: classesList,
      cartas: cartasEfeito,
      attrsBase,
      extras: {
        nome: nome.trim(),
        idade: idade.trim() ? parseInt(idade, 10) : null,
        descricao: descricao.trim() || null,
        vida_atual: vidaAtual,
        energia_atual: energiaAtual,
        bloqueio,
        deslocamento_metros: deslocamento,
        cicatrizes,
        ligacao,
        slots_em_maos: slotsMaos,
        slots_equipado: slotsEq,
        slots_acesso_rapido: slotsRap,
        slots_guardado: slotsGuard,
      },
    });
    if (error) {
      setSaving(false);
      setErr(error);
      return;
    }
    const idsMerged = mergeIdsCartasComObrigatorias(raca, classesList, pcCartas.map((x) => x.id_carta));
    const { error: errCartas } = await substituirCartasPersonagem(id, idsMerged);
    setSaving(false);
    if (errCartas) setErr(errCartas);
    else nav(`/ficha/${id}`);
  }

  if (loading && !personagem) {
    return (
      <div className="app-shell">
        <p>Carregando…</p>
      </div>
    );
  }
  if (err && !personagem) {
    return (
      <div className="app-shell">
        <p className="error-msg">{err}</p>
        <Link to="/">Painel</Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to={id ? `/ficha/${id}` : "/"} style={{ color: "#e8dcc8" }}>
          ← Ficha
        </Link>
      </header>

      <div className="sheet-paper">
        <h1 className="sheet-title">Editar ficha</h1>
        <p className="help">
          Atributos base ficam entre 0 e {ATTR_MAX_BASE}; cartas podem aumentar os valores efetivos. Classes já
          ligadas: {classesList.map((c) => c.nome_classe).join(", ") || "—"}. Cartas e demais campos só são gravados
          ao clicar em <strong>Salvar alterações</strong>.
        </p>

        {err ? <p className="error-msg">{err}</p> : null}

        <form onSubmit={onSubmit} className="sheet-grid">
          <div className="field">
            <label htmlFor="enome">Nome</label>
            <input id="enome" value={nome} onChange={(e) => setNome(e.target.value)} required minLength={2} />
          </div>
          <div className="field">
            <label htmlFor="eidade">Idade</label>
            <input
              id="eidade"
              inputMode="numeric"
              value={idade}
              onChange={(e) => setIdade(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="edesc">Descrição</label>
            <textarea id="edesc" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} />
          </div>

          <h3 style={{ gridColumn: "1 / -1", marginBottom: 0 }}>Atributos base (máx. {ATTR_MAX_BASE})</h3>
          <div className="sheet-grid sheet-grid-2" style={{ gridColumn: "1 / -1" }}>
            {ATTR_KEYS.map((k) => (
              <div key={k} className="field">
                <label htmlFor={`a-${k}`}>{ATTR_LABEL[k]}</label>
                <input
                  id={`a-${k}`}
                  type="number"
                  min={0}
                  max={ATTR_MAX_BASE}
                  value={attrs[k]}
                  onChange={(e) =>
                    setAttrs((prev) => ({
                      ...prev,
                      [k]: Math.min(ATTR_MAX_BASE, Math.max(0, parseInt(e.target.value, 10) || 0)),
                    }))
                  }
                />
              </div>
            ))}
          </div>

          {attrsEfetivos ? (
            <div style={{ gridColumn: "1 / -1" }} className="stat-block">
              <strong>Efetivos (base + cartas)</strong>
              <div className="sheet-grid sheet-grid-2" style={{ marginTop: "0.5rem" }}>
                {ATTR_KEYS.map((k) => (
                  <div key={k}>
                    {ATTR_LABEL[k]}: <strong>{attrsEfetivos[k]}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <h3 style={{ gridColumn: "1 / -1", marginBottom: 0 }}>Combate e recurso</h3>
          <div className="field">
            <label>Vida atual</label>
            <input
              type="number"
              min={0}
              value={vidaAtual}
              onChange={(e) => setVidaAtual(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="field">
            <label>Energia atual</label>
            <input
              type="number"
              min={0}
              value={energiaAtual}
              onChange={(e) => setEnergiaAtual(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="field">
            <label>Bloqueio</label>
            <input type="number" min={0} value={bloqueio} onChange={(e) => setBloqueio(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="field">
            <label>Deslocamento (m)</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={deslocamento}
              onChange={(e) => setDeslocamento(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="field">
            <label>Cicatrizes</label>
            <input
              type="number"
              min={0}
              max={5}
              value={cicatrizes}
              onChange={(e) => setCicatrizes(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="field">
            <label>Ligação</label>
            <input
              type="number"
              min={0}
              max={20}
              value={ligacao}
              onChange={(e) => setLigacao(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          <h3 style={{ gridColumn: "1 / -1", marginBottom: 0 }}>Inventário (espaços)</h3>
          <div className="field">
            <label>Em mãos</label>
            <input type="number" min={0} value={slotsMaos} onChange={(e) => setSlotsMaos(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="field">
            <label>Equipado</label>
            <input type="number" min={0} value={slotsEq} onChange={(e) => setSlotsEq(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="field">
            <label>Acesso rápido</label>
            <input type="number" min={0} value={slotsRap} onChange={(e) => setSlotsRap(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="field">
            <label>Guardado</label>
            <input
              type="number"
              min={0}
              value={slotsGuard}
              onChange={(e) => setSlotsGuard(parseInt(e.target.value, 10) || 0)}
            />
          </div>

          {id && personagem && raca ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <HabilidadesPainelAoVivo
                attrsBase={attrs}
                raca={raca}
                classesList={classesList}
                cartas={pcCartas}
                onCartasChange={setPcCartas}
                podeAdicionar={async (idCarta) =>
                  podeAprenderCartaDraft(
                    raca.id_raca,
                    classesList.map((c) => c.id_classe),
                    pcCartas.map((x) => x.id_carta),
                    idCarta
                  )
                }
                idsCartasFixas={idsCartasFixasEdit}
                titulo="Habilidades — detalhe completo"
                helpText="Alterações nas cartas entram no banco junto com o botão Salvar alterações abaixo."
              />
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", gridColumn: "1 / -1" }}>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
            <Link className="btn secondary" to={id ? `/ficha/${id}` : "/"}>
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
