(function () {
  const STORAGE_KEY = "criadorFichaV2";
  const STORAGE_LEGACY = "criadorFichaV1";

  const ATTR_LABELS = {
    corpo: "Corpo",
    mente: "Mente",
    alma: "Alma",
    destreza: "Destreza",
    conhecimento: "Conhecimento",
    foco: "Foco",
  };

  const data = window.GAME_DATA;
  const catalog = window.CATALOG;
  if (!data || !catalog) {
    console.error("GAME_DATA ou CATALOG em falta — carregue data.js e catalog.js");
    return;
  }

  /** @type {{ nome: string, idade: string, localOrigem: string, descricao: string, racaId: string, classeId: string, livres: Record<string, number>, origensExtra: string[], skillIds: string[], condicoesAtivas: { id: string, acumulo: number }[], vida: number | null, energia: number | null, cicatrizes: number, deslocamento: number, bloqueio: number, esquiva: number }} */
  let state = structuredClone(initialState());

  function initialState() {
    const r0 = data.racas[0]?.id ?? "";
    const c0 = data.classes[0]?.id ?? "";
    return {
      nome: "",
      idade: "",
      localOrigem: "",
      descricao: "",
      racaId: r0,
      classeId: c0,
      livres: emptyAttrs(),
      origensExtra: [],
      skillIds: [],
      condicoesAtivas: [],
      vida: null,
      energia: null,
      cicatrizes: 0,
      deslocamento: 3,
      bloqueio: 0,
      esquiva: 6,
    };
  }

  function emptyAttrs() {
    return Object.fromEntries(data.atributos.map((a) => [a, 0]));
  }

  function getRaca() {
    return data.racas.find((r) => r.id === state.racaId) ?? data.racas[0];
  }

  function getClasse() {
    return data.classes.find((c) => c.id === state.classeId) ?? data.classes[0];
  }

  function origensFixas() {
    const r = getRaca();
    const c = getClasse();
    return [...(r.origens || []), ...(c.origens || [])].map((x) => x.trim()).filter(Boolean);
  }

  function origensFixasLower() {
    return new Set(origensFixas().map((x) => x.toLowerCase()));
  }

  /** Conjunto de todas as origens ativas (raça + classe + extras selecionadas). */
  function activeOrigensSet() {
    const s = new Set(origensFixas().map((x) => x.toLowerCase()));
    for (const o of state.origensExtra || []) {
      if (o && o.trim()) s.add(o.trim().toLowerCase());
    }
    return s;
  }

  function sumAttrs(a, b) {
    const out = { ...emptyAttrs() };
    for (const k of data.atributos) {
      out[k] = (a[k] || 0) + (b[k] || 0);
    }
    return out;
  }

  function totalAttrs() {
    const r = getRaca();
    const c = getClasse();
    const base = sumAttrs(r.attrs, c.attrs);
    const liv = state.livres || emptyAttrs();
    if (r.tecnicaLivre) {
      for (const k of data.atributos) base[k] += liv[k] || 0;
    }
    return base;
  }

  function livresSum() {
    let s = 0;
    for (const k of data.atributos) s += state.livres[k] || 0;
    return s;
  }

  function livresTarget() {
    return getRaca().tecnicaLivre || 0;
  }

  function isTreinamento(skill) {
    return (skill.tipo || "").toLowerCase().includes("treinamento");
  }

  function hasOrigemLivre(skill) {
    return (skill.origens || []).some((o) => {
      const t = o.trim().toLowerCase();
      return t === "livre" || t === "origem livre";
    });
  }

  function skillAllowed(skill) {
    if (isTreinamento(skill)) return true;
    if (hasOrigemLivre(skill)) return true;
    const os = skill.origens || [];
    if (os.length === 0) return true;
    const act = activeOrigensSet();
    return os.some((o) => act.has(o.trim().toLowerCase()));
  }

  function pruneInvalidSkills() {
    const allowed = new Set(
      catalog.habilidades.filter(skillAllowed).map((s) => s.id)
    );
    state.skillIds = (state.skillIds || []).filter((id) => allowed.has(id));
  }

  function suggestedVida() {
    const r = getRaca();
    const c = getClasse();
    return (r.vidaBase || 0) + (c.vidaBase || 0) + totalAttrs().corpo;
  }

  function suggestedEnergia() {
    const r = getRaca();
    const c = getClasse();
    return (r.energiaBase || 0) + (c.energiaBase || 0) + totalAttrs().alma;
  }

  function suggestedEsquiva() {
    return 6 + totalAttrs().destreza;
  }

  function el(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Texto da linha do option (origem, custo, modo…). */
  function skillOptionLabel(s) {
    const orig = s.origens && s.origens.length ? s.origens.join(" · ") : "—";
    const custo = s.custo || "—";
    const modo = s.modo || "—";
    const tempo = s.tempo || "—";
    const alc = s.alcance || "—";
    return `${s.nome}  |  ${s.tipo || "?"}  |  Origem: ${orig}  |  Custo: ${custo}  |  ${modo}  ·  ${tempo}  ·  ${alc}`;
  }

  function skillOptionTitle(s) {
    const head = skillOptionLabel(s);
    const body = (s.descricao || "").trim().replace(/\s+/g, " ");
    return [head, body].filter(Boolean).join(" — ").slice(0, 2800);
  }

  function clearSkillDetail() {
    el("skill-detail-placeholder").classList.remove("hidden");
    el("skill-detail-body").classList.add("hidden");
  }

  function showSkillDetail(skillId) {
    const s = skillById(skillId);
    if (!s) {
      clearSkillDetail();
      return;
    }
    el("skill-detail-placeholder").classList.add("hidden");
    el("skill-detail-body").classList.remove("hidden");
    el("skill-detail-nome").textContent = s.nome;
    el("skill-detail-tipo").textContent = s.tipo || "—";

    const rows = [
      ["Origem", (s.origens && s.origens.length ? s.origens.join(", ") : "—")],
      ["Custo", s.custo || "—"],
      ["Modo de uso", s.modo || "—"],
      ["Tempo de uso", s.tempo || "—"],
      ["Alcance", s.alcance || "—"],
    ];
    el("skill-detail-meta").innerHTML = rows
      .map(
        ([k, v]) =>
          `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`
      )
      .join("");
    el("skill-detail-text").textContent = (s.descricao || "").trim() || "—";
  }

  function updateSkillDetailFromSelection() {
    const d = el("skills-disponiveis");
    const k = el("skills-deck");
    const pick = d.selectedOptions[0] || k.selectedOptions[0];
    if (pick && pick.value) {
      showSkillDetail(pick.value);
    } else {
      clearSkillDetail();
    }
  }

  function populateSelects() {
    el("raca").innerHTML = data.racas
      .map((r) => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.nome)}</option>`)
      .join("");
    el("classe").innerHTML = data.classes
      .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`)
      .join("");
  }

  function renderAttrsDisplay() {
    const t = totalAttrs();
    el("attrs-display").innerHTML = data.atributos
      .map(
        (k) => `
      <div class="attr-cell">
        <span class="k">${ATTR_LABELS[k]}</span>
        <span class="v">${t[k]}</span>
      </div>`
      )
      .join("");
  }

  function renderLivres() {
    const r = getRaca();
    const wrap = el("livres-wrap");
    const inputs = el("livres-inputs");
    const tgt = livresTarget();
    if (!tgt) {
      wrap.classList.add("hidden");
      return;
    }
    wrap.classList.remove("hidden");
    el("livres-total").textContent = String(tgt);
    inputs.innerHTML = data.atributos
      .map(
        (k) => `
      <label class="attr-cell" style="cursor:pointer">
        <span class="k">${ATTR_LABELS[k]}</span>
        <input type="number" min="0" max="${tgt}" data-livre="${k}" value="${state.livres[k] || 0}" style="width:100%;text-align:center;border:none;background:transparent;font-size:1.1rem;font-weight:700;color:var(--gold)" />
      </label>`
      )
      .join("");
    inputs.querySelectorAll("[data-livre]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const k = inp.getAttribute("data-livre");
        let v = parseInt(inp.value, 10) || 0;
        if (v < 0) v = 0;
        state.livres[k] = v;
        const sum = livresSum();
        const max = livresTarget();
        if (sum > max) {
          state.livres[k] = Math.max(0, (state.livres[k] || 0) - (sum - max));
          inp.value = String(state.livres[k]);
        }
        updateLivresSum();
        afterAttrsChange();
      });
    });
    updateLivresSum();
  }

  function updateLivresSum() {
    const sumEl = el("livres-sum");
    if (!sumEl) return;
    const tgt = livresTarget();
    const sum = livresSum();
    sumEl.textContent = `Pontos usados: ${sum} / ${tgt}`;
    sumEl.classList.remove("ok", "bad");
    sumEl.classList.add(sum === tgt ? "ok" : "bad");
  }

  /** Lista do catálogo + origens fixas da ficha que possam não aparecer nas cartas. */
  function allOrigensForUI() {
    const seen = new Set();
    const out = [];
    for (const o of catalog.origens) {
      const lk = o.toLowerCase();
      if (!seen.has(lk)) {
        seen.add(lk);
        out.push(o);
      }
    }
    for (const o of origensFixas()) {
      const lk = o.toLowerCase();
      if (!seen.has(lk)) {
        seen.add(lk);
        out.push(o);
      }
    }
    return out.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  function filterOrigensList(q) {
    const qq = (q || "").trim().toLowerCase();
    return allOrigensForUI().filter((o) => !qq || o.toLowerCase().includes(qq));
  }

  function renderOrigensGrid() {
    const q = el("origens-busca").value;
    const list = filterOrigensList(q);
    const locked = origensFixasLower();
    const extraLower = new Set((state.origensExtra || []).map((x) => x.trim().toLowerCase()));

    el("origens-grid").innerHTML = list
      .map((o) => {
        const lk = o.toLowerCase();
        const isLocked = locked.has(lk);
        const checked = isLocked || extraLower.has(lk);
        const id = `og-${lk.replace(/[^a-z0-9]+/g, "-")}`;
        return `
        <label class="origem-cb ${isLocked ? "locked" : ""}">
          <input type="checkbox" id="${id}" data-origem="${escapeHtml(o)}" ${checked ? "checked" : ""} ${isLocked ? "disabled" : ""} />
          <span>${escapeHtml(o)}</span>
          ${isLocked ? '<span class="tag">raça/classe</span>' : ""}
        </label>`;
      })
      .join("");

    el("origens-grid").querySelectorAll('input[type="checkbox"][data-origem]').forEach((inp) => {
      if (inp.disabled) return;
      inp.addEventListener("change", () => {
        const name = inp.getAttribute("data-origem");
        const lk = name.toLowerCase();
        if (inp.checked) {
          if (!state.origensExtra.some((x) => x.toLowerCase() === lk)) state.origensExtra.push(name);
        } else {
          state.origensExtra = state.origensExtra.filter((x) => x.toLowerCase() !== lk);
        }
        save();
        afterOrigensChange();
      });
    });
  }

  function syncOrigensExtraFromState() {
    const locked = origensFixasLower();
    state.origensExtra = (state.origensExtra || []).filter((x) => x && !locked.has(x.trim().toLowerCase()));
  }

  function skillById(id) {
    return catalog.habilidades.find((s) => s.id === id);
  }

  function renderSkillsFilterHint() {
    const n = activeOrigensSet().size;
    const avail = catalog.habilidades.filter(skillAllowed).length;
    el("skills-filter-hint").textContent =
      `Origens ativas: ${n} · Habilidades que cumprem o filtro: ${avail} de ${catalog.habilidades.length} (inclui Livre, Treinamento ou sem origem na carta).`;
  }

  function renderSkillSelects() {
    const q = (el("skills-busca").value || "").trim().toLowerCase();
    const deckSet = new Set(state.skillIds);
    const avail = catalog.habilidades
      .filter((s) => skillAllowed(s) && !deckSet.has(s.id))
      .filter((s) => !q || (s.nome || "").toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const deck = state.skillIds
      .map((id) => skillById(id))
      .filter(Boolean)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const sd = el("skills-disponiveis");
    const sk = el("skills-deck");
    const optHtml = (s) => {
      const label = skillOptionLabel(s);
      const title = escapeHtml(skillOptionTitle(s));
      return `<option value="${escapeHtml(s.id)}" title="${title}">${escapeHtml(label)}</option>`;
    };
    sd.innerHTML = avail.map(optHtml).join("");
    sk.innerHTML = deck.map(optHtml).join("");
    updateSkillDetailFromSelection();
  }

  function moveSelected(from, to, add) {
    const a = el(from);
    const sel = [...a.selectedOptions].map((o) => o.value);
    if (add) {
      for (const id of sel) {
        if (!state.skillIds.includes(id)) state.skillIds.push(id);
      }
    } else {
      const rem = new Set(sel);
      state.skillIds = state.skillIds.filter((id) => !rem.has(id));
    }
    save();
    renderSkillSelects();
    updateHud();
  }

  function renderCondPicker() {
    const activeIds = new Set(state.condicoesAtivas.map((c) => c.id));
    const opts = catalog.condicoes
      .filter((c) => !activeIds.has(c.id))
      .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`)
      .join("");
    el("cond-picker").innerHTML = `<option value="">— escolher condição —</option>` + opts;
  }

  function renderCondicoesAtivas() {
    const box = el("condicoes-ativas");
    box.innerHTML = state.condicoesAtivas
      .map((entry) => {
        const c = catalog.condicoes.find((x) => x.id === entry.id);
        if (!c) return "";
        const cid = escapeHtml(entry.id);
        const acNote = c.permiteAcumulo
          ? '<span class="ac-note">Guia menciona acúmulos.</span>'
          : '<span class="ac-note">Ajuste livre se a mesa usar acúmulos.</span>';
        return `
        <div class="cond-card" data-cond-id="${cid}">
          <header>
            <span class="nome">${escapeHtml(c.nome)}</span>
            <button type="button" class="btn-icon" data-remove-cond="${cid}" aria-label="Remover">✕</button>
          </header>
          <p class="desc">${escapeHtml(c.descricao || "—")}</p>
          <div class="ac-wrap">
            <span>Acúmulos</span>
            <input type="number" class="acumulo-input" min="0" step="1" data-cond-id="${cid}" value="${Number(entry.acumulo) || 0}" />
            ${acNote}
          </div>
        </div>`;
      })
      .join("");

    box.querySelectorAll("[data-remove-cond]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-remove-cond");
        const i = state.condicoesAtivas.findIndex((e) => e.id === id);
        if (i >= 0) state.condicoesAtivas.splice(i, 1);
        save();
        renderCondPicker();
        renderCondicoesAtivas();
      });
    });

    function syncAcumuloFromInput(inp) {
      const id = inp.getAttribute("data-cond-id");
      const entry = state.condicoesAtivas.find((e) => e.id === id);
      if (!entry) return;
      let v = parseInt(String(inp.value).trim(), 10);
      if (!Number.isFinite(v)) v = 0;
      if (v < 0) v = 0;
      entry.acumulo = v;
      inp.value = String(v);
      save();
    }

    box.querySelectorAll("input.acumulo-input[data-cond-id]").forEach((inp) => {
      inp.addEventListener("input", () => syncAcumuloFromInput(inp));
      inp.addEventListener("change", () => syncAcumuloFromInput(inp));
    });
  }

  function addCondicao() {
    const id = el("cond-picker").value;
    if (!id) return;
    if (state.condicoesAtivas.some((c) => c.id === id)) return;
    const cdef = catalog.condicoes.find((c) => c.id === id);
    state.condicoesAtivas.push({ id, acumulo: 0 });
    save();
    renderCondPicker();
    renderCondicoesAtivas();
  }

  function refreshDerived() {
    renderAttrsDisplay();
    renderLivres();
    el("raca-nota").textContent = getRaca().nota || "";
    const c = getClasse();
    el("classe-baralho").textContent = c.baralho ? `Baralho: ${c.baralho}` : c.nota || "";
    el("esquiva-sugestao").textContent = `Esquiva sugerida (6 + Destreza): ${suggestedEsquiva()}`;
    renderOrigensGrid();
    renderSkillsFilterHint();
    renderSkillSelects();
    updateHud();
  }

  function afterAttrsChange() {
    save();
    refreshDerived();
  }

  function afterOrigensChange() {
    pruneInvalidSkills();
    save();
    refreshDerived();
  }

  function bindFormFields() {
    const fields = [
      ["nome", "nome"],
      ["idade", "idade"],
      ["localOrigem", "localOrigem"],
      ["descricao", "descricao"],
      ["vida", "vida", "number"],
      ["energia", "energia", "number"],
      ["cicatrizes", "cicatrizes", "number"],
      ["deslocamento", "deslocamento", "number"],
      ["bloqueio", "bloqueio", "number"],
      ["esquiva", "esquiva", "number"],
    ];
    for (const [id, key, type] of fields) {
      const node = el(id);
      if (!node) continue;
      node.addEventListener("input", () => {
        if (type === "number") {
          const n = parseFloat(node.value);
          state[key] = Number.isFinite(n) ? n : null;
        } else {
          state[key] = node.value;
        }
        save();
        updateHud();
      });
    }
  }

  function syncFormFromState() {
    el("nome").value = state.nome;
    el("idade").value = state.idade;
    el("localOrigem").value = state.localOrigem;
    el("descricao").value = state.descricao;
    el("raca").value = state.racaId;
    el("classe").value = state.classeId;
    el("vida").value = state.vida ?? "";
    el("energia").value = state.energia ?? "";
    el("cicatrizes").value = state.cicatrizes;
    el("deslocamento").value = state.deslocamento;
    el("bloqueio").value = state.bloqueio;
    el("esquiva").value = state.esquiva;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function migrateLegacy(raw) {
    try {
      const o = JSON.parse(raw);
      const st = initialState();
      st.nome = o.nome || "";
      st.idade = o.idade || "";
      st.localOrigem = o.localOrigem || "";
      st.descricao = o.descricao || "";
      st.racaId = data.racas.find((r) => r.id === o.racaId) ? o.racaId : st.racaId;
      st.classeId = data.classes.find((c) => c.id === o.classeId) ? o.classeId : st.classeId;
      st.livres = { ...emptyAttrs(), ...(o.livres || {}) };
      st.origensExtra = [...(o.origensAdicionais || [])];
      st.vida = o.vida != null ? o.vida : null;
      st.energia = o.energia != null ? o.energia : null;
      st.cicatrizes = o.cicatrizes ?? 0;
      st.deslocamento = o.deslocamento ?? 3;
      st.bloqueio = o.bloqueio ?? 0;
      st.esquiva = o.esquiva ?? 6;
      if (Array.isArray(o.habilidades)) {
        st.skillIds = [];
        for (const name of o.habilidades) {
          const sk = catalog.habilidades.find(
            (s) => s.nome.trim().toLowerCase() === String(name).trim().toLowerCase()
          );
          if (sk) st.skillIds.push(sk.id);
        }
      }
      if (Array.isArray(o.condicoes)) {
        st.condicoesAtivas = [];
        for (const nome of o.condicoes) {
          const c = catalog.condicoes.find(
            (x) => x.nome.toLowerCase() === String(nome).trim().toLowerCase()
          );
          if (c) st.condicoesAtivas.push({ id: c.id, acumulo: 0 });
        }
      }
      syncOrigensExtraFromState();
      pruneInvalidSkills();
      return st;
    } catch {
      return null;
    }
  }

  function load() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const leg = localStorage.getItem(STORAGE_LEGACY);
        if (leg) {
          const m = migrateLegacy(leg);
          if (m) {
            state = m;
            save();
            return true;
          }
        }
        return false;
      }
      const o = JSON.parse(raw);
      state = { ...initialState(), ...o, livres: { ...emptyAttrs(), ...(o.livres || {}) } };
      state.origensExtra = [...(o.origensExtra || [])];
      state.skillIds = [...(o.skillIds || [])];
      state.condicoesAtivas = [...(o.condicoesAtivas || [])].map((x) => ({
        id: x.id,
        acumulo: Math.max(0, parseInt(x.acumulo, 10) || 0),
      }));
      if (!data.racas.find((r) => r.id === state.racaId)) state.racaId = data.racas[0].id;
      if (!data.classes.find((c) => c.id === state.classeId)) state.classeId = data.classes[0].id;
      syncOrigensExtraFromState();
      pruneInvalidSkills();
      return true;
    } catch {
      return false;
    }
  }

  function updateHud() {
    el("hud-raca").textContent = getRaca().nome;
    el("hud-classe").textContent = getClasse().nome;
    el("hud-vida").textContent = state.vida != null ? String(state.vida) : "—";
    el("hud-energia").textContent = state.energia != null ? String(state.energia) : "—";
    el("hud-deck-count").textContent = String(state.skillIds.length);
    el("hud-origens-count").textContent = String(activeOrigensSet().size);
  }

  function recalcPools() {
    state.vida = suggestedVida();
    state.energia = suggestedEnergia();
    state.esquiva = suggestedEsquiva();
    syncFormFromState();
    save();
    refreshDerived();
  }

  function init() {
    populateSelects();
    load();
    syncFormFromState();
    bindFormFields();

    el("raca").addEventListener("change", () => {
      state.racaId = el("raca").value;
      if (!getRaca().tecnicaLivre) state.livres = emptyAttrs();
      syncOrigensExtraFromState();
      pruneInvalidSkills();
      save();
      recalcPools();
    });
    el("classe").addEventListener("change", () => {
      state.classeId = el("classe").value;
      syncOrigensExtraFromState();
      pruneInvalidSkills();
      save();
      recalcPools();
    });

    el("origens-busca").addEventListener("input", () => renderOrigensGrid());

    el("skills-busca").addEventListener("input", () => renderSkillSelects());
    el("skills-disponiveis").addEventListener("change", updateSkillDetailFromSelection);
    el("skills-deck").addEventListener("change", updateSkillDetailFromSelection);
    el("skills-disponiveis").addEventListener("click", updateSkillDetailFromSelection);
    el("skills-deck").addEventListener("click", updateSkillDetailFromSelection);
    el("btn-skill-add").addEventListener("click", () =>
      moveSelected("skills-disponiveis", "skills-deck", true)
    );
    el("btn-skill-remove").addEventListener("click", () =>
      moveSelected("skills-deck", "skills-disponiveis", false)
    );

    el("btn-recalc").addEventListener("click", recalcPools);

    el("btn-cond-add").addEventListener("click", addCondicao);

    el("btn-save").addEventListener("click", () => {
      save();
      const b = el("btn-save");
      b.textContent = "Salvo!";
      setTimeout(() => {
        b.textContent = "Salvar rascunho";
      }, 1200);
    });
    el("btn-reset").addEventListener("click", () => {
      if (!confirm("Apagar o rascunho e recomeçar?")) return;
      state = initialState();
      state.livres = emptyAttrs();
      save();
      syncFormFromState();
      renderCondPicker();
      renderCondicoesAtivas();
      refreshDerived();
    });

    renderCondPicker();
    renderCondicoesAtivas();

    if (state.vida == null || state.energia == null) {
      recalcPools();
    } else {
      refreshDerived();
    }
  }

  init();
})();
