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
  const itemsData = window.ITEMS_CATALOG || { itens: [] };
  if (!data || !catalog) {
    console.error("GAME_DATA ou CATALOG em falta — carregue data.js e catalog.js");
    return;
  }

  const SLOT_ORDER = ["emMaos", "equipado", "acessoRapido", "guardado"];
  const SLOT_TITLE = {
    emMaos: "Em mãos",
    equipado: "Equipado",
    acessoRapido: "Acesso rápido",
    guardado: "Guardado",
  };
  const SLOT_HINT = {
    emMaos:
      "Itens em mãos: uso ativo a qualquer momento. Único espaço onde o item pode ser usado ativamente (não só passivo).",
    equipado:
      "Armaduras, mochilas, amuletos: efeitos em geral passivos. Ação para vestir/tirar. Uso ativo só se estiver também em mãos.",
    acessoRapido: "Coldres, munição à vista, etc. Acesso gastando uma reação.",
    guardado: "Mochila e compartimentos. Acesso gastando uma ação.",
  };

  function defaultInventarioSlots() {
    return { emMaos: 2, equipado: 4, acessoRapido: 0, guardado: 4 };
  }

  /** Rascunhos antigos usavam equipado/bolsos/mochila com significados diferentes. */
  function isLegacyInventarioSlots(raw) {
    if (!raw || typeof raw !== "object") return false;
    return "mochila" in raw || "bolsos" in raw;
  }

  function normalizeInventarioSlots(raw) {
    const d = defaultInventarioSlots();
    if (!raw || typeof raw !== "object") return d;
    if (isLegacyInventarioSlots(raw)) {
      return {
        emMaos: raw.equipado != null ? Number(raw.equipado) : d.emMaos,
        equipado: d.equipado,
        acessoRapido: raw.bolsos != null ? Number(raw.bolsos) : d.acessoRapido,
        guardado: raw.mochila != null ? Number(raw.mochila) : d.guardado,
      };
    }
    return {
      emMaos: raw.emMaos != null ? Number(raw.emMaos) : d.emMaos,
      equipado: raw.equipado != null ? Number(raw.equipado) : d.equipado,
      acessoRapido: raw.acessoRapido != null ? Number(raw.acessoRapido) : d.acessoRapido,
      guardado: raw.guardado != null ? Number(raw.guardado) : d.guardado,
    };
  }

  function mapLegacyItemSlot(slot, invLegacy) {
    if (SLOT_ORDER.includes(slot)) return slot;
    if (invLegacy) {
      if (slot === "equipado") return "emMaos";
      if (slot === "bolsos") return "acessoRapido";
      if (slot === "mochila") return "guardado";
    }
    return "guardado";
  }

  let selectedInvUid = null;

  /** Última habilidade focada nas listas (painel de detalhe). */
  let skillDetailFocusId = null;

  const SKILL_FILTER_EMPTY = "__empty__";

  /** @type {{ nome: string, idade: string, localOrigem: string, descricao: string, racaId: string, classeId: string, livres: Record<string, number>, origensExtra: string[], skillIds: string[], condicoesAtivas: { id: string, acumulo: number }[], vida: number | null, energia: number | null, cicatrizes: number, deslocamento: number, bloqueio: number, esquiva: number, inventarioSlots: { emMaos: number, equipado: number, acessoRapido: number, guardado: number }, inventario: { uid: string, itemId: string, slot: string, qtd: number }[] }} */
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
      inventarioSlots: defaultInventarioSlots(),
      inventario: [],
    };
  }

  function emptyAttrs() {
    return Object.fromEntries(data.atributos.map((a) => [a, 0]));
  }

  function itensLista() {
    return itemsData.itens || [];
  }

  function itemDefById(id) {
    return itensLista().find((x) => x.id === id);
  }

  function newInvUid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "inv-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function espacosPara(itemId, qtd) {
    const def = itemDefById(itemId);
    const qpe = def && def.qtdPorEspaco > 0 ? def.qtdPorEspaco : 1;
    const q = Math.max(1, parseInt(String(qtd), 10) || 1);
    return Math.ceil(q / qpe);
  }

  function espacosUsadosSlot(slot) {
    let u = 0;
    for (const e of state.inventario || []) {
      if (e.slot !== slot) continue;
      u += espacosPara(e.itemId, e.qtd);
    }
    return u;
  }

  function limiteSlot(slot) {
    const s = state.inventarioSlots || {};
    const n = parseInt(String(s[slot]), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  /** 0 = sem teto (mesa ajusta). */
  function slotCheio(slot) {
    const lim = limiteSlot(slot);
    if (lim === 0) return false;
    return espacosUsadosSlot(slot) > lim;
  }

  function pruneInventario() {
    const valid = new Set(itensLista().map((x) => x.id));
    state.inventario = (state.inventario || []).filter((e) => e && valid.has(e.itemId));
  }

  function itemOptionLabel(it) {
    const t = it.tipo || "—";
    const p = it.preco || "—";
    return `${it.nome}  |  ${t}  |  ${p}`;
  }

  function itemOptionTitle(it) {
    const bits = [itemOptionLabel(it), (it.habilidade || "").trim(), (it.descricao || "").trim()].filter(Boolean);
    return bits.join(" — ").slice(0, 2600);
  }

  function clearInvDetail() {
    el("inv-detail-placeholder").classList.remove("hidden");
    el("inv-detail-body").classList.add("hidden");
  }

  function showInvDetailForUid(uid) {
    const entry = (state.inventario || []).find((e) => e.uid === uid);
    const it = entry && itemDefById(entry.itemId);
    if (!entry || !it) {
      clearInvDetail();
      return;
    }
    el("inv-detail-placeholder").classList.add("hidden");
    el("inv-detail-body").classList.remove("hidden");
    el("inv-detail-nome").textContent = it.nome;
    el("inv-detail-tipo").textContent = it.tipo || "—";
    const rows = [
      ["No inventário", `${entry.qtd} · ${SLOT_TITLE[entry.slot] || entry.slot}`],
      ["Alcance (item)", it.alcance || "—"],
      ["Empunhadura", it.empunhadura || "—"],
      ["Tempo de uso", it.tempoUso || "—"],
      ["Preço (guia)", it.preco || "—"],
      ["Qtd. / espaço", String(it.qtdPorEspaco ?? 1)],
      ["Efeito (campo Habilidade)", it.habilidade || "—"],
    ];
    el("inv-detail-meta").innerHTML = rows
      .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`)
      .join("");
    el("inv-detail-text").textContent = (it.descricao || "").trim() || "—";
  }

  function renderInvPicker() {
    const q = (el("inv-busca").value || "").trim().toLowerCase();
    const list = itensLista()
      .filter((it) => !q || (it.nome || "").toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const sel = el("inv-picker");
    const prev = sel.value;
    sel.innerHTML = list
      .map((it) => {
        const label = escapeHtml(itemOptionLabel(it));
        const title = escapeHtml(itemOptionTitle(it));
        return `<option value="${escapeHtml(it.id)}" title="${title}">${label}</option>`;
      })
      .join("");
    if (prev && list.some((x) => x.id === prev)) sel.value = prev;
    else if (list[0]) sel.value = list[0].id;
  }

  function renderInvColumns() {
    const capEl = el("inv-cap-hint");
    const parts = [];
    let anyOver = false;
    for (const slot of SLOT_ORDER) {
      const lim = limiteSlot(slot);
      const used = espacosUsadosSlot(slot);
      const label = SLOT_TITLE[slot];
      if (lim === 0) parts.push(`${label}: ${used} espaços (sem limite definido)`);
      else {
        parts.push(`${label}: ${used} / ${lim}`);
        if (used > lim) anyOver = true;
      }
    }
    capEl.textContent = parts.join(" · ");
    capEl.classList.toggle("bad", anyOver);

    const box = el("inv-columns");
    box.innerHTML = SLOT_ORDER.map((slot) => {
      const lim = limiteSlot(slot);
      const used = espacosUsadosSlot(slot);
      const over = lim > 0 && used > lim;
      const entries = (state.inventario || []).filter((e) => e.slot === slot);
      const lines = entries
        .map((e) => {
          const def = itemDefById(e.itemId);
          const nome = def ? def.nome : "(item desconhecido)";
          const sp = espacosPara(e.itemId, e.qtd);
          const uid = escapeHtml(e.uid);
          const opts = SLOT_ORDER.map((s) => {
            const sel = s === e.slot ? " selected" : "";
            return `<option value="${s}"${sel}>${SLOT_TITLE[s]}</option>`;
          }).join("");
          const selClass = e.uid === selectedInvUid ? "inv-line selected" : "inv-line";
          return `
            <div class="${selClass}" data-inv-line="${uid}" tabindex="0" role="button">
              <span class="iname">${escapeHtml(nome)}</span>
              <div class="irow2">
                <label style="font-size:0.78rem;color:var(--muted)">Qtd
                  <input type="number" min="1" step="1" data-inv-qtd="${uid}" value="${Number(e.qtd) || 1}" />
                </label>
                <span style="font-size:0.75rem;color:var(--muted)">${sp} espaço(s)</span>
                <select data-inv-move="${uid}" aria-label="Mover para">${opts}</select>
                <button type="button" class="btn-icon-sm" data-inv-remove="${uid}" title="Remover">✕</button>
              </div>
            </div>`;
        })
        .join("");
      const capClass = over ? "cap over" : "cap";
      const limText = lim === 0 ? `${used} esp.` : `${used} / ${lim}`;
      return `
        <div class="inv-col" data-inv-slot="${slot}">
          <div class="inv-col-head">
            <strong>${SLOT_TITLE[slot]}</strong>
            <span class="${capClass}">${limText}</span>
          </div>
          <p class="inv-col-hint">${SLOT_HINT[slot]}</p>
          <div class="inv-lines">${lines || '<p class="hint" style="margin:0">Vazio.</p>'}</div>
        </div>`;
    }).join("");

    box.querySelectorAll("[data-inv-line]").forEach((line) => {
      line.addEventListener("click", (ev) => {
        if (ev.target.closest("[data-inv-qtd], [data-inv-move], [data-inv-remove]")) return;
        const uid = line.getAttribute("data-inv-line");
        selectedInvUid = uid;
        box.querySelectorAll(".inv-line").forEach((x) => x.classList.remove("selected"));
        line.classList.add("selected");
        showInvDetailForUid(uid);
      });
    });

    box.querySelectorAll("input[data-inv-qtd]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const uid = inp.getAttribute("data-inv-qtd");
        const entry = state.inventario.find((x) => x.uid === uid);
        if (!entry) return;
        let v = parseInt(inp.value, 10);
        if (!Number.isFinite(v) || v < 1) v = 1;
        entry.qtd = v;
        inp.value = String(v);
        save();
        renderInvColumns();
        updateHud();
        if (selectedInvUid === uid) showInvDetailForUid(uid);
      });
    });

    box.querySelectorAll("select[data-inv-move]").forEach((sel) => {
      sel.addEventListener("change", () => {
        const uid = sel.getAttribute("data-inv-move");
        const entry = state.inventario.find((x) => x.uid === uid);
        if (!entry) return;
        entry.slot = sel.value;
        save();
        renderInvColumns();
        updateHud();
        if (selectedInvUid === uid) showInvDetailForUid(uid);
      });
    });

    box.querySelectorAll("[data-inv-remove]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const uid = btn.getAttribute("data-inv-remove");
        state.inventario = state.inventario.filter((x) => x.uid !== uid);
        if (selectedInvUid === uid) {
          selectedInvUid = null;
          clearInvDetail();
        }
        save();
        renderInvColumns();
        updateHud();
      });
    });
  }

  function addInventarioLinha() {
    if (!itensLista().length) return;
    const itemId = el("inv-picker").value;
    if (!itemId) return;
    const slot = el("inv-add-slot").value;
    let qtd = parseInt(el("inv-add-qtd").value, 10);
    if (!Number.isFinite(qtd) || qtd < 1) qtd = 1;
    if (!itemDefById(itemId)) return;
    state.inventario.push({ uid: newInvUid(), itemId, slot, qtd });
    save();
    renderInvColumns();
    updateHud();
  }

  function renderInventoryBlock() {
    renderInvPicker();
    renderInvColumns();
  }

  function syncInvSlotsFromState() {
    const s = normalizeInventarioSlots(state.inventarioSlots);
    state.inventarioSlots = s;
    el("inv-slot-em-maos").value = s.emMaos;
    el("inv-slot-equipado").value = s.equipado;
    el("inv-slot-acesso-rapido").value = s.acessoRapido;
    el("inv-slot-guardado").value = s.guardado;
  }

  function bindInvSlotInputs() {
    const ids = [
      ["inv-slot-em-maos", "emMaos"],
      ["inv-slot-equipado", "equipado"],
      ["inv-slot-acesso-rapido", "acessoRapido"],
      ["inv-slot-guardado", "guardado"],
    ];
    for (const [id, key] of ids) {
      el(id).addEventListener("input", () => {
        let n = parseInt(el(id).value, 10);
        if (!Number.isFinite(n) || n < 0) n = 0;
        state.inventarioSlots = state.inventarioSlots || {};
        state.inventarioSlots[key] = n;
        save();
        renderInvColumns();
        updateHud();
      });
    }
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

  function uniqueSortedStrings(values) {
    const u = [...new Set(values.map((x) => String(x).trim()).filter(Boolean))];
    u.sort((a, b) => a.localeCompare(b, "pt-BR"));
    return u;
  }

  function populateSkillFilterSelects() {
    const hs = catalog.habilidades;
    const modos = uniqueSortedStrings(hs.map((s) => s.modo || ""));
    const tipos = uniqueSortedStrings(hs.map((s) => s.tipo || ""));
    const tempos = uniqueSortedStrings(hs.map((s) => s.tempo || ""));
    const optAny = '<option value="">Qualquer</option>';
    const optBlank = `<option value="${SKILL_FILTER_EMPTY}">(em branco)</option>`;

    const oSel = el("skill-filter-origem");
    oSel.innerHTML =
      optAny +
      catalog.origens
        .map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`)
        .join("");

    const mSel = el("skill-filter-modo");
    mSel.innerHTML = optAny + optBlank + modos.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("");

    const tSel = el("skill-filter-tipo");
    tSel.innerHTML = optAny + optBlank + tipos.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");

    const tmSel = el("skill-filter-tempo");
    tmSel.innerHTML = optAny + optBlank + tempos.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("");
  }

  function matchScalarFilter(fieldVal, filterVal) {
    if (!filterVal) return true;
    const v = (fieldVal || "").trim();
    if (filterVal === SKILL_FILTER_EMPTY) return !v;
    return v.toLowerCase() === filterVal.toLowerCase();
  }

  function matchSkillMetaFilters(s) {
    const fo = el("skill-filter-origem").value.trim();
    if (fo) {
      const fl = fo.toLowerCase();
      if (!(s.origens || []).some((x) => x.trim().toLowerCase() === fl)) return false;
    }
    if (!matchScalarFilter(s.modo, el("skill-filter-modo").value)) return false;
    if (!matchScalarFilter(s.tipo, el("skill-filter-tipo").value)) return false;
    if (!matchScalarFilter(s.tempo, el("skill-filter-tempo").value)) return false;
    return true;
  }

  function getSkillNameQuery() {
    return (el("skills-busca").value || "").trim().toLowerCase();
  }

  function getAvailableSkillsFiltered() {
    const q = getSkillNameQuery();
    const deckSet = new Set(state.skillIds);
    return catalog.habilidades
      .filter((s) => skillAllowed(s) && !deckSet.has(s.id))
      .filter((s) => !q || (s.nome || "").toLowerCase().includes(q))
      .filter(matchSkillMetaFilters)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  function renderSkillsFilterHint() {
    const n = activeOrigensSet().size;
    const eleg = catalog.habilidades.filter(skillAllowed).length;
    const vis = getAvailableSkillsFiltered().length;
    el("skills-filter-hint").textContent =
      `Origens ativas na ficha: ${n} · Elegíveis (regra de origem): ${eleg} / ${catalog.habilidades.length} · Lista “Disponíveis” com nome + filtros: ${vis}. Livre, Treinamento ou carta sem origem contam como elegíveis.`;
  }

  function skillAvailRowHtml(s) {
    const ovs = s.origens || [];
    const show = ovs.slice(0, 3);
    const rest = ovs.length - show.length;
    const origChips = show
      .map((o) => `<span class="chip chip-o" title="${escapeHtml(o)}">${escapeHtml(o)}</span>`)
      .join("");
    const moreChip =
      rest > 0
        ? `<span class="chip chip-more" title="${escapeHtml(ovs.slice(3).join(", "))}">+${rest}</span>`
        : "";
    const modo = (s.modo || "").trim() || "—";
    const tipo = (s.tipo || "").trim() || "—";
    const tempo = (s.tempo || "").trim() || "—";
    const chips = [
      origChips,
      moreChip,
      `<span class="chip chip-mod">${escapeHtml(modo)}</span>`,
      `<span class="chip chip-tipo">${escapeHtml(tipo)}</span>`,
      `<span class="chip chip-tempo">${escapeHtml(tempo)}</span>`,
    ].join("");
    const active = skillDetailFocusId === s.id ? " is-active" : "";
    return `<li class="skill-pick-row${active}" data-skill-id="${escapeHtml(s.id)}">
      <label class="skill-pick-row-label">
        <input type="checkbox" class="skill-pick-cb" value="${escapeHtml(s.id)}" />
        <span class="skill-pick-body">
          <span class="skill-pick-name">${escapeHtml(s.nome)}</span>
          <span class="skill-pick-chips">${chips}</span>
        </span>
      </label>
    </li>`;
  }

  function skillDeckRowHtml(s) {
    const active = skillDetailFocusId === s.id ? " is-active" : "";
    const mini = `${(s.tipo || "").trim() || "—"} · ${(s.modo || "").trim() || "—"}`;
    return `<li class="skill-pick-row${active}" data-skill-id="${escapeHtml(s.id)}">
      <label class="skill-pick-row-label">
        <input type="checkbox" class="skill-pick-cb" value="${escapeHtml(s.id)}" />
        <span class="skill-pick-body">
          <span class="skill-pick-name">${escapeHtml(s.nome)}</span>
          <span class="skill-pick-mini">${escapeHtml(mini)}</span>
        </span>
      </label>
    </li>`;
  }

  function bindSkillPickInteractions() {
    const avail = el("skills-avail-list");
    const deck = el("skills-deck-list");
    const focus = (id, fromDeck) => {
      skillDetailFocusId = id;
      avail.querySelectorAll(".skill-pick-row").forEach((row) => {
        row.classList.toggle("is-active", !fromDeck && row.getAttribute("data-skill-id") === id);
      });
      deck.querySelectorAll(".skill-pick-row").forEach((row) => {
        row.classList.toggle("is-active", fromDeck && row.getAttribute("data-skill-id") === id);
      });
      showSkillDetail(id);
    };

    avail.querySelectorAll(".skill-pick-row").forEach((row) => {
      row.addEventListener("click", (ev) => {
        if (ev.target.closest("input.skill-pick-cb")) return;
        const id = row.getAttribute("data-skill-id");
        if (id) focus(id, false);
      });
    });
    deck.querySelectorAll(".skill-pick-row").forEach((row) => {
      row.addEventListener("click", (ev) => {
        if (ev.target.closest("input.skill-pick-cb")) return;
        const id = row.getAttribute("data-skill-id");
        if (id) focus(id, true);
      });
    });
  }

  function renderSkillSelects() {
    const avail = getAvailableSkillsFiltered();
    const deck = state.skillIds
      .map((id) => skillById(id))
      .filter(Boolean)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const visibleIds = new Set([...avail.map((s) => s.id), ...deck.map((s) => s.id)]);
    if (skillDetailFocusId && !visibleIds.has(skillDetailFocusId)) {
      skillDetailFocusId = null;
      clearSkillDetail();
    }

    el("skills-avail-count").textContent = String(avail.length);
    el("skills-deck-count-label").textContent = String(deck.length);

    el("skills-avail-list").innerHTML = avail.map(skillAvailRowHtml).join("");
    el("skills-deck-list").innerHTML = deck.map(skillDeckRowHtml).join("");

    bindSkillPickInteractions();
    if (skillDetailFocusId && skillById(skillDetailFocusId)) {
      showSkillDetail(skillDetailFocusId);
    }
    renderSkillsFilterHint();
  }

  function clearSkillFilters() {
    el("skills-busca").value = "";
    el("skill-filter-origem").value = "";
    el("skill-filter-modo").value = "";
    el("skill-filter-tipo").value = "";
    el("skill-filter-tempo").value = "";
    renderSkillSelects();
  }

  function addSkillsFromAvailable() {
    const ids = [...el("skills-avail-list").querySelectorAll(".skill-pick-cb:checked")].map((c) => c.value);
    for (const id of ids) {
      if (!state.skillIds.includes(id)) state.skillIds.push(id);
    }
    save();
    renderSkillSelects();
    updateHud();
  }

  function removeSkillsFromDeck() {
    const rem = new Set([...el("skills-deck-list").querySelectorAll(".skill-pick-cb:checked")].map((c) => c.value));
    state.skillIds = state.skillIds.filter((id) => !rem.has(id));
    if (skillDetailFocusId && rem.has(skillDetailFocusId)) {
      skillDetailFocusId = null;
      clearSkillDetail();
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
    renderSkillSelects();
    renderInventoryBlock();
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
    syncInvSlotsFromState();
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
      st.inventarioSlots = defaultInventarioSlots();
      st.inventario = [];
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
      const invLegacy = isLegacyInventarioSlots(o.inventarioSlots);
      state.inventarioSlots = normalizeInventarioSlots(o.inventarioSlots);
      state.inventario = (o.inventario || []).map((e) => ({
        uid: e.uid || newInvUid(),
        itemId: e.itemId,
        slot: mapLegacyItemSlot(e.slot, invLegacy),
        qtd: Math.max(1, parseInt(e.qtd, 10) || 1),
      }));
      pruneInventario();
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
    const uM = espacosUsadosSlot("emMaos");
    const uE = espacosUsadosSlot("equipado");
    const uR = espacosUsadosSlot("acessoRapido");
    const uG = espacosUsadosSlot("guardado");
    const lM = limiteSlot("emMaos");
    const lE = limiteSlot("equipado");
    const lR = limiteSlot("acessoRapido");
    const lG = limiteSlot("guardado");
    const fmt = (u, l) => (l === 0 ? `${u}` : `${u}/${l}`);
    el("hud-inv-summary").textContent = `Mãos ${fmt(uM, lM)} · Eq. ${fmt(uE, lE)} · Ráp. ${fmt(uR, lR)} · Guard. ${fmt(uG, lG)}`;
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
    populateSkillFilterSelects();
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
    ["skill-filter-origem", "skill-filter-modo", "skill-filter-tipo", "skill-filter-tempo"].forEach((id) => {
      el(id).addEventListener("change", () => renderSkillSelects());
    });
    el("btn-skill-filters-clear").addEventListener("click", () => clearSkillFilters());
    el("btn-skill-add").addEventListener("click", () => addSkillsFromAvailable());
    el("btn-skill-remove").addEventListener("click", () => removeSkillsFromDeck());

    el("btn-recalc").addEventListener("click", recalcPools);

    el("btn-cond-add").addEventListener("click", addCondicao);

    bindInvSlotInputs();
    el("inv-busca").addEventListener("input", () => renderInvPicker());
    el("btn-inv-add").addEventListener("click", () => {
      addInventarioLinha();
    });

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
      selectedInvUid = null;
      skillDetailFocusId = null;
      clearInvDetail();
      el("skills-busca").value = "";
      el("skill-filter-origem").value = "";
      el("skill-filter-modo").value = "";
      el("skill-filter-tipo").value = "";
      el("skill-filter-tempo").value = "";
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
