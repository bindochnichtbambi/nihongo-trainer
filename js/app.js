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
      settings: { script: "kana", furigana: true, newPerSession: 8, recallSec: 5, speak: true, write: true, phrases: true, ttsRate: 0.85, counterMode: "mc", theme: "stamp" },
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
    hideGloss(); playRun++;
    try { speechSynthesis.cancel(); } catch (e) { }
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
  function applyTheme() {
    const t = DB.settings.theme || "stamp";
    document.documentElement.dataset.theme = t;
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || (t === "stamp" ? "#ece2cf" : "#c8102e");
  }
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
  // Liest japanischen Text vor; das Promise wird erfüllt, wenn das Vorlesen fertig ist
  function say(text) {
    if (!("speechSynthesis" in window)) { toast("Sprachausgabe nicht verfügbar"); return Promise.resolve(); }
    speechSynthesis.cancel();
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(text.replace(/～/g, "なになに"));
      u.lang = "ja-JP"; u.rate = DB.settings.ttsRate; if (jaVoice) u.voice = jaVoice;
      u.onend = res; u.onerror = res;
      setTimeout(res, 15000);
      speechSynthesis.speak(u);
    });
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
      <div class="card stats-card">
        <div class="stats">
          <div class="stat"><b>${due}</b><span>fällig</span></div>
          <div class="stat"><b>${learning}</b><span>in Arbeit</span></div>
          <div class="stat"><b>${learned}</b><span>gelernt</span></div>
        </div>
        <button class="btn primary" id="go">${due + learning + fresh ? "Vokabeln lernen" : "Alles erledigt 🎉"}</button>
        <p class="small muted center" style="margin:8px 0 0">${fresh} neue Wörter verfügbar · heute ${todayCount} Karten</p>
      </div>
      <button class="btn menu-btn" id="m-groups"><span class="ico"><i class="emo">📚</i><svg class="pic"><use href="#i-torii"/></svg></span><span>Lektionen wählen<small>${DB.groups.length} von ${GROUPS.length} Gruppen aktiv</small></span></button>
      <button class="btn menu-btn" id="m-counters"><span class="ico"><i class="emo">三</i><svg class="pic"><use href="#i-soroban"/></svg></span><span>Zählwörter üben<small>ひとつ, さんぼん, はっぴき, Datum, Uhrzeit, Preise …</small></span></button>
      <button class="btn menu-btn" id="m-dialog"><span class="ico"><i class="emo">💬</i><svg class="pic"><use href="#i-tea"/></svg></span><span>Gespräche<small>Dialoge lesen, Lücken füllen, Rollenspiel mit Mikrofon</small></span></button>
      <button class="btn menu-btn" id="m-story"><span class="ico"><i class="emo">📖</i><svg class="pic"><use href="#i-fuji"/></svg></span><span>Lesebücher<small>Kurze Bildergeschichten mit Fragen zum Text</small></span></button>
      <button class="btn menu-btn" id="m-write"><span class="ico"><i class="emo">✍️</i><svg class="pic"><use href="#i-brush"/></svg></span><span>Schreiben üben<small>Kanji, Hiragana & Katakana mit dem Finger zeichnen</small></span></button>
      <button class="btn menu-btn" id="m-list"><span class="ico"><i class="emo">🔎</i><svg class="pic"><use href="#i-sakura"/></svg></span><span>Wortliste<small>Suchen, eigene Wörter ergänzen</small></span></button>
      <button class="btn menu-btn" id="m-settings"><span class="ico"><i class="emo">⚙️</i><svg class="pic"><use href="#i-fan"/></svg></span><span>Einstellungen<small>Schrift, Stufen, Sicherung</small></span></button>
    `);
    document.getElementById("go").onclick = () => startSession();
    document.getElementById("m-groups").onclick = groupsView;
    document.getElementById("m-counters").onclick = countersView;
    document.getElementById("m-list").onclick = () => listView();
    document.getElementById("m-write").onclick = writeView;
    document.getElementById("m-dialog").onclick = dialogList;
    document.getElementById("m-story").onclick = storyList;
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
      <h2>Design</h2>
      <div class="card">${seg("theme", [["stamp", "Briefmarke"], ["classic", "Klassisch"]])}<p class="small muted" style="margin-bottom:0">Briefmarke: Zinnoberrot, Papier und Holzschnitt-Symbole.</p></div>
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
      s[k] = isNaN(+v) ? v : +v; save(); updateScriptBtn(); applyTheme();
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

  // ---------- Texte mit antippbaren Wörtern ----------
  // Kurz tippen = Wort vorlesen, lange drücken = Übersetzung
  let playRun = 0;          // erhöht sich bei jedem Ansichtswechsel -> bricht laufendes Vorlesen ab
  let TOKS = [];
  let TOKDICT = null;
  const PART = { "は": "wa", "へ": "e", "を": "o" };
  const PART_SAY = { "は": "わ", "へ": "え", "を": "お" };
  function parseTok(t) {
    let gap = false; if (t.startsWith("_")) { gap = true; t = t.slice(1); }
    const [kana, kanji = "", de = ""] = t.split("=");
    return { kana, kanji, de, gap };
  }
  const parseLine = s => s.split("|").map(parseTok);
  const core = s => s.replace(/[。、？！?!,.「」\s]/g, "");
  function tokDict() {
    if (TOKDICT) return TOKDICT;
    TOKDICT = {};
    for (const w of WORDS) { const k = Kana.stripJP(w.kana); if (!TOKDICT[k]) TOKDICT[k] = w.de; if (w.kanji && !TOKDICT[Kana.stripJP(w.kanji)]) TOKDICT[Kana.stripJP(w.kanji)] = w.de; }
    for (const k in window.GLOSS) TOKDICT[Kana.stripJP(k)] = window.GLOSS[k];
    const scan = s => parseLine(s).forEach(p => { const k = Kana.stripJP(p.kana); if (p.de && !TOKDICT[k]) TOKDICT[k] = p.de; });
    window.DIALOGS.forEach(d => d.lines.forEach(l => scan(l[1])));
    window.STORIES.forEach(s => { s.pages.forEach(p => p.lines.forEach(scan)); s.questions.forEach(q => scan(q.q)); });
    return TOKDICT;
  }
  const tokDe = t => t.de || tokDict()[Kana.stripJP(t.kana)] || "";
  function tokRomaji(t) { const c = core(t.kana); return PART[c] ? t.kana.replace(c, PART[c]) : Kana.kanaToRomaji(t.kana); }
  function tokText(t) {
    const sc = DB.settings.script;
    if (sc === "romaji") return esc(tokRomaji(t));
    if (sc === "kanji" && t.kanji && t.kanji !== t.kana) {
      return DB.settings.furigana && Kana.hasKanji(t.kanji) ? `<ruby>${esc(t.kanji)}<rt>${esc(core(t.kana))}</rt></ruby>` : esc(t.kanji);
    }
    return esc(t.kana);
  }
  const tokSay = t => PART_SAY[core(t.kana)] || core(t.kanji || t.kana) || t.kana;
  const lineSay = toks => toks.map(t => t.kanji || t.kana).join("");
  const lineKana = toks => toks.map(t => t.kana).join("");
  const lineKanji = toks => toks.map(t => t.kanji || t.kana).join("");
  function tokHTML(t) { const i = TOKS.push(t) - 1; return `<span class="tok" data-t="${i}">${tokText(t)}</span>`; }
  function lineHTML(toks) { return toks.map(tokHTML).join(DB.settings.script === "romaji" ? " " : ""); }

  const $gloss = document.createElement("div"); $gloss.className = "gloss"; $gloss.hidden = true; document.body.appendChild($gloss);
  function hideGloss() { $gloss.hidden = true; }
  function showGloss(t, el) {
    const de = tokDe(t);
    $gloss.innerHTML = `<div class="g-jp jp">${esc(t.kanji && t.kanji !== t.kana ? t.kanji : t.kana)}</div>
      ${t.kanji && t.kanji !== t.kana ? `<div class="jp small">${esc(core(t.kana))}</div>` : ""}
      <div class="small muted">${esc(tokRomaji(t))}</div>
      <div class="g-de">${esc(de || "(keine Übersetzung hinterlegt)")}</div>`;
    $gloss.hidden = false;
    const r = el.getBoundingClientRect(), g = $gloss.getBoundingClientRect();
    let top = r.top - g.height - 8; if (top < 8) top = r.bottom + 8;
    let left = Math.min(Math.max(8, r.left + r.width / 2 - g.width / 2), innerWidth - g.width - 8);
    $gloss.style.top = top + "px"; $gloss.style.left = left + "px";
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) { }
  }
  let lp = null;
  $app.addEventListener("pointerdown", e => {
    const el = e.target.closest(".tok"); if (!el) { hideGloss(); return; }
    const t = TOKS[+el.dataset.t]; if (!t) return;
    hideGloss();
    lp = { el, t, x: e.clientX, y: e.clientY, fired: false };
    lp.timer = setTimeout(() => { if (lp) { lp.fired = true; showGloss(t, el); } }, 430);
  });
  $app.addEventListener("pointermove", e => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12) { clearTimeout(lp.timer); lp = null; } });
  $app.addEventListener("pointerup", () => {
    if (!lp) return; clearTimeout(lp.timer);
    if (!lp.fired) { lp.el.classList.add("tapped"); const el = lp.el; setTimeout(() => el.classList.remove("tapped"), 300); say(tokSay(lp.t)); }
    lp = null;
  });
  $app.addEventListener("pointercancel", () => { if (lp) clearTimeout(lp.timer); lp = null; });
  $app.addEventListener("contextmenu", e => { if (e.target.closest(".tok")) e.preventDefault(); });
  document.addEventListener("scroll", hideGloss, { passive: true });

  async function playSeq(texts, onStep) {
    const run = ++playRun;
    for (let i = 0; i < texts.length; i++) {
      if (run !== playRun) return false;
      onStep && onStep(i);
      await say(texts[i]);
      await new Promise(r => setTimeout(r, 250));
    }
    if (run === playRun) onStep && onStep(-1);
    return run === playRun;
  }
  function roleName(d, who) { return tokText({ kana: d.roles[who][0], kanji: "" }); }

  // ---------- Gespräche ----------
  function dialogList() {
    current = { rerender: dialogList };
    const st = DB.dlg || {};
    const groups = [...new Set(window.DIALOGS.map(d => d.lesson))];
    show("Gespräche", groups.map(g => `<h2>${esc(g)}</h2>` + window.DIALOGS.filter(d => d.lesson === g).map(d => {
      const s = st[d.id];
      return `<button class="btn menu-btn" data-d="${d.id}"><span class="ico">${d.emoji}</span><span>${esc(d.title)}<small>${d.lines.length} Sätze${s ? ` · Lücken: ${s.gap ?? "–"}% · Rollenspiel: ${s.role ?? "–"}%` : ""}</small></span>${s && s.gap === 100 ? "✅" : ""}</button>`;
    }).join("")).join("") + `<p class="small muted">Tipp: Kurz auf ein Wort tippen = anhören. Lange drücken = Übersetzung.</p>`, { back: home });
    $app.querySelectorAll("[data-d]").forEach(b => b.onclick = () => dialogView(window.DIALOGS.find(d => d.id === b.dataset.d), "read"));
  }
  function saveDlg(id, key, val) { DB.dlg = DB.dlg || {}; const s = DB.dlg[id] = DB.dlg[id] || {}; s[key] = Math.max(s[key] || 0, val); save(); }

  function dialogView(d, mode, state = {}) {
    current = { rerender: () => dialogView(d, mode, state) };
    TOKS = [];
    const lines = d.lines.map(([who, s, de]) => ({ who, toks: parseLine(s), de }));
    const showDe = !!DB.showDe;
    const tabs = `<div class="seg" id="dmode">${[["read", "Lesen"], ["gap", "Lücken"], ["role", "Rollenspiel"]].map(([m, l]) => `<button data-m="${m}" class="${m === mode ? "on" : ""}">${l}</button>`).join("")}</div>`;
    const bubble = (l, i, inner) => `<div class="bubble-row ${l.who === "A" ? "left" : "right"}" data-line="${i}">
        <div class="avatar" title="${esc(d.roles[l.who][0])}">${d.roles[l.who][1]}</div>
        <div class="bubble"><div class="who">${roleName(d, l.who)}</div><div class="line jp">${inner}</div>
        <div class="de-line" ${showDe ? "" : "hidden"}>${esc(l.de)}</div>
        <button class="mini" data-say="${i}" aria-label="Vorlesen">🔊</button></div></div>`;
    const deToggle = `<label class="de-toggle"><input type="checkbox" id="detog" ${showDe ? "checked" : ""}> Übersetzung zeigen</label>`;

    if (mode === "read") {
      show(d.title, `${tabs}<div class="dlg-head">${deToggle}<button class="speak-btn" id="playall">▶ Alles vorlesen</button></div>
        <div class="chat">${lines.map((l, i) => bubble(l, i, lineHTML(l.toks))).join("")}</div>
        <p class="small muted center">Kurz tippen = Wort anhören · lange drücken = Übersetzung</p>`, { back: dialogList });
      $("#playall").onclick = () => playSeq(lines.map(l => lineSay(l.toks)), i => {
        $app.querySelectorAll(".bubble-row").forEach(r => r.classList.toggle("speaking", +r.dataset.line === i));
      });
    } else if (mode === "gap") {
      const gaps = []; // {line, idx, tok}
      lines.forEach((l, li) => l.toks.forEach((t, ti) => { if (t.gap) gaps.push({ li, ti, t }); }));
      state.fill = state.fill || {};
      const html = lines.map((l, li) => bubble(l, li, l.toks.map((t, ti) => {
        if (!t.gap) return tokHTML(t);
        const gi = gaps.findIndex(g => g.li === li && g.ti === ti), f = state.fill[gi];
        const cls = state.checked ? (f && core(f.kana) === core(t.kana) ? "right" : "wrong") : (f ? "filled" : "");
        const txt = f ? tokText(f) : "＿＿";
        const sol = state.checked && cls === "wrong" ? `<span class="sol">${tokText(t)}</span>` : "";
        return `<button class="gap ${cls}" data-g="${gi}">${txt}</button>${sol}`;
      }).join(DB.settings.script === "romaji" ? " " : ""))).join("");
      const filled = Object.keys(state.fill).length;
      show(d.title, `${tabs}<div class="dlg-head">${deToggle}<span class="small muted">${filled}/${gaps.length} ausgefüllt</span></div>
        <div class="chat">${html}</div><div id="sheet"></div>
        ${state.checked ? `<div class="feedback ${state.score === 100 ? "ok" : "no"}">${state.score}% richtig</div>
          <div class="row"><button class="btn" id="again">Nochmal</button><button class="btn primary" id="toRole">Rollenspiel</button></div>`
          : `<button class="btn primary" id="check" ${filled < gaps.length ? "disabled" : ""}>Prüfen</button>`}`, { back: dialogList });
      if (!state.checked) {
        $app.querySelectorAll(".gap").forEach(b => b.onclick = () => {
          const gi = +b.dataset.g, g = gaps[gi];
          const others = gaps.filter((_, k) => k !== gi).map(x => x.t);
          const extra = shuffle(WORDS.filter(w => !w.p && w.g === (WORDS.find(x => core(Kana.stripJP(x.kana)) === Kana.stripJP(core(g.t.kana))) || {}).g)).slice(0, 3).map(w => ({ kana: w.kana, kanji: w.kanji }));
          const opts = shuffle(uniqBy([g.t, ...shuffle(others).slice(0, 2), ...extra, ...shuffle(WORDS.filter(w => !w.p)).slice(0, 3)], x => core(x.kana)).slice(0, 4));
          $app.querySelectorAll(".gap").forEach(x => x.classList.toggle("active", x === b));
          $("#sheet").innerHTML = `<div class="card sheet"><div class="small muted">Welches Wort passt?</div><div class="options">${opts.map((o, i) => `<button class="option jp" data-o="${i}">${tokText(o)}</button>`).join("")}</div></div>`;
          $("#sheet").scrollIntoView({ behavior: "smooth", block: "nearest" });
          $app.querySelectorAll("[data-o]").forEach(ob => ob.onclick = () => { state.fill[gi] = opts[+ob.dataset.o]; dialogView(d, "gap", state); });
        });
        $("#check").onclick = () => {
          const right = gaps.filter((g, gi) => state.fill[gi] && core(state.fill[gi].kana) === core(g.t.kana)).length;
          state.checked = true; state.score = Math.round(100 * right / gaps.length);
          saveDlg(d.id, "gap", state.score); dialogView(d, "gap", state);
        };
      } else {
        $("#again").onclick = () => dialogView(d, "gap", {});
        $("#toRole").onclick = () => dialogView(d, "role", {});
      }
    } else if (mode === "role") {
      if (!state.me) {
        show(d.title, `${tabs}<div class="card center"><p>Welche Rolle sprichst du?</p>
          <div class="row">${["A", "B"].map(w => `<button class="btn" data-me="${w}"><span class="big-emoji" style="font-size:36px">${d.roles[w][1]}</span><br>${roleName(d, w)}</button>`).join("")}</div>
          <p class="small muted">Die App spricht die andere Rolle. Du siehst deinen Satz auf Deutsch und sagst ihn auf Japanisch.${SR ? "" : "<br>Spracherkennung ist hier nicht verfügbar – du bewertest dich selbst."}</p></div>`, { back: dialogList });
        $app.querySelectorAll("[data-me]").forEach(b => b.onclick = () => dialogView(d, "role", { me: b.dataset.me, i: 0, ok: 0, mine: 0 }));
      } else {
        roleplay(d, lines, state, tabs, bubble, deToggle);
      }
    }
    $app.querySelectorAll("#dmode button").forEach(b => b.onclick = () => dialogView(d, b.dataset.m, {}));
    const dt = $("#detog"); if (dt) dt.onchange = () => { DB.showDe = dt.checked; save(); $app.querySelectorAll(".de-line").forEach(x => x.hidden = !dt.checked); };
    $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(lineSay(lines[+b.dataset.say].toks)));
  }

  function roleplay(d, lines, st, tabs, bubble, deToggle) {
    const shown = lines.slice(0, st.i);
    const done = st.i >= lines.length;
    const cur = lines[st.i];
    let curHTML = "";
    if (!done && cur.who === st.me) {
      curHTML = `<div class="bubble-row ${cur.who === "A" ? "left" : "right"} mine">
        <div class="avatar">${d.roles[cur.who][1]}</div>
        <div class="bubble"><div class="who">Du</div><div class="de-prompt">${esc(cur.de)}</div>
        <div class="line jp" id="myline" ${st.reveal ? "" : "hidden"}>${lineHTML(cur.toks)}</div>
        <button class="mini" id="peek">${st.reveal ? "" : "👁 Japanisch zeigen"}</button></div></div>`;
    }
    show(d.title, `${tabs}<div class="dlg-head">${deToggle}<span class="small muted">${Math.min(st.i, lines.length)}/${lines.length}</span></div>
      <div class="chat">${shown.map((l, i) => bubble(l, i, lineHTML(l.toks))).join("")}${curHTML}</div>
      <div id="rp-area"></div>`, { back: dialogList });
    const area = $("#rp-area");
    const scrollEnd = () => setTimeout(() => area.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    const nextLine = () => { st.i++; st.reveal = false; dialogView(d, "role", st); };
    if (done) {
      const pct = st.mine ? Math.round(100 * st.ok / st.mine) : 100;
      saveDlg(d.id, "role", pct);
      area.innerHTML = `<div class="card center"><div class="big-emoji">${pct >= 80 ? "🎉" : "💪"}</div><h2>${st.ok} von ${st.mine} Sätzen gut gesprochen</h2>
        <div class="row"><button class="btn" id="rp-again">Andere Rolle</button><button class="btn primary" id="rp-back">Fertig</button></div></div>`;
      $("#rp-again").onclick = () => dialogView(d, "role", { me: st.me === "A" ? "B" : "A", i: 0, ok: 0, mine: 0 });
      $("#rp-back").onclick = dialogList; scrollEnd(); return;
    }
    if (cur.who !== st.me) {
      area.innerHTML = `<p class="center muted small">${roleName(d, cur.who)} spricht …</p>`;
      const run = playRun;
      const row = document.createElement("div"); row.innerHTML = bubble(cur, st.i, lineHTML(cur.toks));
      $app.querySelector(".chat").appendChild(row.firstElementChild);
      $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(lineSay(lines[+b.dataset.say].toks)));
      scrollEnd();
      say(lineSay(cur.toks)).then(() => setTimeout(() => { if (run === playRun) nextLine(); }, 500));
      return;
    }
    // Eigene Zeile
    const peek = $("#peek");
    peek.onclick = () => { st.reveal = true; $("#myline").hidden = false; peek.remove(); };
    if (st.reveal) peek.remove();
    const target = { kana: lineKana(cur.toks), kanji: lineKanji(cur.toks) };
    const finish = (ok, heard) => {
      st.mine++; if (ok) st.ok++;
      $("#myline").hidden = false; const p = $("#peek"); if (p) p.remove();
      area.innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Gut gesagt!" : "✗ Noch nicht ganz."}${heard ? `<div class="small">Verstanden: <span class="jp">${esc(heard)}</span></div>` : ""}</div>
        <div class="row"><button class="btn" id="rp-hear">🔊 Anhören</button>${!ok && heard ? `<button class="btn" id="rp-override">War doch richtig</button>` : ""}</div>
        <button class="btn primary" id="rp-next">Weiter</button>`;
      $("#rp-hear").onclick = () => say(lineSay(cur.toks));
      const ov = $("#rp-override"); if (ov) ov.onclick = () => { st.ok++; nextLine(); };
      $("#rp-next").onclick = nextLine; scrollEnd();
    };
    if (SR) {
      area.innerHTML = `<button class="mic" id="rp-mic">🎤</button><p class="center small muted" id="rp-msg">Tippe aufs Mikrofon und sprich deinen Satz</p>
        <div class="row"><button class="btn" id="rp-skip">Überspringen</button></div>`;
      let rec = null; const mic = $("#rp-mic");
      mic.onclick = () => {
        if (rec) { rec.stop(); return; }
        mic.classList.add("listening"); $("#rp-msg").textContent = "Ich höre zu …";
        rec = listen(alts => {
          mic.classList.remove("listening"); rec = null;
          finish(Kana.speechScore(alts, target.kana, target.kanji) >= 0.6, alts[0]);
        }, err => { mic.classList.remove("listening"); rec = null; $("#rp-msg").textContent = err === "not-allowed" ? "Mikrofon nicht erlaubt" : "Nichts verstanden – nochmal"; });
      };
      cleanup = () => { try { rec && rec.abort(); } catch (e) { } };
      $("#rp-skip").onclick = () => finish(false);
    } else {
      area.innerHTML = `<p class="center small muted">Sag den Satz laut, dann deck auf.</p><div class="row"><button class="btn bad" id="rp-no">Wusste ich nicht</button><button class="btn good" id="rp-yes">Konnte ich</button></div>`;
      $("#rp-no").onclick = () => finish(false); $("#rp-yes").onclick = () => finish(true);
    }
    scrollEnd();
  }

  // ---------- Lesebücher ----------
  function storyList() {
    current = { rerender: storyList };
    TOKS = [];
    const st = DB.story || {};
    show("Lesebücher", `<div class="story-grid">${window.STORIES.map(s => `<button class="story-card" data-s="${s.id}">
        <div class="cover">${s.cover}</div><div class="jp st-title">${tokText({ kana: s.title, kanji: "" })}</div>
        <div class="small muted">${esc(s.de)}</div><div class="small muted">${esc(s.lesson)}${st[s.id] != null ? ` · ${st[s.id]}% ✓` : ""}</div></button>`).join("")}</div>
      <p class="small muted">Tippe ein Wort an, um es zu hören. Lange drücken zeigt die Übersetzung.</p>`, { back: home });
    $app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => storyPage(window.STORIES.find(s => s.id === b.dataset.s), 0));
  }
  function storyPage(s, p) {
    current = { rerender: () => storyPage(s, p) };
    TOKS = [];
    const pg = s.pages[p], lines = pg.lines.map(parseLine);
    const last = p === s.pages.length - 1;
    show(s.de, `<div class="card story-page">
        <div class="pic">${pg.pic}</div>
        <div class="story-text jp">${lines.map(l => `<p>${lineHTML(l)}</p>`).join("")}</div>
        <div class="de-line" ${DB.showDe ? "" : "hidden"}>${esc(pg.de)}</div>
        <div class="tool-row"><button class="speak-btn" id="sp-read">🔊 Vorlesen</button><button class="speak-btn" id="sp-de">🇩🇪 Übersetzung</button></div>
      </div>
      <div class="dots">${s.pages.map((_, i) => `<i class="${i === p ? "on" : ""}"></i>`).join("")}</div>
      <div class="row"><button class="btn" id="sp-prev" ${p === 0 ? "disabled" : ""}>‹ Zurück</button>
      <button class="btn primary" id="sp-next">${last ? "Fragen zum Text" : "Weiter ›"}</button></div>`, { back: storyList });
    $("#sp-read").onclick = () => playSeq(lines.map(lineSay), i => $app.querySelectorAll(".story-text p").forEach((x, k) => x.classList.toggle("speaking", k === i)));
    $("#sp-de").onclick = () => { DB.showDe = !DB.showDe; save(); $(".de-line").hidden = !DB.showDe; };
    $("#sp-prev").onclick = () => storyPage(s, p - 1);
    $("#sp-next").onclick = () => last ? storyQuiz(s, 0, 0) : storyPage(s, p + 1);
  }
  function storyQuiz(s, qi, right) {
    current = { rerender: () => storyQuiz(s, qi, right) };
    TOKS = [];
    if (qi >= s.questions.length) {
      const pct = Math.round(100 * right / s.questions.length);
      DB.story = DB.story || {}; DB.story[s.id] = Math.max(DB.story[s.id] || 0, pct); save(); logCard();
      show(s.de, `<div class="card center"><div class="big-emoji">${pct === 100 ? "🏆" : pct >= 50 ? "📖" : "💪"}</div>
        <h2>${right} von ${s.questions.length} Fragen richtig</h2>
        <button class="btn primary" id="sq-again">Geschichte nochmal lesen</button><button class="btn" id="sq-list">Andere Geschichte</button></div>`, { back: storyList });
      $("#sq-again").onclick = () => storyPage(s, 0); $("#sq-list").onclick = storyList; return;
    }
    const q = s.questions[qi], opts = shuffle(q.a.map((a, i) => ({ a, ok: i === 0 })));
    const optText = a => DB.settings.script === "romaji" ? esc(Kana.kanaToRomaji(a, true)) : esc(a);
    show(s.de, `<div class="progress"><i style="width:${Math.round(100 * qi / s.questions.length)}%"></i></div>
      <div class="stage-label"><span>Textverständnis</span><span>${qi + 1}/${s.questions.length}</span></div>
      <div class="card"><div class="story-text jp">${lineHTML(parseLine(q.q))}</div>
      <div class="de-line" ${DB.showDe ? "" : "hidden"}>${esc(q.de)}</div>
      <div class="tool-row" style="margin:6px 0 12px"><button class="speak-btn" id="sq-say">🔊</button><button class="speak-btn" id="sq-de">🇩🇪 Übersetzung</button></div>
      <div class="options">${opts.map((o, i) => `<button class="option jp" data-o="${i}">${optText(o.a)}</button>`).join("")}</div><div id="area"></div></div>`, { back: storyList });
    $("#sq-say").onclick = () => say(lineSay(parseLine(q.q)));
    $("#sq-de").onclick = () => { DB.showDe = !DB.showDe; save(); $(".de-line").hidden = !DB.showDe; };
    $app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
      const ok = opts[+b.dataset.o].ok;
      $app.querySelectorAll("[data-o]").forEach((x, i) => { x.disabled = true; if (opts[i].ok) x.classList.add("correct"); });
      if (!ok) b.classList.add("wrong");
      $("#area").innerHTML = `<button class="btn primary" id="sq-next">Weiter</button>`;
      $("#sq-next").onclick = () => storyQuiz(s, qi + 1, right + (ok ? 1 : 0));
    });
  }

  // ---------- Start ----------
  buildWords(); save(); updateScriptBtn(); applyTheme(); home();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
})();
