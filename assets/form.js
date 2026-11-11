// Formulario paso a paso. Lee el proyecto de proyectos/<slug>.js (?p=slug).
(async () => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = BD.esc;
  const stage = $("#stage");
  const nav = $("#nav");
  const btnNext = $("#next");
  const btnBack = $("#back");

  const params = new URLSearchParams(location.search);
  const slug = (params.get("p") || BD.cfg.proyectoPorDefecto || "").toLowerCase();

  let P;
  try {
    P = await BD.loadProject(slug);
  } catch (e) {
    stage.innerHTML = `<section class="screen center"><div class="welcome"><h1 class="q-title">Este cuestionario no existe</h1><p class="hint">Revisa el link que te enviaron.</p></div></section>`;
    return;
  }
  const t = (s) => BD.t(s, P);
  BD.applyTheme(P);
  document.title = `${P.marca} · ${P.titulo}`;
  $("#brand").textContent = P.marca;

  const sb = BD.supabase();
  const KEY = `bd:${slug}`;
  const fresh = () => ({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
    project: slug, answers: {}, qid: null, started: false, completed: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });

  let S = null;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (!S || !S.answers || params.has("nuevo")) S = fresh();
  if (params.has("nuevo")) history.replaceState(null, "", `?p=${slug}`);
  let A = S.answers;

  // ---------- guardado ----------
  let localT, remoteT, savedT;
  function saveLocal() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
    catch (e) { console.warn(e); return false; }
  }
  function persist(now) {
    S.updatedAt = new Date().toISOString();
    clearTimeout(localT);
    localT = setTimeout(() => { const ok = saveLocal(); if (!sb) status(ok ? "Guardado" : "No se pudo guardar", !ok); }, now ? 0 : 250);
    if (sb) { clearTimeout(remoteT); remoteT = setTimeout(pushRemote, now ? 0 : 1200); }
  }
  async function pushRemote() {
    if (!S.started) return;
    status("Guardando…");
    const { error } = await sb.rpc("save_discovery", {
      p_id: S.id, p_project: slug, p_answers: A, p_step: stepIndex(), p_completed: !!S.completed,
    });
    if (error) console.warn(error);
    status(error ? "Sin conexión · guardado en este dispositivo" : "Guardado", !!error);
  }
  function status(msg, bad) {
    const el = $("#saved");
    el.textContent = msg;
    el.classList.toggle("bad", !!bad);
    el.classList.add("on");
    clearTimeout(savedT);
    if (!bad) savedT = setTimeout(() => el.classList.remove("on"), 1800);
  }
  const changed = () => { persist(false); refreshNav(); clearErr(); };

  // ---------- navegación ----------
  const steps = () => BD.visible(P, A);
  const stepIndex = () => Math.max(0, steps().findIndex((q) => q.id === S.qid));
  const total = () => steps().length;
  let dir = 1;
  let mode = "welcome";
  let advanceToken = 0;

  function show(html, cls = "") {
    stage.innerHTML = "";
    const el = document.createElement("section");
    el.className = `screen ${dir > 0 ? "in-next" : "in-prev"} ${cls}`;
    el.innerHTML = html;
    stage.appendChild(el);
    window.scrollTo({ top: 0 });
    return el;
  }
  function setProgress(frac, label) {
    $("#bar").style.transform = `scaleX(${Math.max(0, Math.min(1, frac))})`;
    $("#count").textContent = label || "";
  }

  function welcome() {
    mode = "welcome";
    nav.hidden = true;
    setProgress(0, "");
    const resume = S.started && !S.completed;
    const n = BD.questions(P).filter((q) => !q.si).length;
    const el = show(`
      <div class="welcome">
        <p class="eyebrow">${esc(P.titulo)}</p>
        <h1 class="w-title">${esc(P.marca)}</h1>
        <p class="lead">${esc(t(P.intro))}</p>
        <ul class="w-meta">
          <li><b>${n}</b>preguntas</li>
          <li><b>${P.bloques.length}</b>bloques</li>
          <li><b>${P.minutos || 10}</b>minutos aprox.</li>
        </ul>
        <div class="w-actions">
          <button type="button" class="btn primary lg" data-go>${resume ? "Continuar donde quedé" : "Empezar"}</button>
          ${resume ? `<button type="button" class="btn ghost" data-reset>Empezar de nuevo</button>` : ""}
        </div>
        <p class="fine">Sus respuestas se guardan solas. Si cierran la página, retoman donde quedaron.</p>
      </div>`, "center");
    $("[data-go]", el).addEventListener("click", () => {
      S.started = true;
      if (!S.qid) S.qid = steps()[0].id;
      dir = 1;
      persist(true);
      question();
    });
    $("[data-reset]", el)?.addEventListener("click", () => {
      if (!confirm("¿Borrar las respuestas de este dispositivo y empezar de nuevo?")) return;
      S = fresh(); A = S.answers; saveLocal(); welcome();
    });
  }

  function end() {
    mode = "end";
    nav.hidden = true;
    setProgress(1, "Completo");
    const el = show(`
      <div class="welcome end">
        <div class="check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <p class="eyebrow">Respuestas enviadas</p>
        <h1 class="w-title">Gracias.</h1>
        <p class="lead">${esc(t(P.cierre))}</p>
        <div class="w-actions"><button type="button" class="btn ghost" data-review>Revisar o editar mis respuestas</button></div>
      </div>`, "center");
    $("[data-review]", el).addEventListener("click", () => { dir = 1; S.qid = steps()[0].id; question(); });
  }

  function question() {
    mode = "q";
    nav.hidden = false;
    const list = steps();
    let i = list.findIndex((q) => q.id === S.qid);
    if (i < 0) { i = 0; S.qid = list[0].id; }
    const q = list[i];
    setProgress(i / list.length, `${i + 1} / ${list.length}`);
    const el = show(`
      <div class="q">
        <p class="eyebrow"><span class="num">${String(q.bi + 1).padStart(2, "0")}</span>${esc(q.bloque)}${q.opcional ? `<em class="tag">Opcional</em>` : ""}</p>
        <h1 class="q-title">${esc(t(q.texto))}</h1>
        ${q.ayuda ? `<p class="hint">${esc(t(q.ayuda))}</p>` : ""}
        <div class="field"></div>
        <p class="err" role="alert"></p>
      </div>`);
    const field = $(".field", el);
    RENDER[q.tipo](q, field);
    if (q.extra) extraField(q, field);
    refreshNav();
    const first = $("textarea, input:not([type=range]):not([type=color]):not([type=file])", field);
    if (first && matchMedia("(pointer: fine)").matches && ["text", "short", "campos", "lista"].includes(q.tipo)) setTimeout(() => first.focus({ preventScroll: true }), 220);
  }

  function current() { return steps().find((q) => q.id === S.qid); }

  function refreshNav() {
    if (mode !== "q") return;
    const list = steps();
    const i = list.findIndex((q) => q.id === S.qid);
    const q = list[i];
    const last = i === list.length - 1;
    const has = BD.hasValue(q, A);
    btnNext.textContent = last ? "Enviar respuestas" : q.opcional && !has ? "Omitir" : "Siguiente";
    btnNext.classList.toggle("muted", !!q.opcional && !has && !last);
    $("#kbd").textContent = ["text", "campos", "lista", "colores", "imagenes"].includes(q.tipo) ? "⌘ + Enter" : "Enter ↵";
  }

  function next() {
    const q = current();
    if (!q) return;
    if (!q.opcional && !BD.hasValue(q, A)) {
      showErr(q.tipo === "single" || q.tipo === "multi" ? "Elijan al menos una opción para seguir." : "Esta respuesta es importante para nosotros.");
      return;
    }
    advanceToken++;
    dir = 1;
    const list = steps();
    const j = list.findIndex((x) => x.id === q.id);
    if (j === list.length - 1) {
      S.completed = true;
      S.completedAt = new Date().toISOString();
      persist(true);
      end();
      return;
    }
    S.qid = list[j + 1].id;
    persist(true);
    question();
  }
  function back() {
    advanceToken++;
    dir = -1;
    const list = steps();
    const i = list.findIndex((q) => q.id === S.qid);
    if (i <= 0) { welcome(); return; }
    S.qid = list[i - 1].id;
    persist(false);
    question();
  }
  function autoAdvance(q) {
    const tok = ++advanceToken;
    setTimeout(() => { if (tok === advanceToken && mode === "q" && S.qid === q.id) next(); }, 420);
  }

  function showErr(msg) {
    const e = $(".err", stage);
    if (!e) return;
    e.textContent = msg;
    e.classList.remove("on"); void e.offsetWidth; e.classList.add("on");
  }
  function clearErr() { const e = $(".err", stage); if (e) e.textContent = ""; }

  btnNext.addEventListener("click", next);
  btnBack.addEventListener("click", back);

  document.addEventListener("keydown", (e) => {
    if (mode !== "q") return;
    const tag = e.target.tagName;
    const typing = tag === "TEXTAREA" || (tag === "INPUT" && !["range", "color", "file", "checkbox"].includes(e.target.type));
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); next(); return; }
    if (e.key === "Enter" && !e.shiftKey && tag !== "TEXTAREA" && tag !== "BUTTON") {
      if (tag === "INPUT" && e.target.closest(".lista")) return; // la lista maneja su propio Enter
      e.preventDefault(); next(); return;
    }
    // Atajos de letra para las opciones (A, B, C…)
    if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && /^[a-z]$/i.test(e.key)) {
      const opt = $$(".opt[data-key]", stage).find((b) => b.dataset.key === e.key.toUpperCase());
      if (opt) { e.preventDefault(); opt.click(); }
    }
  });

  // ---------- campos ----------
  function autosize(ta) {
    const fit = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
    ta.addEventListener("input", fit);
    requestAnimationFrame(fit);
  }
  function extraField(q, f) {
    const wrap = document.createElement("label");
    wrap.className = "extra";
    wrap.innerHTML = `<span class="lbl">${esc(t(q.extra.t))}</span><textarea class="inp" rows="1"></textarea>`;
    const ta = $("textarea", wrap);
    ta.value = A[q.id + "_extra"] || "";
    ta.addEventListener("input", () => { A[q.id + "_extra"] = ta.value; changed(); });
    autosize(ta);
    f.appendChild(wrap);
  }
  const keyOf = (k) => (k < 26 ? String.fromCharCode(65 + k) : "");

  const RENDER = {
    text(q, f) {
      f.innerHTML = `<textarea class="inp big" rows="3" placeholder="${esc(q.placeholder || "Escriban aquí…")}"></textarea>`;
      const ta = $("textarea", f);
      ta.value = A[q.id] || "";
      ta.addEventListener("input", () => { A[q.id] = ta.value; changed(); });
      autosize(ta);
    },

    short(q, f) {
      f.innerHTML = `<input class="inp big" type="text" maxlength="120" placeholder="${esc(q.placeholder || "Escriban aquí…")}">`;
      const inp = $("input", f);
      inp.value = A[q.id] || "";
      inp.addEventListener("input", () => { A[q.id] = inp.value; changed(); });
    },

    single(q, f) {
      const opts = q.opciones.concat(q.otro ? [{ v: "otro", t: "Otro" }] : []);
      const cards = opts.some((o) => o.d);
      f.innerHTML = `
        <div class="opts ${cards ? "cards" : "rows"}" role="radiogroup">
          ${opts.map((o, k) => `
            <button type="button" class="opt" role="radio" data-v="${esc(o.v)}" data-key="${keyOf(k)}">
              <span class="key">${keyOf(k)}</span>
              <span class="o-body"><span class="o-t">${esc(o.t)}</span>${o.d ? `<span class="o-d">${esc(o.d)}</span>` : ""}</span>
            </button>`).join("")}
        </div>
        ${q.otro ? `<input class="inp otro" type="text" placeholder="¿Cuál?" hidden>` : ""}`;
      const otro = $(".otro", f);
      const sync = () => {
        $$(".opt", f).forEach((b) => b.setAttribute("aria-checked", String(b.dataset.v === A[q.id])));
        if (otro) { otro.hidden = A[q.id] !== "otro"; otro.value = A[q.id + "_otro"] || ""; }
      };
      $(".opts", f).addEventListener("click", (e) => {
        const b = e.target.closest(".opt");
        if (!b) return;
        A[q.id] = b.dataset.v;
        b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
        sync(); changed();
        if (b.dataset.v === "otro") otro.focus();
        else if (!q.extra) autoAdvance(q);
      });
      otro?.addEventListener("input", () => { A[q.id + "_otro"] = otro.value; changed(); });
      sync();
    },

    multi(q, f) {
      const opts = q.opciones.concat(q.otro ? [{ v: "otro", t: "Otro" }] : []);
      const cards = q.estilo === "cards";
      f.innerHTML = `
        ${q.max ? `<p class="sub">Máximo ${q.max} · <span class="sel-n">0</span> elegidos</p>` : ""}
        <div class="opts ${cards ? "cards" : "chips"}" role="group">
          ${opts.map((o, k) => `
            <button type="button" class="opt" role="checkbox" data-v="${esc(o.v)}" ${cards ? `data-key="${keyOf(k)}"` : ""}>
              ${cards ? `<span class="key">${keyOf(k)}</span>` : ""}
              <span class="o-body"><span class="o-t">${esc(o.t)}</span>${o.d ? `<span class="o-d">${esc(o.d)}</span>` : ""}</span>
            </button>`).join("")}
        </div>
        ${q.otro ? `<input class="inp otro" type="text" placeholder="¿Cuál?" hidden>` : ""}`;
      const otro = $(".otro", f);
      const val = () => (Array.isArray(A[q.id]) ? A[q.id] : []);
      const sync = () => {
        const v = val();
        $$(".opt", f).forEach((b) => b.setAttribute("aria-checked", String(v.includes(b.dataset.v))));
        if (otro) { otro.hidden = !v.includes("otro"); otro.value = A[q.id + "_otro"] || ""; }
        const n = $(".sel-n", f); if (n) n.textContent = v.length;
      };
      $(".opts", f).addEventListener("click", (e) => {
        const b = e.target.closest(".opt");
        if (!b) return;
        let v = val().slice();
        const x = b.dataset.v;
        if (v.includes(x)) v = v.filter((y) => y !== x);
        else {
          if (q.max && v.length >= q.max) { showErr(`Máximo ${q.max}. Quiten una para elegir otra.`); return; }
          v.push(x);
          b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
        }
        A[q.id] = v;
        sync(); changed();
        if (x === "otro" && v.includes("otro")) otro.focus();
      });
      otro?.addEventListener("input", () => { A[q.id + "_otro"] = otro.value; changed(); });
      sync();
    },

    slider(q, f) {
      if (typeof A[q.id] !== "number") A[q.id] = q.inicial ?? Math.round((q.min + q.max) / 2);
      f.innerHTML = `
        <div class="slider">
          <output class="s-out"></output>
          <input type="range" min="${q.min}" max="${q.max}" step="${q.paso || 1}" aria-label="${esc(t(q.texto))}">
          <div class="s-labels"><span>${esc(q.etiquetas?.[0] || q.min)}</span><span>${esc(q.etiquetas?.[1] || q.max)}</span></div>
        </div>`;
      const r = $("input", f);
      const out = $("output", f);
      const paint = () => {
        const v = +r.value;
        out.textContent = q.formato ? q.formato(v) : v;
        r.style.setProperty("--p", ((v - q.min) / (q.max - q.min)) * 100 + "%");
      };
      r.value = A[q.id];
      r.addEventListener("input", () => { A[q.id] = +r.value; paint(); changed(); });
      paint();
      persist(false);
    },

    range(q, f) {
      if (!Array.isArray(A[q.id])) A[q.id] = (q.inicial || [q.min, q.max]).slice();
      f.innerHTML = `
        <div class="slider range">
          <output class="s-out"></output>
          <div class="dual">
            <div class="track"><i></i></div>
            <input type="range" min="${q.min}" max="${q.max}" step="1" aria-label="Desde">
            <input type="range" min="${q.min}" max="${q.max}" step="1" aria-label="Hasta">
          </div>
          <div class="s-labels"><span>${q.min}</span><span>${q.max}+</span></div>
        </div>`;
      const [a, b] = $$("input", f);
      const fill = $(".track i", f);
      const out = $("output", f);
      const pct = (v) => ((v - q.min) / (q.max - q.min)) * 100;
      const paint = () => {
        const [x, y] = A[q.id];
        fill.style.left = pct(x) + "%";
        fill.style.right = 100 - pct(y) + "%";
        out.textContent = `${x} – ${y}${y >= q.max ? "+" : ""} ${q.unidad || ""}`;
      };
      a.value = A[q.id][0]; b.value = A[q.id][1];
      const on = (which) => () => {
        let x = +a.value, y = +b.value;
        if (x > y) { if (which === 0) x = y; else y = x; a.value = x; b.value = y; }
        A[q.id] = [x, y]; paint(); changed();
      };
      a.addEventListener("input", on(0));
      b.addEventListener("input", on(1));
      paint();
      persist(false);
    },

    campos(q, f) {
      const v = (A[q.id] = A[q.id] && typeof A[q.id] === "object" ? A[q.id] : {});
      f.innerHTML = `<div class="campos">${q.campos.map((c) => `
        <label class="campo"><span class="lbl">${esc(t(c.t))}</span>
          <textarea class="inp" rows="${c.largo ? 2 : 1}" data-k="${esc(c.k)}"></textarea></label>`).join("")}</div>`;
      $$("textarea", f).forEach((ta) => {
        ta.value = v[ta.dataset.k] || "";
        ta.addEventListener("input", () => { v[ta.dataset.k] = ta.value; changed(); });
        autosize(ta);
      });
    },

    lista(q, f) {
      const multi = !!q.campos;
      let rows = Array.isArray(A[q.id]) ? A[q.id] : [];
      const blank = () => (multi ? Object.fromEntries(q.campos.map((c) => [c.k, ""])) : "");
      while (rows.length < (q.filas || 3)) rows.push(blank());
      A[q.id] = rows;
      f.innerHTML = `<div class="lista"></div><button type="button" class="btn add">+ Agregar otro</button>`;
      const box = $(".lista", f);
      const draw = (focusLast) => {
        box.innerHTML = rows.map((r, i) => `
          <div class="fila ${multi ? "multi" : ""}" data-i="${i}">
            <span class="n">${i + 1}</span>
            ${multi
              ? q.campos.map((c) => `<input class="inp" type="text" data-k="${esc(c.k)}" placeholder="${esc(c.t)}" value="${esc(r[c.k] || "")}">`).join("")
              : `<input class="inp" type="text" placeholder="${esc(q.placeholder || "")}" value="${esc(r)}">`}
            <button type="button" class="x" aria-label="Quitar fila">×</button>
          </div>`).join("");
        if (focusLast) $$(".fila", box).pop()?.querySelector("input")?.focus();
      };
      box.addEventListener("input", (e) => {
        const fila = e.target.closest(".fila");
        const i = +fila.dataset.i;
        if (multi) rows[i][e.target.dataset.k] = e.target.value;
        else rows[i] = e.target.value;
        changed();
      });
      box.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        const fila = e.target.closest(".fila");
        const inputs = $$("input", box);
        const k = inputs.indexOf(e.target);
        if (k < inputs.length - 1) inputs[k + 1].focus();
        else if (+fila.dataset.i === rows.length - 1) { rows.push(blank()); draw(true); }
      });
      box.addEventListener("click", (e) => {
        if (!e.target.classList.contains("x")) return;
        const i = +e.target.closest(".fila").dataset.i;
        rows.splice(i, 1);
        if (!rows.length) rows.push(blank());
        draw(); changed();
      });
      $(".add", f).addEventListener("click", () => { rows.push(blank()); draw(true); changed(); });
      draw();
    },

    colores(q, f) {
      const v = (A[q.id] = A[q.id] && typeof A[q.id] === "object" ? A[q.id] : { paletas: [], propios: [], nota: "" });
      v.paletas ||= []; v.propios ||= [];
      f.innerHTML = `
        <div class="pals">${q.paletas.map((p) => `
          <button type="button" class="pal" data-id="${esc(p.id)}" role="checkbox">
            <span class="sw">${p.c.map((c) => `<i style="background:${c}"></i>`).join("")}</span>
            <span class="pal-t">${esc(p.t)}</span>
          </button>`).join("")}</div>
        <div class="own">
          <span class="lbl">Sus propios colores</span>
          <div class="own-row"></div>
        </div>
        <label class="extra"><span class="lbl">¿Qué significan esos colores para ustedes? (opcional)</span>
          <textarea class="inp" rows="1"></textarea></label>`;
      const sync = () => $$(".pal", f).forEach((b) => b.setAttribute("aria-checked", String(v.paletas.includes(b.dataset.id))));
      $(".pals", f).addEventListener("click", (e) => {
        const b = e.target.closest(".pal");
        if (!b) return;
        const id = b.dataset.id;
        v.paletas = v.paletas.includes(id) ? v.paletas.filter((x) => x !== id) : [...v.paletas, id];
        sync(); changed();
      });
      const row = $(".own-row", f);
      const drawOwn = () => {
        row.innerHTML = v.propios.map((c, i) => `
          <span class="own-c" data-i="${i}">
            <input type="color" value="${esc(c)}" aria-label="Color ${i + 1}">
            <code>${esc(c)}</code>
            <button type="button" class="x" aria-label="Quitar color">×</button>
          </span>`).join("") + (v.propios.length < 8 ? `<button type="button" class="btn add sm">+ Agregar color</button>` : "");
      };
      row.addEventListener("input", (e) => {
        if (e.target.type !== "color") return;
        const i = +e.target.closest(".own-c").dataset.i;
        v.propios[i] = e.target.value;
        e.target.nextElementSibling.textContent = e.target.value;
        changed();
      });
      row.addEventListener("click", (e) => {
        if (e.target.classList.contains("add")) {
          v.propios.push("#ff4d6d"); drawOwn(); changed();
          setTimeout(() => $$("input[type=color]", row).pop()?.click(), 30);
        } else if (e.target.classList.contains("x")) {
          v.propios.splice(+e.target.closest(".own-c").dataset.i, 1); drawOwn(); changed();
        }
      });
      const ta = $("textarea", f);
      ta.value = v.nota || "";
      ta.addEventListener("input", () => { v.nota = ta.value; changed(); });
      autosize(ta);
      sync(); drawOwn();
    },

    imagenes(q, f) {
      const v = (A[q.id] = A[q.id] && typeof A[q.id] === "object" ? A[q.id] : { imagenes: [], links: "" });
      v.imagenes ||= [];
      const max = q.max || 12;
      f.innerHTML = `
        <label class="drop" tabindex="0">
          <input type="file" accept="image/*" multiple hidden>
          <span class="drop-i" aria-hidden="true">＋</span>
          <span><b>Subir imágenes</b><br><small>Toquen aquí o arrastren archivos · hasta ${max}</small></span>
        </label>
        <div class="thumbs"></div>
        <label class="extra"><span class="lbl">Links (Pinterest, Drive, sitios…)</span>
          <textarea class="inp" rows="2" placeholder="Un link por línea"></textarea></label>`;
      const input = $("input[type=file]", f);
      const drop = $(".drop", f);
      const thumbs = $(".thumbs", f);
      const draw = () => {
        thumbs.innerHTML = v.imagenes.map((it, i) => `
          <figure class="th" data-i="${i}">
            ${it.thumb || it.data ? `<img src="${esc(it.thumb || it.data)}" alt="">` : `<span class="ph">${esc(it.name)}</span>`}
            <button type="button" class="x" aria-label="Quitar imagen">×</button>
          </figure>`).join("");
      };
      thumbs.addEventListener("click", (e) => {
        if (!e.target.classList.contains("x")) return;
        v.imagenes.splice(+e.target.closest(".th").dataset.i, 1);
        draw(); changed();
      });
      const add = async (files) => {
        files = [...files].filter((x) => x.type.startsWith("image/"));
        const room = max - v.imagenes.length;
        if (room <= 0) { showErr(`Máximo ${max} imágenes.`); return; }
        if (files.length > room) showErr(`Solo se agregaron ${room}: el máximo es ${max}.`);
        for (const [k, file] of files.slice(0, room).entries()) {
          const ph = document.createElement("figure");
          ph.className = "th loading";
          thumbs.appendChild(ph);
          try {
            const item = { name: file.name, thumb: await toDataURL(await compress(file, 260, 0.62)) };
            if (sb) {
              const blob = await compress(file, 1800, 0.86);
              const path = `${slug}/${S.id}/${Date.now()}-${k}.jpg`;
              const { error } = await sb.storage.from(BD.cfg.bucket || "discovery").upload(path, blob, { contentType: "image/jpeg" });
              if (error) throw error;
              item.path = path;
            } else {
              item.data = await toDataURL(await compress(file, 900, 0.78));
            }
            S.started = true;
            v.imagenes.push(item);
          } catch (err) {
            console.warn(err);
            showErr(`No se pudo subir "${file.name}". Prueben con JPG o PNG.`);
          }
          draw(); changed();
        }
      };
      input.addEventListener("change", () => { add(input.files); input.value = ""; });
      drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
      ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
      ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
      drop.addEventListener("drop", (e) => add(e.dataTransfer.files));
      const ta = $("textarea", f);
      ta.value = v.links || "";
      ta.addEventListener("input", () => { v.links = ta.value; changed(); });
      draw();
    },
  };

  async function compress(file, max, quality) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", quality));
  }
  function toDataURL(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  }

  // ---------- arranque ----------
  if (S.completed) end();
  else welcome();
})();
