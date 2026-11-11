// Utilidades compartidas entre el formulario y el panel.
(function () {
  const BD = (window.BD = {});
  BD.cfg = window.BD_CONFIG || {};

  BD.esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const cache = {};
  BD.loadProject = (slug) => {
    if (!/^[a-z0-9-]+$/.test(slug || "")) return Promise.reject(new Error("Proyecto inválido"));
    if (cache[slug]) return cache[slug];
    cache[slug] = new Promise((resolve, reject) => {
      window.DISCOVERY = null;
      const s = document.createElement("script");
      s.src = `proyectos/${slug}.js?v=${BD.cfg.version || 1}`;
      s.onload = () => (window.DISCOVERY ? resolve(normalize(window.DISCOVERY)) : reject(new Error("Proyecto vacío")));
      s.onerror = () => reject(new Error(`No existe proyectos/${slug}.js`));
      document.head.appendChild(s);
    });
    return cache[slug];
  };

  function normalize(P) {
    P.bloques.forEach((b, bi) =>
      b.preguntas.forEach((q) => {
        q.bloque = b.titulo;
        q.bi = bi;
        if (q.opciones) q.opciones = q.opciones.map((o) => (typeof o === "string" ? { v: o, t: o } : o));
      })
    );
    return P;
  }

  BD.t = (str, P) => String(str ?? "").replace(/\{marca\}/g, P.marca);
  BD.questions = (P) => P.bloques.flatMap((b) => b.preguntas);
  BD.cond = (si, A) => {
    const v = A[si.id];
    const arr = Array.isArray(v) ? v : [v];
    return si.en.some((x) => arr.includes(x));
  };
  BD.visible = (P, A) => BD.questions(P).filter((q) => !q.si || BD.cond(q.si, A));

  BD.applyTheme = (P) => {
    const r = document.documentElement.style;
    const t = P.tema || {};
    if (t.acento) r.setProperty("--accent", t.acento);
    if (t.acentoTinta) r.setProperty("--accent-ink", t.acentoTinta);
    if (t.fondo) r.setProperty("--bg", t.fondo);
  };

  let sb;
  BD.supabase = () => {
    if (sb !== undefined) return sb;
    const { supabaseUrl: u, supabaseAnonKey: k } = BD.cfg;
    sb = u && k && window.supabase ? window.supabase.createClient(u, k) : null;
    return sb;
  };

  const str = (x) => (typeof x === "string" ? x.trim() : "");

  BD.hasValue = (q, A) => {
    const v = A[q.id];
    switch (q.tipo) {
      case "text":
      case "short":
        return !!str(v);
      case "single":
        return !!v && (v !== "otro" || !!str(A[q.id + "_otro"]));
      case "multi":
        return Array.isArray(v) && v.length > 0 && (!(v.length === 1 && v[0] === "otro") || !!str(A[q.id + "_otro"]));
      case "slider":
        return typeof v === "number";
      case "range":
        return Array.isArray(v) && v.length === 2;
      case "campos":
        return !!v && Object.values(v).some((x) => !!str(x));
      case "lista":
        return Array.isArray(v) && v.some((r) => (typeof r === "string" ? !!str(r) : Object.values(r || {}).some((x) => !!str(x))));
      case "colores":
        return !!v && ((v.paletas || []).length > 0 || (v.propios || []).length > 0);
      case "imagenes":
        return !!v && ((v.imagenes || []).length > 0 || !!str(v.links));
    }
    return v != null && v !== "";
  };

  const label = (q, v) => (q.opciones || []).find((o) => o.v === v)?.t ?? v;

  // Respuesta en texto plano (CSV, comparación).
  BD.formatText = (q, A) => {
    const v = A[q.id];
    let out = "";
    switch (q.tipo) {
      case "text":
      case "short":
        out = str(v);
        break;
      case "single":
        out = v ? (v === "otro" ? `Otro: ${str(A[q.id + "_otro"])}` : label(q, v)) : "";
        break;
      case "multi":
        out = (v || []).map((x) => (x === "otro" ? `Otro: ${str(A[q.id + "_otro"])}` : label(q, x))).join(", ");
        break;
      case "slider":
        out = typeof v === "number" ? (q.formato ? q.formato(v) : String(v)) : "";
        break;
      case "range":
        out = Array.isArray(v) ? `${v[0]} – ${v[1]}${q.unidad ? " " + q.unidad : ""}` : "";
        break;
      case "campos":
        out = (q.campos || []).filter((c) => str(v?.[c.k])).map((c) => `${c.t}: ${str(v[c.k])}`).join("\n");
        break;
      case "lista":
        out = (v || [])
          .map((r) => (typeof r === "string" ? str(r) : (q.campos || []).map((c) => str(r?.[c.k])).filter(Boolean).join(" — ")))
          .filter(Boolean)
          .join("\n");
        break;
      case "colores": {
        const pal = (v?.paletas || []).map((id) => {
          const p = (q.paletas || []).find((x) => x.id === id);
          return p ? `${p.t} (${p.c.join(" ")})` : id;
        });
        out = [pal.length ? `Paletas: ${pal.join("; ")}` : "", v?.propios?.length ? `Propios: ${v.propios.join(" ")}` : "", str(v?.nota) ? `Nota: ${str(v.nota)}` : ""]
          .filter(Boolean)
          .join("\n");
        break;
      }
      case "imagenes": {
        const n = (v?.imagenes || []).length;
        out = [n ? `${n} imagen${n > 1 ? "es" : ""}` : "", str(v?.links)].filter(Boolean).join("\n");
        break;
      }
    }
    if (q.extra && str(A[q.id + "_extra"])) out += (out ? "\n" : "") + `${q.extra.t}: ${str(A[q.id + "_extra"])}`;
    return out;
  };

  const nl = (s) => BD.esc(s).replace(/\n/g, "<br>");

  // Respuesta en HTML para el panel (muestra muestras de color e imágenes).
  // imgUrl(item) devuelve la URL a mostrar para cada imagen subida.
  BD.formatHTML = (q, A, imgUrl) => {
    const v = A[q.id];
    let html = "";
    if (q.tipo === "colores" && v) {
      const pals = (v.paletas || [])
        .map((id) => (q.paletas || []).find((x) => x.id === id))
        .filter(Boolean)
        .map((p) => `<div class="a-pal"><span class="sw-row">${p.c.map((c) => `<i style="background:${c}"></i>`).join("")}</span>${BD.esc(p.t)}</div>`)
        .join("");
      const own = (v.propios || []).length
        ? `<div class="a-pal"><span class="sw-row">${v.propios.map((c) => `<i style="background:${BD.esc(c)}" title="${BD.esc(c)}"></i>`).join("")}</span>Propios: ${BD.esc(v.propios.join(" "))}</div>`
        : "";
      html = pals + own + (str(v.nota) ? `<p>${nl(v.nota)}</p>` : "");
    } else if (q.tipo === "imagenes" && v) {
      const imgs = (v.imagenes || [])
        .map((it) => {
          const u = imgUrl(it);
          return u ? `<a href="${BD.esc(u)}" target="_blank" rel="noopener"><img src="${BD.esc(u)}" alt="${BD.esc(it.name)}" loading="lazy"></a>` : "";
        })
        .join("");
      html = (imgs ? `<div class="a-imgs">${imgs}</div>` : "") + (str(v.links) ? `<p>${linkify(v.links)}</p>` : "");
    } else {
      const t = BD.formatText(q, A);
      return t ? `<p>${linkify(t)}</p>` : "";
    }
    if (q.extra && str(A[q.id + "_extra"])) html += `<p><b>${BD.esc(q.extra.t)}:</b> ${nl(A[q.id + "_extra"])}</p>`;
    return html;
  };

  function linkify(s) {
    return nl(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }
})();
