(function () {
  "use strict";
  const KEY = "nihongo-trainer-v1";
  const DAY = 86400000;
  const INTERVALS = [0, 1, 2, 4, 7, 14, 30, 60, 120]; // Tage je Box
  const STAGES = ["Kennenlernen", "Bedeutung wählen", "Erinnern", "Aussprechen", "Schreiben"];
  const SCRIPTS = { romaji: "A", kana: "あ", kanji: "漢" };

  // ---------- Speicher ----------
  function defaults() {
    return {
      settings: { script: "kana", furigana: true, newPerSession: 8, recallSec: 5, speak: true, write: true, phrases: true, ttsRate: 0.85, counterMode: "mc" },
      groups: null, progress: {}, custom: [], counterCats: ["tsu", "nin", "hiki"], log: {},
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); const def = defaults(); return { ...def, ...d, settings: { ...def.settings, ...(d.settings || {}) } }; }
    } catch (e) { /* ignorieren */ }
    return defaults();
  }
  let DB = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast("Speichern nicht möglich"); } }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }

  // ---------- Wörter ----------
  let WORDS = [], GROUPS = [];
  function buildWords() {
    GROUPS = window.VOCAB_GROUPS.map(g => ({ id: g.id, name: g.name, kind: g.kind }));
    GROUPS.push({ id: "custom", name: "Eigene Wörter", kind: "custom" });
    WORDS = [];
    for (const g of window.VOCAB_GROUPS) {
      for (const it of g.items) {
        WORDS.push(mkWord(g.id + "|" + it[0], g.id, it[0], it[1], it[2], it[3] === "p", false));
      }
    }
    for (const c of DB.custom) WORDS.push(mkWord(c.id, c.g || "custom", c.kana, c.kanji, c.de, !!c.p, true));
    if (!DB.groups) DB.groups = GROUPS.filter(g => g.kind !== "extra").map(g => g.id);
  }
  function mkWord(id, g, kana, kanji, de, p, custom) {
    return { id, g, kana, kanji: kanji || "", de, p, custom, romaji: Kana.kanaToRomaji(kana, p) };
  }
  function activeWords() {
    return WORDS.filter(w => DB.groups.includes(w.g) && (DB.settings.phrases || !w.p));
  }
  const prog = w => DB.progress[w.id];

  // ---------- Anzeige ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function jp(w, opts = {}) {
    const sc = opts.script || DB.settings.script;
    const long = (w.kana.length > 12) ? " long" : "";
    if (sc === "romaji") return `<span class="jp${long}">${esc(w.romaji)}</span>`;
    if (sc === "kanji" && w.kanji && w.kanji !== w.kana) {
      if (DB.settings.furigana) return `<span class="jp${long}"><ruby>${esc(w.kanji)}<rt>${esc(w.kana)}</rt></ruby></span>`;
      return `<span class="jp${long}">${esc(w.kanji)}</span>`;
    }
    return `<span class="jp${long}">${esc(w.kana)}</span>`;
  }
  function readingText(kana, script) { return (script || DB.settings.script) === "romaji" ? Kana.kanaToRomaji(kana) : kana; }
  function formsHTML(w) {
    return `<dl class="forms">${w.kanji ? `<dt>Kanji</dt><dd>${esc(w.kanji)}</dd>` : ""}<dt>Kana</dt><dd>${esc(w.kana)}</dd><dt>Romaji</dt><dd>${esc(w.romaji)}</dd><dt>Deutsch</dt><dd style="font-family:inherit">${esc(w.de)}</dd></dl>`;
  }

  const $app = document.getElementById("app");
  const $title = document.getElementById("title");
  const $back = document.getElementById("backBtn");
  const $script = document.getElementById("scriptBtn");
  let current = null; // aktuelle Ansicht (für Neu-Rendern)
  let cleanup = null;

  function show(title, html, opts = {}) {
    if (cleanup) { cleanup(); cleanup = null; }
    $title.textContent = title;
    $back.hidden = !opts.back;
    $back.onclick = opts.back || null;
    $app.innerHTML = html;
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200);
  }
  function updateScriptBtn() { $script.textContent = SCRIPTS[DB.settings.script]; }
  $script.onclick = () => {
    const order = ["romaji", "kana", "kanji"];
    DB.settings.script = order[(order.indexOf(DB.settings.script) + 1) % 3];
    save(); updateScriptBtn();
    toast({ romaji: "Romaji (müde-Modus)", kana: "Hiragana / Katakana", kanji: "Mit Kanji" }[DB.settings.script]);
    if (current && current.rerender) current.rerender();
  };

  // ---------- Sprache ----------
  let jaVoice = null;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    jaVoice = vs.find(v => v.lang === "ja-JP" && /google/i.test(v.name)) || vs.find(v => v.lang && v.lang.startsWith("ja")) || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  function say(text) {
    if (!("speechSynthesis" in window)) return toast("Sprachausgabe nicht verfügbar");
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/～/g, "なになに"));
    u.lang = "ja-JP"; u.rate = DB.settings.ttsRate; if (jaVoice) u.voice = jaVoice;
    speechSynthesis.speak(u);
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function listen(onResult, onEnd) {
    if (!SR) { onEnd && onEnd("unsupported"); return null; }
    const r = new SR();
    r.lang = "ja-JP"; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    let got = false;
    r.onresult = e => { got = true; const alts = []; for (const a of e.results[0]) alts.push(a.transcript); onResult(alts); };
    r.onerror = e => { onEnd && onEnd(e.error); };
    r.onend = () => { if (!got) onEnd && onEnd("nomatch"); };
    try { r.start(); } catch (e) { onEnd && onEnd("error"); }
    return r;
  }

  // ---------- Startseite ----------
  function home() {
    current = { rerender: home };
    const act = activeWords(), now = Date.now();
    const due = act.filter(w => { const p = prog(w); return p && p.s >= 5 && p.d <= now; }).length;
    const learning = act.filter(w => { const p = prog(w); return p && p.s < 5; }).length;
    const fresh = act.filter(w => !prog(w)).length;
    const learned = WORDS.filter(w => { const p = prog(w); return p && p.s >= 5; }).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = DB.log[today] || 0;
    show("日本語 Trainer", `
      <div class="card">
        <div class="stats">
          <div class="stat"><b>${due}</b><span>fällig</span></div>
          <div class="stat"><b>${learning}</b><span>in Arbeit</span></div>
          <div class="stat"><b>${learned}</b><span>gelernt</span></div>
        </div>
        <button class="btn primary" id="go">${due + learning + fresh ? "Vokabeln lernen" : "Alles erledigt 🎉"}</button>
        <p class="small muted center" style="margin:8px 0 0">${fresh} neue Wörter verfügbar · heute ${todayCount} Karten</p>
      </div>
      <button class="btn menu-btn" id="m-groups"><span class="ico">📚</span><span>Lektionen wählen<small>${DB.groups.length} von ${GROUPS.length} Gruppen aktiv</small></span></button>
      <button class="btn menu-btn" id="m-counters"><span class="ico">三</span><span>Zählwörter üben<small>ひとつ, さんぼん, はっぴき, Datum, Uhrzeit, Preise …</small></span></button>
      <button class="btn menu-btn" id="m-write"><span class="ico">✍️</span><span>Schreiben üben<small>Kanji, Hiragana & Katakana mit dem Finger zeichnen</small></span></button>
      <button class="btn menu-btn" id="m-list"><span class="ico">🔎</span><span>Wortliste<small>Suchen, eigene Wörter ergänzen</small></span></button>
      <button class="btn menu-btn" id="m-settings"><span class="ico">⚙️</span><span>Einstellungen<small>Schrift, Stufen, Sicherung</small></span></button>
    `);
    document.getElementById("go").onclick = () => startSession();
    document.getElementById("m-groups").onclick = groupsView;
    document.getElementById("m-counters").onclick = countersView;
    document.getElementById("m-list").onclick = () => listView();
    document.getElementById("m-write").onclick = writeView;
    document.getElementById("m-settings").onclick = settingsView;
  }

  // ---------- Gruppenauswahl ----------
  function groupsView() {
    current = null;
    const block = kind => GROUPS.filter(g => g.kind === kind).map(g => {
      const ws = WORDS.filter(w => w.g === g.id);
      const done = ws.filter(w => { const p = prog(w); return p && p.s >= 5; }).length;
      return `<label class="check"><input type="checkbox" data-g="${g.id}" ${DB.groups.includes(g.id) ? "checked" : ""}>
        <span class="main">${esc(g.name)}<br><span class="small muted">${ws.length} Einträge · ${done} gelernt</span></span></label>`;
    }).join("");
    show("Lektionen", `
      <h2>Kurs (Marugoto A1)</h2><div class="card">${block("kurs")}</div>
      <h2>Zusatzwortschatz</h2><div class="card">${block("extra")}</div>
      <h2>Eigene</h2><div class="card">${block("custom")}</div>
      <p class="small muted">Neue Wörter kommen in der Reihenfolge der Lektionen dran.</p>
    `, { back: home });
    $app.querySelectorAll("input[data-g]").forEach(cb => cb.onchange = () => {
      const id = cb.dataset.g;
      DB.groups = cb.checked ? [...new Set([...DB.groups, id])] : DB.groups.filter(x => x !== id);
      save();
    });
  }

  // ---------- Lern-Session ----------
  let S = null;
  function nextStage(st, w) {
    let n = st + 1;
    if (n === 3 && !DB.settings.speak) n++;
    if (n === 4 && (!DB.settings.write || w.p)) n++;
    return n;
  }
  function startSession() {
    const act = activeWords(), now = Date.now();
    const due = act.filter(w => { const p = prog(w); return p && p.s >= 5 && p.d <= now; }).sort((a, b) => prog(a).d - prog(b).d).slice(0, 40);
    const inprog = act.filter(w => { const p = prog(w); return p && p.s < 5; });
    const nNew = Math.max(0, DB.settings.newPerSession - inprog.length);
    const fresh = act.filter(w => !prog(w)).slice(0, nNew);
    const queue = [];
    for (const w of inprog) queue.push({ w, st: prog(w).s });
    for (const w of fresh) queue.push({ w, st: 0 });
    for (const w of shuffle(due)) queue.push({ w, st: "r" });
    if (!queue.length) { toast("Gerade nichts zu tun – wähle mehr Lektionen!"); return; }
    queue.sort((a, b) => (a.st === "r" ? 9 : a.st) - (b.st === "r" ? 9 : b.st));
    S = { queue, done: 0, total: queue.length, right: 0, wrong: 0, finished: new Set() };
    nextCard();
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function insertLater(task, min = 3, max = 6) {
    const pos = Math.min(S.queue.length, min + Math.floor(Math.random() * (max - min + 1)));
    S.queue.splice(pos, 0, task);
  }
  function logCard() { const d = new Date().toISOString().slice(0, 10); DB.log[d] = (DB.log[d] || 0) + 1; }

  function answer(task, ok) {
    const w = task.w; logCard();
    if (ok) S.right++; else S.wrong++;
    if (task.st === "r" || task.review) {
      const p = prog(w);
      if (ok) { p.b = Math.min(p.b + 1, INTERVALS.length - 1); p.d = Date.now() + INTERVALS[p.b] * DAY - 3600000; S.finished.add(w.id); }
      else { p.b = 1; p.s = 2; insertLater({ w, st: 2 }); S.total++; }
    } else {
      if (ok) {
        const n = nextStage(task.st, w);
        if (n >= 5) { DB.progress[w.id] = { s: 5, b: 1, d: Date.now() + DAY - 3600000 }; S.finished.add(w.id); }
        else { DB.progress[w.id] = { s: n, b: 0, d: 0 }; insertLater({ w, st: n }, 2, 5); S.total++; }
      } else {
        DB.progress[w.id] = { s: task.st, b: 0, d: 0 };
        insertLater({ w, st: task.st }); S.total++;
      }
    }
    S.done++; save(); nextCard();
  }

  function nextCard() {
    const task = S.queue.shift();
    if (!task) return sessionEnd();
    let mode = task.st;
    if (mode === "r") {
      const modes = [2]; if (DB.settings.speak && SR) modes.push(3); if (DB.settings.write && !task.w.p) modes.push(4, 4);
      task.review = true; mode = modes[Math.floor(Math.random() * modes.length)];
    }
    task.mode = mode;
    renderCard(task);
  }
  function cardShell(task, inner) {
    const pct = Math.round(100 * S.done / Math.max(S.total, 1));
    return `<div class="progress"><i style="width:${pct}%"></i></div>
      <div class="stage-label"><span>${task.review ? "Wiederholung · " : ""}${STAGES[task.mode]}</span><span>${S.done}/${S.total}</span></div>
      <div class="card">${inner}</div>`;
  }
  const backHome = () => { if (confirm("Lernrunde beenden? Dein Fortschritt ist gespeichert.")) home(); };

  function renderCard(task) {
    current = { rerender: () => renderCard(task) };
    const w = task.w;
    const title = "Lernen";
    if (task.mode === 0) {
      show(title, cardShell(task, `
        <div class="prompt">${jp(w)}<div class="de">${esc(w.de)}</div></div>
        <div class="center"><button class="speak-btn" id="say">🔊 Anhören</button></div>
        ${formsHTML(w)}
        <button class="btn primary" id="next">Weiter</button>`), { back: backHome });
      $("#say").onclick = () => say(w.kana);
      $("#next").onclick = () => answer(task, true);
      say(w.kana);
    } else if (task.mode === 1) {
      const pool = activeWords().filter(x => x.id !== w.id && x.p === w.p && x.de !== w.de);
      const same = shuffle(pool.filter(x => x.g === w.g));
      const opts = shuffle([w, ...uniqBy([...same, ...shuffle(pool)], x => x.de).slice(0, 3)]);
      show(title, cardShell(task, `
        <div class="prompt">${jp(w)}<div class="sub">Was bedeutet das?</div></div>
        <div class="options">${opts.map((o, i) => `<button class="option" data-i="${i}">${esc(o.de)}</button>`).join("")}</div>
        <div id="after"></div>`), { back: backHome });
      $app.querySelectorAll(".option").forEach(b => b.onclick = () => {
        const chosen = opts[+b.dataset.i], ok = chosen.id === w.id;
        $app.querySelectorAll(".option").forEach((x, i) => { x.disabled = true; if (opts[i].id === w.id) x.classList.add("correct"); });
        if (!ok) b.classList.add("wrong");
        say(w.kana);
        $("#after").innerHTML = `<button class="btn ${ok ? "good" : "primary"}" id="next">Weiter</button>`;
        $("#next").onclick = () => answer(task, ok);
      });
    } else if (task.mode === 2) {
      show(title, cardShell(task, `
        <div class="prompt"><div class="de">${esc(w.de)}</div><div class="sub">Wie heißt das auf Japanisch?</div></div>
        <div class="timer"><i id="bar"></i></div>
        <div id="area"><button class="btn" id="reveal">Aufdecken</button></div>`), { back: backHome });
      const sec = DB.settings.recallSec, bar = $("#bar");
      bar.animate([{ width: "100%" }, { width: "0%" }], { duration: sec * 1000, fill: "forwards" });
      const t = setTimeout(reveal, sec * 1000);
      cleanup = () => clearTimeout(t);
      $("#reveal").onclick = reveal;
      function reveal() {
        clearTimeout(t);
        $("#area").innerHTML = `<div class="prompt" style="min-height:0;padding:8px">${jp(w)}</div>
          <div class="center"><button class="speak-btn" id="say">🔊 Anhören</button></div>
          <div class="row"><button class="btn bad" id="no">Nicht gewusst</button><button class="btn good" id="yes">Gewusst</button></div>`;
        say(w.kana);
        $("#say").onclick = () => say(w.kana);
        $("#no").onclick = () => answer(task, false);
        $("#yes").onclick = () => answer(task, true);
      }
    } else if (task.mode === 3) {
      if (!SR) {
        show(title, cardShell(task, `<div class="prompt"><div class="de">${esc(w.de)}</div><div class="sub">Sag es laut – Spracherkennung wird von diesem Browser nicht unterstützt (Chrome auf dem Pixel kann es).</div></div>
          <button class="btn" id="reveal">Aufdecken</button><div id="area"></div>`), { back: backHome });
        $("#reveal").onclick = () => { $("#area").innerHTML = `<div class="prompt" style="min-height:0">${jp(w)}</div><div class="row"><button class="btn bad" id="no">Falsch</button><button class="btn good" id="yes">Richtig</button></div>`; say(w.kana); $("#no").onclick = () => answer(task, false); $("#yes").onclick = () => answer(task, true); };
        return;
      }
      show(title, cardShell(task, `
        <div class="prompt"><div class="de">${esc(w.de)}</div><div class="sub">Tippe aufs Mikrofon und sprich auf Japanisch</div></div>
        <button class="mic" id="mic" aria-label="Sprechen">🎤</button>
        <div id="area"></div>
        <button class="btn" id="skip">Überspringen / Aufdecken</button>`), { back: backHome });
      let rec = null;
      const mic = $("#mic");
      mic.onclick = () => {
        if (rec) { rec.stop(); return; }
        mic.classList.add("listening"); $("#area").innerHTML = `<p class="center muted">Ich höre zu …</p>`;
        rec = listen(alts => {
          mic.classList.remove("listening"); rec = null;
          const score = Kana.speechScore(alts, w.kana, w.kanji);
          const ok = score >= (w.p ? 0.75 : 0.85);
          result(ok, alts[0]);
        }, err => {
          mic.classList.remove("listening"); rec = null;
          $("#area").innerHTML = `<p class="center muted">${err === "not-allowed" ? "Mikrofon nicht erlaubt – bitte im Browser freigeben." : "Nichts verstanden – nochmal versuchen."}</p>`;
        });
      };
      cleanup = () => { try { rec && rec.abort(); } catch (e) { } };
      $("#skip").onclick = () => result(false, null);
      function result(ok, heard) {
        $("#skip").remove(); mic.disabled = true;
        $("#area").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig ausgesprochen!" : (heard ? "✗ Nicht ganz." : "Lösung:")}
          ${heard ? `<div class="small">Verstanden: <span class="jp">${esc(heard)}</span></div>` : ""}
          <div>Richtig: ${jp(w)}</div></div>
          <div class="center" style="margin-top:8px"><button class="speak-btn" id="say">🔊 Anhören</button></div>
          ${ok ? `<button class="btn good" id="next">Weiter</button>` : `<div class="row"><button class="btn" id="retry">Nochmal</button><button class="btn" id="override">War doch richtig</button></div><button class="btn primary" id="next">Weiter</button>`}`;
        say(w.kana);
        $("#say").onclick = () => say(w.kana);
        $("#next").onclick = () => answer(task, ok);
        if (!ok) { $("#override").onclick = () => answer(task, true); $("#retry").onclick = () => renderCard(task); }
      }
    } else if (task.mode === 4) {
      const romaji = DB.settings.script === "romaji";
      show(title, cardShell(task, `
        <div class="prompt"><div class="de">${esc(w.de)}</div><div class="sub">${romaji ? "Schreib es in Romaji" : "Schreib es auf Japanisch (Kana, Kanji oder Romaji)"}</div></div>
        <form id="f"><input class="answer-input" id="inp" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" lang="${romaji ? "en" : "ja"}" placeholder="${romaji ? "z. B. taberu" : "例：たべます"}">
        <button class="btn primary" type="submit">Prüfen</button></form>
        <div id="area"></div>`), { back: backHome });
      const inp = $("#inp"); setTimeout(() => inp.focus(), 50);
      $("#f").onsubmit = e => {
        e.preventDefault();
        if (!inp.value.trim()) return;
        const ok = Kana.matches(inp.value, w.kana, w.kanji, w.p);
        inp.disabled = true; $("#f").querySelector("button").remove();
        $("#area").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Leider falsch."}<div>${jp(w)}</div>
          ${DB.settings.script !== "romaji" ? `<div class="small">${esc(w.romaji)}</div>` : `<div class="small jp">${esc(w.kana)}</div>`}</div>
          ${ok ? `<button class="btn good" id="next">Weiter</button>` : `<div class="row"><button class="btn" id="override">Tippfehler – war richtig</button><button class="btn primary" id="next">Weiter</button></div>`}`;
        say(w.kana);
        $("#next").onclick = () => answer(task, ok);
        if (!ok) $("#override").onclick = () => answer(task, true);
        $("#next").focus();
      };
    }
  }
  function uniqBy(a, f) { const s = new Set(); return a.filter(x => { const k = f(x); if (s.has(k)) return false; s.add(k); return true; }); }
  function $(sel) { return $app.querySelector(sel); }

  function sessionEnd() {
    current = null;
    const n = S.finished.size;
    show("Geschafft!", `<div class="card center">
      <div class="big-emoji">🎉</div>
      <h2>Lernrunde fertig</h2>
      <p>${S.right} richtig · ${S.wrong} falsch<br>${n} Wörter abgeschlossen</p>
      <button class="btn primary" id="again">Noch eine Runde</button>
      <button class="btn" id="home">Zur Startseite</button></div>`);
    $("#again").onclick = startSession; $("#home").onclick = home;
  }

  // ---------- Wortliste ----------
  function listView(filter = "", group = "") {
    current = { rerender: () => listView($("#q") ? $("#q").value : filter, $("#gsel") ? $("#gsel").value : group) };
    show("Wortliste", `
      <button class="btn primary" id="add" style="margin-top:0">＋ Eigenes Wort hinzufügen</button>
      <div class="card" style="margin-top:12px">
        <label class="field"><span>Suchen (Japanisch, Romaji oder Deutsch)</span><input type="search" id="q" value="${esc(filter)}"></label>
        <label class="field" style="margin-bottom:0"><span>Gruppe</span><select id="gsel"><option value="">Alle</option>${GROUPS.map(g => `<option value="${g.id}" ${g.id === group ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></label>
      </div>
      <div class="card" id="lst"></div>`, { back: home });
    const draw = () => {
      const q = $("#q").value.trim().toLowerCase(), g = $("#gsel").value;
      const qr = q ? Kana.toComparable(q) : "";
      const res = WORDS.filter(w => (!g || w.g === g) && (!q || w.de.toLowerCase().includes(q) || w.kana.includes(q) || (w.kanji && w.kanji.includes(q)) || (qr && Kana.toComparable(w.kana).includes(qr))));
      $("#lst").innerHTML = res.slice(0, 300).map(w => {
        const p = prog(w);
        const badge = !p ? `<span class="badge">neu</span>` : p.s >= 5 ? `<span class="badge done">Box ${p.b}</span>` : `<span class="badge learning">Stufe ${p.s + 1}</span>`;
        return `<div class="list-item" data-id="${esc(w.id)}"><div class="main">${jp(w)}<div class="de">${esc(w.de)}</div></div>${badge}<button class="speak-btn" data-say="${esc(w.kana)}">🔊</button>${w.custom ? `<button class="speak-btn" data-edit="${esc(w.id)}">✎</button>` : ""}</div>`;
      }).join("") || `<p class="muted center">Nichts gefunden.</p>`;
      if (res.length > 300) $("#lst").insertAdjacentHTML("beforeend", `<p class="small muted center">… und ${res.length - 300} weitere</p>`);
      $("#lst").querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(b.dataset.say));
      $("#lst").querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editWord(b.dataset.edit));
    };
    $("#q").oninput = draw; $("#gsel").onchange = draw; draw();
    $("#add").onclick = () => editWord(null);
  }

  function editWord(id) {
    current = null;
    const c = id ? DB.custom.find(x => x.id === id) : null;
    show(c ? "Wort bearbeiten" : "Wort hinzufügen", `<form class="card" id="f">
      <label class="field"><span>Japanisch in Kana (Pflicht) – z. B. ねこ, コーヒー</span><input type="text" id="kana" lang="ja" required value="${esc(c ? c.kana : "")}"></label>
      <label class="field"><span>Mit Kanji (optional) – z. B. 猫</span><input type="text" id="kanji" lang="ja" value="${esc(c ? c.kanji : "")}"></label>
      <label class="field"><span>Deutsch (Pflicht)</span><input type="text" id="de" required value="${esc(c ? c.de : "")}"></label>
      <label class="field"><span>Gruppe</span><select id="grp">${GROUPS.map(g => `<option value="${g.id}" ${(c ? c.g : "custom") === g.id ? "selected" : ""}>${esc(g.name)}</option>`).join("")}</select></label>
      <label class="switch-row"><span>Ist ein Satz / Ausdruck</span><input type="checkbox" id="isp" ${c && c.p ? "checked" : ""}></label>
      <p class="small muted" id="prev"></p>
      <button class="btn primary" type="submit">Speichern</button>
      ${c ? `<button class="btn bad" type="button" id="del">Löschen</button>` : ""}
    </form>`, { back: () => listView() });
    const upd = () => { const k = $("#kana").value.trim(); $("#prev").textContent = k ? "Romaji: " + Kana.kanaToRomaji(k, $("#isp").checked) : ""; };
    $("#kana").oninput = upd; $("#isp").onchange = upd; upd();
    $("#f").onsubmit = e => {
      e.preventDefault();
      const kana = $("#kana").value.trim(), de = $("#de").value.trim();
      if (!/[ぁ-ヿ]/.test(kana)) { toast("Bitte die Kana-Schreibweise eingeben"); return; }
      const data = { kana, kanji: $("#kanji").value.trim(), de, g: $("#grp").value, p: $("#isp").checked };
      if (c) Object.assign(c, data); else { DB.custom.push({ id: "c" + Date.now(), ...data }); if (!DB.groups.includes(data.g)) DB.groups.push(data.g); }
      save(); buildWords(); toast("Gespeichert"); listView();
    };
    if (c) $("#del").onclick = () => {
      if (!confirm("Dieses Wort wirklich löschen?")) return;
      DB.custom = DB.custom.filter(x => x.id !== id); delete DB.progress[id]; save(); buildWords(); listView();
    };
  }

  // ---------- Zählwörter ----------
  function countersView() {
    current = null;
    const cats = Counters.CATEGORIES;
    show("Zählwörter", `
      <p class="muted small" style="margin-top:0">Wähle, was du üben willst:</p>
      <div class="cat-grid">${cats.map(c => `<button class="cat ${DB.counterCats.includes(c.id) ? "on" : ""}" data-c="${c.id}"><b>${c.label}</b><small>${esc(c.title)}</small></button>`).join("")}</div>
      <h2>Antwortmodus</h2>
      <div class="seg" id="mode"><button data-m="mc" class="${DB.settings.counterMode === "mc" ? "on" : ""}">Auswählen</button><button data-m="type" class="${DB.settings.counterMode === "type" ? "on" : ""}">Tippen</button><button data-m="speak" class="${DB.settings.counterMode === "speak" ? "on" : ""}">Sprechen</button></div>
      <button class="btn primary" id="start">Üben (10 Fragen)</button>
      <button class="btn" id="tables">Tabellen ansehen</button>`, { back: home });
    $app.querySelectorAll(".cat").forEach(b => b.onclick = () => {
      const id = b.dataset.c;
      DB.counterCats = DB.counterCats.includes(id) ? DB.counterCats.filter(x => x !== id) : [...DB.counterCats, id];
      b.classList.toggle("on"); save();
    });
    $app.querySelectorAll("#mode button").forEach(b => b.onclick = () => {
      DB.settings.counterMode = b.dataset.m; save();
      $app.querySelectorAll("#mode button").forEach(x => x.classList.toggle("on", x === b));
    });
    $("#start").onclick = () => { if (!DB.counterCats.length) return toast("Bitte mindestens eine Kategorie wählen"); counterRound(); };
    $("#tables").onclick = counterTables;
  }
  function counterTables() {
    current = { rerender: counterTables };
    const html = Counters.CATEGORIES.map(c => {
      const q = Counters.makeQuestion(c.id);
      return `<h2>${c.label} – ${esc(c.title)}</h2><div class="card"><p class="small muted" style="margin-top:0">${esc(q.info)}</p><table class="tbl">${q.table.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(readingText(r[1].split(" / ")[0]) + (r[1].includes(" / ") ? " / " + r[1].split(" / ").slice(1).map(x => readingText(x)).join(" / ") : ""))}</td></tr>`).join("")}</table></div>`;
    }).join("");
    show("Zählwort-Tabellen", html, { back: countersView });
  }
  function counterRound() {
    const R = { n: 0, total: 10, right: 0 };
    const nextQ = () => {
      if (R.n >= R.total) {
        current = null;
        show("Zählwörter", `<div class="card center"><div class="big-emoji">${R.right >= 8 ? "🏆" : "💪"}</div><h2>${R.right} von ${R.total} richtig</h2>
          <button class="btn primary" id="again">Nochmal</button><button class="btn" id="back">Zurück</button></div>`, { back: countersView });
        $("#again").onclick = counterRound; $("#back").onclick = countersView; return;
      }
      R.n++;
      const q = Counters.makeQuestion(DB.counterCats[Math.floor(Math.random() * DB.counterCats.length)]);
      renderQ(q);
    };
    const renderQ = q => {
      current = { rerender: () => renderQ(q) };
      const mode = DB.settings.counterMode === "speak" && !SR ? "type" : DB.settings.counterMode;
      const ansSet = new Set(q.answers.map(a => Kana.toComparable(a)));
      const wrong = shuffle(uniqBy(q.wrong.filter(x => x && !ansSet.has(Kana.toComparable(x))), x => Kana.toComparable(x))).slice(0, 3);
      const opts = shuffle([q.answers[0], ...wrong]);
      const head = `<div class="progress"><i style="width:${Math.round(100 * (R.n - 1) / R.total)}%"></i></div>
        <div class="stage-label"><span>Zählwörter</span><span>${R.n}/${R.total}</span></div>`;
      let body = "";
      if (mode === "mc") body = `<div class="options">${opts.map((o, i) => `<button class="option jp" data-i="${i}">${esc(readingText(o))}</button>`).join("")}</div>`;
      else if (mode === "type") body = `<form id="f"><input class="answer-input" id="inp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${DB.settings.script === "romaji" ? "z. B. sanbon" : "例：さんぼん"}"><button class="btn primary">Prüfen</button></form>`;
      else body = `<button class="mic" id="mic">🎤</button><button class="btn" id="skip">Aufdecken</button>`;
      show("Zählwörter", head + `<div class="card"><div class="prompt">${q.prompt}<div class="sub">${esc(q.sub)}</div></div>${body}<div id="area"></div></div>`, { back: countersView });
      const finish = (ok, heard) => {
        if (ok) R.right++;
        const all = q.answers.map(a => readingText(a)).join(" / ");
        $("#area").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Richtig wäre:"} <div class="jp">${esc(all)}</div>
          ${heard ? `<div class="small">Verstanden: ${esc(heard)}</div>` : ""}</div>
          <p class="small muted">${esc(q.info)}</p>
          <div class="center"><button class="speak-btn" id="say">🔊 Anhören</button></div>
          <button class="btn primary" id="next">Weiter</button>`;
        say(q.answers[0]);
        $("#say").onclick = () => say(q.answers[0]);
        $("#next").onclick = nextQ;
      };
      if (mode === "mc") {
        $app.querySelectorAll(".option").forEach(b => b.onclick = () => {
          const ok = ansSet.has(Kana.toComparable(opts[+b.dataset.i]));
          $app.querySelectorAll(".option").forEach((x, i) => { x.disabled = true; if (ansSet.has(Kana.toComparable(opts[i]))) x.classList.add("correct"); });
          if (!ok) b.classList.add("wrong");
          finish(ok);
        });
      } else if (mode === "type") {
        const inp = $("#inp"); setTimeout(() => inp.focus(), 50);
        $("#f").onsubmit = e => {
          e.preventDefault(); if (!inp.value.trim()) return;
          inp.disabled = true; $("#f").querySelector("button").remove();
          finish(ansSet.has(Kana.toComparable(inp.value)));
        };
      } else {
        let rec = null; const mic = $("#mic");
        mic.onclick = () => {
          if (rec) { rec.stop(); return; }
          mic.classList.add("listening");
          rec = listen(alts => {
            mic.classList.remove("listening"); rec = null; mic.disabled = true; $("#skip").remove();
            const best = Math.max(...q.answers.map(a => Kana.speechScore(alts, a, "")));
            // Spracherkennung liefert oft Ziffern (3本) – dann gegen die Aufgabe prüfen
            const digitOk = alts.some(a => Kana.stripJP(a) === Kana.stripJP(q.prompt.replace(/<[^>]+>/g, "").replace(/[🎂📅🕐⏱️💴¥.]/gu, "")));
            finish(best >= 0.85 || digitOk, alts[0]);
          }, err => { mic.classList.remove("listening"); rec = null; toast(err === "not-allowed" ? "Mikrofon nicht erlaubt" : "Nichts verstanden – nochmal"); });
        };
        cleanup = () => { try { rec && rec.abort(); } catch (e) { } };
        $("#skip").onclick = () => { mic.disabled = true; $("#skip").remove(); finish(false); };
      }
    };
    nextQ();
  }

  // ---------- Einstellungen ----------
  function settingsView() {
    current = null;
    const s = DB.settings;
    const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(s[key]) === String(v) ? "on" : ""}">${l}</button>`).join("")}</div>`;
    show("Einstellungen", `
      <h2>Schrift</h2>
      <div class="card">
        ${seg("script", [["romaji", "Romaji"], ["kana", "Kana"], ["kanji", "Kanji"]])}
        <p class="small muted">Gilt für Anzeige und Schreiben. Mit dem Knopf oben rechts schnell umschalten.</p>
        <label class="switch-row"><span>Lesehilfe (Furigana) über Kanji</span><input type="checkbox" data-bool="furigana" ${s.furigana ? "checked" : ""}></label>
      </div>
      <h2>Lernen</h2>
      <div class="card">
        <label class="field"><span>Neue Wörter pro Runde</span>${seg("newPerSession", [[4, "4"], [8, "8"], [12, "12"], [20, "20"]])}</label>
        <label class="field"><span>Zeit beim Erinnern (Sekunden)</span>${seg("recallSec", [[3, "3"], [5, "5"], [8, "8"], [12, "12"]])}</label>
        <label class="switch-row"><span>Stufe „Aussprechen“ (Mikrofon)</span><input type="checkbox" data-bool="speak" ${s.speak ? "checked" : ""}></label>
        <label class="switch-row"><span>Stufe „Schreiben“</span><input type="checkbox" data-bool="write" ${s.write ? "checked" : ""}></label>
        <label class="switch-row"><span>Sätze & Ausdrücke mitlernen</span><input type="checkbox" data-bool="phrases" ${s.phrases ? "checked" : ""}></label>
        <label class="field" style="margin-top:10px"><span>Sprechtempo der Vorlesestimme</span>${seg("ttsRate", [[0.6, "langsam"], [0.85, "normal"], [1, "schnell"]])}</label>
        <button class="btn" id="testv">🔊 Stimme testen</button>
      </div>
      <h2>Sicherung</h2>
      <div class="card">
        <p class="small muted" style="margin-top:0">Dein Fortschritt liegt nur auf diesem Gerät. Speichere ab und zu eine Sicherung.</p>
        <button class="btn" id="exp">Sicherung herunterladen</button>
        <label class="btn" style="cursor:pointer">Sicherung laden<input type="file" id="imp" accept="application/json" hidden></label>
        <button class="btn bad" id="reset">Lernfortschritt zurücksetzen</button>
      </div>
      <p class="small muted center">Spracherkennung: ${SR ? "verfügbar ✓" : "nicht verfügbar ✗"} · Japanische Stimme: ${jaVoice ? esc(jaVoice.name) : "Standard"}</p>
    `, { back: home });
    $app.querySelectorAll(".seg[data-key]").forEach(sg => sg.querySelectorAll("button").forEach(b => b.onclick = e => {
      e.preventDefault();
      const k = sg.dataset.key, v = b.dataset.v;
      s[k] = isNaN(+v) ? v : +v; save(); updateScriptBtn();
      sg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
    }));
    $app.querySelectorAll("[data-bool]").forEach(cb => cb.onchange = () => { s[cb.dataset.bool] = cb.checked; save(); });
    $("#testv").onclick = () => say("こんにちは。にほんごを べんきょうしましょう。");
    $("#exp").onclick = () => {
      const blob = new Blob([JSON.stringify(DB, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "nihongo-sicherung-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
    };
    $("#imp").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!d.progress || !d.settings) throw new Error();
        if (!confirm("Sicherung laden? Der aktuelle Stand wird ersetzt.")) return;
        DB = { ...defaults(), ...d }; save(); buildWords(); updateScriptBtn(); toast("Sicherung geladen"); home();
      } catch (err) { toast("Datei ist keine gültige Sicherung"); }
    };
    $("#reset").onclick = () => {
      if (!confirm("Wirklich den gesamten Lernfortschritt löschen? Eigene Wörter bleiben erhalten.")) return;
      DB.progress = {}; DB.log = {}; save(); toast("Zurückgesetzt"); home();
    };
  }

  // ---------- Schreiben üben (Kanji & Kana zeichnen) ----------
  // Strichdaten: KanjiVG (https://kanjivg.tagaini.net), Lizenz CC BY-SA 3.0, Ulrich Apel
  const KVG_SOURCES = [
    "https://raw.githubusercontent.com/KanjiVG/kanjivg/r20240807/kanji/",
    "https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/",
  ];
  const NS = "http://www.w3.org/2000/svg";
  const strokeCache = {};
  async function loadStrokes(ch) {
    if (strokeCache[ch]) return strokeCache[ch];
    const hex = ch.codePointAt(0).toString(16).padStart(5, "0");
    let txt = null;
    for (const base of KVG_SOURCES) {
      try { const res = await fetch(base + hex + ".svg"); if (res.ok) { txt = await res.text(); break; } } catch (e) { }
    }
    if (!txt) throw new Error("nicht geladen");
    const paths = [];
    for (const m of txt.matchAll(/<path\b[^>]*>/g)) {
      const id = /id="kvg:[0-9a-f]+-s(\d+)"/.exec(m[0]), d = /\sd="([^"]+)"/.exec(m[0]);
      if (id && d) paths.push([+id[1], d[1]]);
    }
    if (!paths.length) throw new Error("keine Striche");
    paths.sort((a, b) => a[0] - b[0]);
    return (strokeCache[ch] = paths.map(p => p[1]));
  }
  let measureSvg = null;
  function sampleD(d, n) {
    if (!measureSvg) { measureSvg = document.createElementNS(NS, "svg"); measureSvg.setAttribute("style", "position:absolute;width:0;height:0;visibility:hidden"); document.body.appendChild(measureSvg); }
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); measureSvg.appendChild(p);
    const L = p.getTotalLength(), pts = [];
    for (let i = 0; i < n; i++) { const q = p.getPointAtLength(L * i / (n - 1)); pts.push([q.x, q.y]); }
    p.remove(); return { pts, len: L };
  }
  function resample(points, n) {
    const cum = [0];
    for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const L = cum[cum.length - 1], out = [];
    if (L === 0) return { pts: Array(n).fill(points[0]), len: 0 };
    let j = 0;
    for (let i = 0; i < n; i++) {
      const t = L * i / (n - 1);
      while (j < cum.length - 2 && cum[j + 1] < t) j++;
      const seg = cum[j + 1] - cum[j] || 1, f = (t - cum[j]) / seg;
      out.push([points[j][0] + (points[j + 1][0] - points[j][0]) * f, points[j][1] + (points[j + 1][1] - points[j][1]) * f]);
    }
    return { pts: out, len: L };
  }
  const meanDist = (a, b) => a.reduce((s, p, i) => s + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0) / a.length;
  // Vergleicht einen gezeichneten Strich mit einem Referenzstrich: "ok" | "reverse" | "no"
  function judgeStroke(user, ref, loose) {
    const N = 24, u = resample(user, N), r = sampleD(ref, N);
    const thr = (loose ? 17 : 14) + (r.len < 20 ? 3 : 0);
    if (u.len < 4) { // nur getippt
      const c = r.pts[Math.floor(N / 2)];
      return r.len < 14 && Math.hypot(u.pts[0][0] - c[0], u.pts[0][1] - c[1]) < thr ? "ok" : "no";
    }
    if (u.len < r.len * 0.35 && r.len > 20) return "no";
    const fwd = meanDist(u.pts, r.pts), rev = meanDist(u.pts, r.pts.slice().reverse());
    if (fwd < thr && fwd <= rev) return "ok";
    if (rev < thr) return "reverse";
    return "no";
  }

  function writeState() {
    if (!DB.write) DB.write = { sets: ["hira"], mode: "trace", prog: {} };
    return DB.write;
  }
  function allSets() { return window.KanjiData.SETS; }
  function charScore(c) { const p = writeState().prog[c]; return p ? p.ok - p.fail * 0.5 : -1; }

  function writeView() {
    current = null;
    const W = writeState();
    const sets = allSets().map(s => {
      const done = s.chars.filter(x => charScore(x.c) >= 2).length;
      return `<label class="check"><input type="checkbox" data-s="${s.id}" ${W.sets.includes(s.id) ? "checked" : ""}>
        <span class="main">${esc(s.name)}<br><span class="small muted">${s.chars.length} Zeichen · ${done} sicher</span></span>
        <span class="jp muted">${esc(s.chars.slice(0, 4).map(x => x.c).join(""))}</span></label>`;
    }).join("");
    show("Schreiben üben", `
      <h2 style="margin-top:0">Modus</h2>
      <div class="seg" id="wmode">
        <button data-m="trace" class="${W.mode === "trace" ? "on" : ""}">Nachzeichnen</button>
        <button data-m="help" class="${W.mode === "help" ? "on" : ""}">Mit Hilfe</button>
        <button data-m="free" class="${W.mode === "free" ? "on" : ""}">Aus dem Kopf</button>
      </div>
      <p class="small muted" id="wmodeinfo"></p>
      <button class="btn primary" id="wstart">Üben (10 Zeichen)</button>
      <button class="btn" id="wgrid">Alle Zeichen ansehen</button>
      <h2>Zeichen</h2>
      <div class="card">${sets}</div>
      <p class="small muted">Strichdaten: KanjiVG (CC BY-SA 3.0). Beim ersten Mal braucht jedes Zeichen Internet, danach geht es auch offline.</p>`, { back: home });
    const info = { trace: "Das Zeichen ist grau vorgezeichnet. Ideal zum Kennenlernen.", help: "Kein Vorbild – nur ein Punkt zeigt, wo der nächste Strich beginnt.", free: "Ganz aus dem Kopf. Nach zwei Fehlern gibt es einen Hinweis." };
    const setInfo = () => ($("#wmodeinfo").textContent = info[W.mode]); setInfo();
    $app.querySelectorAll("#wmode button").forEach(b => b.onclick = () => {
      W.mode = b.dataset.m; save(); setInfo();
      $app.querySelectorAll("#wmode button").forEach(x => x.classList.toggle("on", x === b));
    });
    $app.querySelectorAll("input[data-s]").forEach(cb => cb.onchange = () => {
      W.sets = cb.checked ? [...new Set([...W.sets, cb.dataset.s])] : W.sets.filter(x => x !== cb.dataset.s); save();
    });
    $("#wstart").onclick = () => {
      const pool = allSets().filter(s => W.sets.includes(s.id)).flatMap(s => s.chars.map(ch => ({ ...ch, set: s })));
      if (!pool.length) return toast("Bitte mindestens eine Gruppe wählen");
      const picked = pool.map(x => ({ x, k: charScore(x.c) + Math.random() * 2 })).sort((a, b) => a.k - b.k).slice(0, 10).map(o => o.x);
      writeSession(shuffle(picked), writeView);
    };
    $("#wgrid").onclick = writeGrid;
  }

  function writeGrid() {
    current = null;
    const W = writeState();
    const html = allSets().filter(s => W.sets.includes(s.id)).map(s => `<h2>${esc(s.name)}</h2><div class="card char-grid">${s.chars.map(ch => {
      const sc = charScore(ch.c), cls = sc >= 2 ? "good" : sc >= 0 ? "seen" : "";
      return `<button class="char-cell jp ${cls}" data-c="${esc(ch.c)}" data-s="${s.id}">${esc(ch.c)}<small>${esc(ch.r || ch.de)}</small></button>`;
    }).join("")}</div>`).join("") || `<p class="muted">Keine Gruppe gewählt.</p>`;
    show("Alle Zeichen", `<p class="small muted" style="margin-top:0">Tippe ein Zeichen an, um es zu üben. Grün = sicher.</p>${html}`, { back: writeView });
    $app.querySelectorAll(".char-cell").forEach(b => b.onclick = () => {
      const set = allSets().find(s => s.id === b.dataset.s), ch = set.chars.find(x => x.c === b.dataset.c);
      writeSession([{ ...ch, set }], writeGrid);
    });
  }

  function writeSession(list, onExit) {
    const R = { i: 0, perfect: 0 };
    const next = () => {
      if (R.i >= list.length) {
        if (list.length === 1) return onExit();
        current = null;
        show("Schreiben üben", `<div class="card center"><div class="big-emoji">${R.perfect >= list.length * 0.8 ? "🏆" : "✍️"}</div>
          <h2>${R.perfect} von ${list.length} fehlerfrei</h2>
          <button class="btn primary" id="again">Nochmal</button><button class="btn" id="back">Zurück</button></div>`, { back: onExit });
        $("#again").onclick = () => writeSession(shuffle(list), onExit); $("#back").onclick = onExit; return;
      }
      const item = list[R.i++];
      writeChar(item, `${R.i}/${list.length}`, R.i - 1, list.length, perfect => { if (perfect) R.perfect++; next(); }, onExit);
    };
    next();
  }

  function writeChar(item, counter, doneN, total, onDone, onExit) {
    const W = writeState(), mode = W.mode, isKana = item.set.kind === "kana";
    const ch = item.c;
    let prompt;
    if (isKana) {
      prompt = `<div class="de">${esc(item.r)}</div><div class="sub">${esc(item.set.name)} schreiben</div>`;
    } else {
      const rd = s => s ? esc(DB.settings.script === "romaji" ? Kana.kanaToRomaji(s.replace(/[()・]/g, m => m === "・" ? " / " : "")) : s) : "–";
      const ex = WORDS.filter(w => !w.p && w.kanji && w.kanji.includes(ch)).slice(0, 2);
      prompt = `<div class="de">${esc(item.de)}</div>
        <div class="sub">kun: <span class="jp">${rd(item.kun)}</span> · on: <span class="jp">${rd(item.on)}</span></div>
        ${ex.length ? `<div class="sub small">${ex.map(w => `<span class="jp">${esc(mode === "free" ? w.kanji.replace(new RegExp(ch, "g"), "□") : w.kanji)}</span> ${esc(w.de)}`).join(" · ")}</div>` : ""}`;
    }
    const reading = isKana ? ch : (WORDS.find(w => !w.p && w.kanji === ch) || {}).kana
      || (item.kun ? item.kun.split("・")[0].replace(/[()]/g, "") : item.on.split("・")[0]);
    show("Schreiben üben", `
      <div class="progress"><i style="width:${Math.round(100 * doneN / total)}%"></i></div>
      <div class="stage-label"><span>${{ trace: "Nachzeichnen", help: "Mit Hilfe", free: "Aus dem Kopf" }[mode]}</span><span>${counter}</span></div>
      <div class="card">
        <div class="prompt" style="min-height:0;padding:4px 0 10px">${prompt}</div>
        <div class="draw-wrap">
          <svg id="pad" class="pad" viewBox="0 0 109 109">
            <g class="grid"><line x1="54.5" y1="0" x2="54.5" y2="109"/><line x1="0" y1="54.5" x2="109" y2="54.5"/></g>
            <g id="guide" class="guide"></g><g id="hint" class="hintl"></g><g id="done" class="done"></g>
            <polyline id="live" class="live" points=""/>
          </svg>
          <div id="loading" class="pad-msg">Lade Strichdaten …</div>
        </div>
        <p class="center small" id="status">&nbsp;</p>
        <div class="tool-row">
          <button class="speak-btn" id="w-reset">↺ Neu</button>
          <button class="speak-btn" id="w-anim">▶ Reihenfolge</button>
          <button class="speak-btn" id="w-hint">💡 Hinweis</button>
          <button class="speak-btn" id="w-say">🔊</button>
        </div>
        <div id="area"></div>
      </div>`, { back: onExit });
    const pad = $("#pad"), guide = $("#guide"), hintL = $("#hint"), doneL = $("#done"), live = $("#live"), status = $("#status");
    $("#w-say").onclick = () => say(reading);
    let strokes = null, idx = 0, errors = 0, strokeErr = 0, finished = false, animating = false;
    const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
    const setStatus = (t, cls = "") => { status.textContent = t; status.className = "center small " + cls; };

    function drawLayers() {
      guide.innerHTML = ""; doneL.innerHTML = ""; hintL.innerHTML = "";
      if (mode === "trace" || finished) strokes.forEach(d => mk("path", { d }, guide));
      strokes.slice(0, idx).forEach(d => mk("path", { d }, doneL));
      if (!finished && (mode === "trace" || mode === "help")) startDot();
    }
    function startDot() {
      const s = sampleD(strokes[idx], 2).pts;
      mk("circle", { cx: s[0][0], cy: s[0][1], r: 3.2, class: "start-dot" }, hintL);
    }
    function showHint() {
      if (finished || !strokes) return;
      hintL.innerHTML = "";
      const p = mk("path", { d: strokes[idx], class: "hint-path" }, hintL);
      const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 700, fill: "forwards" });
      startDot();
    }
    async function animateAll() {
      if (!strokes || animating) return;
      animating = true; guide.innerHTML = ""; doneL.innerHTML = ""; hintL.innerHTML = "";
      for (const d of strokes) {
        const p = mk("path", { d }, doneL); const L = p.getTotalLength();
        p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
        await p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: Math.max(300, L * 9), fill: "forwards" }).finished;
      }
      await new Promise(r => setTimeout(r, 600));
      animating = false; drawLayers();
    }
    function complete() {
      finished = true; drawLayers();
      const perfect = errors === 0;
      const p = W.prog[ch] || { ok: 0, fail: 0 };
      if (perfect) p.ok++; else p.fail++;
      p.last = Date.now(); W.prog[ch] = p; save(); logCard();
      setStatus(perfect ? "✓ Perfekt – ohne Fehler!" : `✓ Fertig – ${errors} Fehler`, perfect ? "ok-text" : "");
      say(reading);
      $("#area").innerHTML = `<button class="btn primary" id="wnext">Weiter</button>`;
      $("#wnext").onclick = () => onDone(perfect);
    }

    // Zeichnen
    let pts = null;
    const toSvg = e => { const pt = pad.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const q = pt.matrixTransform(pad.getScreenCTM().inverse()); return [q.x, q.y]; };
    pad.addEventListener("pointerdown", e => {
      if (!strokes || finished || animating) return;
      e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (err) { } pts = [toSvg(e)];
      live.setAttribute("points", pts.map(p => p.join(",")).join(" ")); live.classList.remove("bad");
    });
    pad.addEventListener("pointermove", e => {
      if (!pts) return; e.preventDefault();
      pts.push(toSvg(e)); live.setAttribute("points", pts.map(p => p.join(",")).join(" "));
    });
    const up = () => {
      if (!pts) return;
      const user = pts; pts = null;
      const loose = mode === "free";
      const r = judgeStroke(user, strokes[idx], loose);
      if (r === "ok") {
        live.setAttribute("points", ""); idx++; strokeErr = 0; hintL.innerHTML = "";
        const p = mk("path", { d: strokes[idx - 1], class: "just" }, doneL);
        setTimeout(() => p.classList.remove("just"), 350);
        if (idx >= strokes.length) return complete();
        if (mode !== "free") startDot();
        setStatus(`Strich ${idx + 1} von ${strokes.length}`);
        return;
      }
      errors++; strokeErr++;
      let msg = "✗ Das passt nicht ganz – nochmal.";
      if (r === "reverse") msg = "✗ Falsche Richtung – andersherum zeichnen.";
      else {
        const later = strokes.findIndex((d, j) => j > idx && judgeStroke(user, d, loose) === "ok");
        if (later > 0) msg = `✗ Falsche Reihenfolge – das ist Strich ${later + 1}.`;
      }
      setStatus(msg, "bad-text");
      live.classList.add("bad");
      setTimeout(() => { if (!pts) live.setAttribute("points", ""); }, 450);
      if (strokeErr >= 2) showHint();
    };
    pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);

    $("#w-reset").onclick = () => { if (!strokes || animating) return; idx = 0; finished = false; $("#area").innerHTML = ""; setStatus(`Strich 1 von ${strokes.length}`); drawLayers(); };
    $("#w-anim").onclick = animateAll;
    $("#w-hint").onclick = () => { if (strokes && !finished) { errors++; showHint(); setStatus("Hinweis angezeigt (zählt als Fehler)"); } };

    loadStrokes(ch).then(s => {
      strokes = s; $("#loading") && $("#loading").remove();
      setStatus(`Strich 1 von ${strokes.length}`); drawLayers();
    }).catch(() => {
      const l = $("#loading"); if (l) l.textContent = "Strichdaten konnten nicht geladen werden. Bist du online?";
      $("#area").innerHTML = `<button class="btn" id="wskip">Überspringen</button>`;
      $("#wskip").onclick = () => onDone(false);
    });
  }

  // ---------- Start ----------
  buildWords(); save(); updateScriptBtn(); home();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
})();
