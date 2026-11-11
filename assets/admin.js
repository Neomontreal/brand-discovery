// Panel de respuestas. Con Supabase: login de admin. Sin Supabase: modo demo (lee este navegador).
(async () => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = BD.esc;
  const app = $("#app");
  const sb = BD.supabase();
  const bucket = BD.cfg.bucket || "discovery";

  let rows = [];
  let project = null;
  let selected = null;
  let view = "detalle";
  let urls = {};

  if (sb) {
    const { data } = await sb.auth.getSession();
    if (data.session) start(); else login();
  } else start();

  function login(msg = "") {
    app.innerHTML = `
      <form class="login">
        <h1>Panel</h1>
        <p>Respuestas de descubrimiento de marca.</p>
        <label><span class="lbl">Correo</span><input class="inp" type="email" name="email" required autocomplete="username"></label>
        <label><span class="lbl">Contraseña</span><input class="inp" type="password" name="pass" required autocomplete="current-password"></label>
        <p class="err">${esc(msg)}</p>
        <button class="btn primary lg" type="submit">Entrar</button>
      </form>`;
    $("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      f.querySelector("button").disabled = true;
      const { error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.pass.value });
      if (error) login("Correo o contraseña incorrectos."); else start();
    });
  }

  async function fetchRows() {
    if (sb) {
      const { data, error } = await sb.from("discovery_responses").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data.map((r) => ({
        id: r.id, project: r.project, answers: r.answers || {}, completed: r.completed,
        createdAt: r.created_at, updatedAt: r.updated_at, completedAt: r.completed_at, step: r.current_step,
      }));
    }
    return Object.keys(localStorage)
      .filter((k) => k.startsWith("bd:"))
      .map((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } })
      .filter((s) => s && s.started)
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  }

  async function start() {
    app.innerHTML = `<p class="a-empty">Cargando…</p>`;
    try { rows = await fetchRows(); }
    catch (e) { console.error(e); app.innerHTML = `<p class="a-empty">No se pudieron leer las respuestas. ¿Tu correo está en discovery_admins?</p>`; return; }
    const slugs = [...new Set(rows.map((r) => r.project))];
    for (const s of slugs) await BD.loadProject(s).catch(() => null);
    project = project && slugs.includes(project) ? project : slugs[0] || BD.cfg.proyectoPorDefecto;
    if (sb) await signUrls();
    render();
  }

  async function signUrls() {
    const paths = rows.flatMap((r) => Object.values(r.answers).flatMap((v) => (v && Array.isArray(v.imagenes) ? v.imagenes.map((i) => i.path).filter(Boolean) : [])));
    urls = {};
    if (!paths.length) return;
    const { data } = await sb.storage.from(bucket).createSignedUrls(paths, 3600);
    (data || []).forEach((d) => { if (d.signedUrl) urls[d.path] = d.signedUrl; });
  }
  const imgUrl = (it) => (it.path ? urls[it.path] || it.thumb : it.data || it.thumb);

  const fmtDate = (d) => (d ? new Date(d).toLocaleString("es-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
  const projRows = () => rows.filter((r) => r.project === project);

  async function render() {
    const P = await BD.loadProject(project).catch(() => null);
    const slugs = [...new Set(rows.map((r) => r.project))];
    const list = projRows();
    if (!list.find((r) => r.id === selected)) selected = list[0]?.id || null;

    app.innerHTML = `
      <header class="a-top">
        <h1>Respuestas</h1>
        <span class="mode">${sb ? "Supabase" : "Modo demo · datos de este navegador"}</span>
        ${slugs.length ? `<select id="proj" aria-label="Proyecto">${slugs.map((s) => `<option value="${esc(s)}" ${s === project ? "selected" : ""}>${esc(s.toUpperCase())}</option>`).join("")}</select>` : ""}
        <span class="sp"></span>
        ${list.length ? `
          <button class="btn ${view === "detalle" ? "primary" : "ghost"}" data-view="detalle">Detalle</button>
          <button class="btn ${view === "comparar" ? "primary" : "ghost"}" data-view="comparar">Comparar</button>
          <button class="btn ghost" id="csv">Exportar CSV</button>
          <button class="btn ghost" id="print">PDF</button>` : ""}
        <button class="btn ghost" id="reload" aria-label="Actualizar">↻</button>
        ${sb ? `<button class="btn ghost" id="logout">Salir</button>` : ""}
      </header>
      <div class="a-wrap" ${view === "comparar" ? 'style="grid-template-columns:1fr"' : ""}>
        ${view === "detalle" ? `<aside class="a-list">${list.map((r, i) => item(r, list.length - i, P)).join("") || ""}</aside>` : ""}
        <main class="a-main">${!P ? `<p class="a-empty">Todavía no hay respuestas.</p>` : view === "comparar" ? compare(P, list) : detail(P, list.find((r) => r.id === selected))}</main>
      </div>`;

    $("#proj")?.addEventListener("change", (e) => { project = e.target.value; selected = null; render(); });
    app.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => { view = b.dataset.view; render(); }));
    app.querySelectorAll(".a-item").forEach((b) => b.addEventListener("click", () => { selected = b.dataset.id; render(); }));
    $("#csv")?.addEventListener("click", () => csv(P, list));
    $("#print")?.addEventListener("click", () => window.print());
    $("#reload").addEventListener("click", start);
    $("#del")?.addEventListener("click", (e) => remove(rows.find((r) => r.id === e.currentTarget.dataset.id), P));
    $("#logout")?.addEventListener("click", async () => { await sb.auth.signOut(); login(); });
  }

  function progress(P, r) {
    const vis = BD.visible(P, r.answers);
    return { done: vis.filter((q) => BD.hasValue(q, r.answers)).length, total: vis.length };
  }
  function title(P, r, n) {
    const name = (r.answers.nombre || "").trim();
    if (name) return name;
    const w = (r.answers.palabra || "").trim();
    return w ? `“${w}”` : `Respuesta ${n}`;
  }

  function item(r, n, P) {
    const p = P ? progress(P, r) : { done: 0, total: 0 };
    return `
      <button class="a-item" data-id="${esc(r.id)}" aria-current="${r.id === selected}">
        <b>${esc(P ? title(P, r, n) : r.id)}</b>
        <span class="pill ${r.completed ? "ok" : "wip"}">${r.completed ? "Completa" : `En progreso · ${p.done}/${p.total}`}</span>
        <small>Actualizada ${esc(fmtDate(r.updatedAt))}</small>
      </button>`;
  }

  function detail(P, r) {
    if (!r) return `<p class="a-empty">Todavía no hay respuestas para este proyecto.<br><br>Link del cuestionario: <a href="index.html?p=${esc(project)}">index.html?p=${esc(project)}</a></p>`;
    const p = progress(P, r);
    return `
      <div class="a-head">
        <h2>${esc(P.marca)} · ${esc(title(P, r, ""))}</h2>
        <p>${r.completed ? `Completada ${esc(fmtDate(r.completedAt || r.updatedAt))}` : `En progreso · ${p.done} de ${p.total} respondidas`} · Empezada ${esc(fmtDate(r.createdAt))}</p>
        <button type="button" class="btn ghost danger" id="del" data-id="${esc(r.id)}">Borrar esta respuesta</button>
      </div>
      ${P.bloques.map((b, bi) => {
        const qs = b.preguntas.filter((q) => !q.si || BD.cond(q.si, r.answers));
        if (!qs.length) return "";
        return `<section class="a-block"><h3>${String(bi + 1).padStart(2, "0")} · ${esc(b.titulo)}</h3>
          ${qs.map((q) => {
            const h = BD.formatHTML(q, r.answers, imgUrl);
            return `<div class="a-q"><h4>${esc(BD.t(q.texto, P))}</h4><div class="ans">${h || `<span class="empty">Sin respuesta</span>`}</div></div>`;
          }).join("")}</section>`;
      }).join("")}`;
  }

  function compare(P, list) {
    if (!list.length) return `<p class="a-empty">Sin respuestas.</p>`;
    const nl = (s) => esc(s).replace(/\n/g, "<br>");
    return `
      <div class="a-head"><h2>${esc(P.marca)} · Comparar ${list.length} respuesta${list.length > 1 ? "s" : ""}</h2></div>
      <div class="cmp"><table>
        <thead><tr><th></th>${list.map((r, i) => `<th>${esc(title(P, r, list.length - i))}<br><small style="color:var(--muted);font-weight:500">${r.completed ? "Completa" : "En progreso"}</small></th>`).join("")}</tr></thead>
        <tbody>${P.bloques.map((b) => `
          <tr class="blk"><th colspan="${list.length + 1}">${esc(b.titulo)}</th></tr>
          ${b.preguntas.map((q) => `<tr><th>${esc(BD.t(q.texto, P))}</th>${list.map((r) => {
            const shown = !q.si || BD.cond(q.si, r.answers);
            const tx = shown ? BD.formatText(q, r.answers) : "";
            return `<td>${tx ? nl(tx) : `<span class="empty" style="color:var(--faint)">—</span>`}</td>`;
          }).join("")}</tr>`).join("")}`).join("")}
        </tbody></table></div>`;
  }

  async function remove(r, P) {
    if (!r) return;
    if (!confirm(`¿Borrar la respuesta de ${title(P, r, "")}? No se puede deshacer.`)) return;
    if (sb) {
      const paths = Object.values(r.answers).flatMap((v) => (v && Array.isArray(v.imagenes) ? v.imagenes.map((i) => i.path).filter(Boolean) : []));
      if (paths.length) await sb.storage.from(bucket).remove(paths);
      const { error } = await sb.from("discovery_responses").delete().eq("id", r.id);
      if (error) { alert("No se pudo borrar."); return; }
    } else {
      localStorage.removeItem(`bd:${r.project}`);
    }
    selected = null;
    start();
  }

  function csv(P, list) {
    const qs = BD.questions(P);
    const cell = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const head = ["id", "estado", "empezada", "actualizada", ...qs.map((q) => BD.t(q.texto, P))];
    const lines = list.map((r) => [r.id, r.completed ? "completa" : "en progreso", r.createdAt, r.updatedAt, ...qs.map((q) => BD.formatText(q, r.answers))]);
    const out = "﻿" + [head, ...lines].map((l) => l.map(cell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([out], { type: "text/csv;charset=utf-8" }));
    a.download = `${project}-respuestas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
})();
