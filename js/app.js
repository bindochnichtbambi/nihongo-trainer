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
      settings: { script: "kana", furigana: true, newPerSession: 8, recallSec: 5, speak: true, write: true, phrases: true, ttsRate: 0.85, counterMode: "mc", theme: "stamp", mode: "auto" },
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
  DB.counterCats = (DB.counterCats || []).filter(c => c !== "kal");
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast("Speichern nicht möglich"); } }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }

  // ---------- Wörter ----------
  let WORDS = [], GROUPS = [];
  function buildWords() {
    GROUPS = window.VOCAB_GROUPS.map(g => ({ id: g.id, name: g.name, kind: g.kind, off: !!g.off }));
    GROUPS.push({ id: "custom", name: "Eigene Wörter", kind: "custom" });
    WORDS = [];
    for (const g of window.VOCAB_GROUPS) {
      for (const it of g.items) {
        WORDS.push(mkWord(g.id + "|" + it[0], g.id, it[0], it[1], it[2], it[3] === "p", false));
      }
    }
    for (const c of DB.custom) WORDS.push(mkWord(c.id, c.g || "custom", c.kana, c.kanji, c.de, !!c.p, true));
    if (!DB.groups) DB.groups = GROUPS.filter(g => g.kind !== "extra" && !g.off).map(g => g.id);
  }
  function mkWord(id, g, kana, kanji, de, p, custom) {
    return { id, g, kana, kanji: kanji || "", de, p, custom, romaji: Kana.kanaToRomaji(kana, p) };
  }
  function activeWords() {
    const list = WORDS.filter(w => DB.groups.includes(w.g) && (DB.settings.phrases || !w.p));
    // gleiches Wort in mehreren aktiven Gruppen (z. B. Kurs + Reise) nur einmal – bevorzugt das mit Lernfortschritt
    const key = w => w.kana + "|" + w.kanji, started = new Set(list.filter(w => DB.progress[w.id]).map(key)), seen = new Set();
    return list.filter(w => {
      const k = key(w);
      if (seen.has(k) || (started.has(k) && !DB.progress[w.id])) return false;
      seen.add(k); return true;
    });
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
  const $set = document.getElementById("setBtn");
  $set.onclick = () => settingsView();
  let current = null; // aktuelle Ansicht (für Neu-Rendern)
  let cleanup = null;

  function show(title, html, opts = {}) {
    if (cleanup) { cleanup(); cleanup = null; }
    hideGloss(); playRun++;
    try { speechSynthesis.cancel(); } catch (e) { }
    $title.textContent = title;
    $back.hidden = !opts.back;
    $back.onclick = opts.back || null;
    $title.onclick = opts.back || null;              // auch Tippen auf den Titel geht zurück
    $title.classList.toggle("can-back", !!opts.back);
    // Einstellungen oben: auf der Startseite mit Text, sonst nur Fächer; auf der Einstellungsseite selbst ausgeblendet
    $set.hidden = title === "Einstellungen";
    $set.classList.toggle("short", !!opts.back);
    $app.innerHTML = html;
    window.scrollTo(0, 0);
    syncHistory();
  }
  // Zurück-Geste von Android: ein Verlaufseintrag pro Unterseite, „Zurück“ ruft den Zurück-Knopf auf
  let skipPop = false;
  const inSub = () => history.state && history.state.sub;
  function syncHistory() {
    if (!$back.hidden && !inSub()) history.pushState({ sub: true }, "");
    else if ($back.hidden && inSub()) { skipPop = true; history.back(); }
  }
  history.replaceState({ root: true }, "");
  window.addEventListener("popstate", () => {
    if (skipPop) { skipPop = false; return; }
    if (!$back.hidden && $back.onclick) $back.onclick();
    syncHistory();                                   // z. B. wenn „Lernrunde beenden?“ abgebrochen wurde
  });
  function toast(msg) {
    const t = document.getElementById("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2200);
  }
  function updateScriptBtn() { $script.textContent = SCRIPTS[DB.settings.script]; }
  function applyTheme() {
    const t = DB.settings.theme = "stamp";   // nur noch das Japan-Design
    document.documentElement.dataset.theme = t;
    document.documentElement.dataset.mode = DB.settings.mode || "auto";
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
  // breite, halb so hohe Kachel (Lektionen, Einstellungen)
  const wideTile = (id, ic, emo, t, sub) => `<button class="tile wide beige" id="${id}">
      <span class="ico"><i class="emo">${emo}</i><svg class="pic"><use href="#${/^[a-z]-/.test(ic) ? ic : "i-" + ic}"/></svg></span>
      <span class="wide-txt"><b>${t}</b><small>${sub}</small></span></button>`;
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
        ${learned ? `<button class="btn" id="practice">Gelernte Wörter üben</button>` : ""}
        <p class="small muted center" style="margin:8px 0 0">${fresh} neue Wörter verfügbar · heute ${todayCount} Karten</p>
      </div>
      ${wideTile("m-groups", "torii", "📚", "Lektionen", `${DB.groups.length} von ${GROUPS.length} aktiv`)}
      <div class="tiles">${[
        // Nachschlagen → Sprechen & Lesen → Zahlen & Zeit → Schreiben & Spielen
        ["m-list", "sakura", "🔎", "Wortliste", "Suchen & ergänzen"],
        ["m-grammar", "scroll", "文", "Grammatik", "は, を, に, 〜ます …"],
        ["m-dialog", "tea", "💬", "Gespräche", "Dialoge & Rollenspiel"],
        ["m-story", "fuji", "📖", "Lesebücher", "Geschichten & Fragen"],
        ["m-counters", "soroban", "三", "Zählwörter", "ひとつ, さんぼん …"],
        ["m-cal", "s-calendar", "📅", "Kalender", "きょう, らいしゅう …"],
        ["m-write", "brush", "✍️", "Schreiben", "Kanji & Kana zeichnen"],
        ["m-games", "daruma", "🎮", "Spiele", "Kana-Regen, Sushi, Puzzle"],
      ].map(([id, ic, emo, t, sub], i) => `<button class="tile ${(Math.floor(i / 2) + i % 2) % 2 ? "beige" : "red"}" id="${id}">
          <span class="ico"><i class="emo">${emo}</i><svg class="pic"><use href="#${ic.startsWith("s-") ? ic : "i-" + ic}"/></svg></span>
          <b>${t}</b><small>${sub}</small></button>`).join("")}</div>
    `);
    document.getElementById("m-grammar").onclick = grammarList;
    document.getElementById("m-games").onclick = gamesView;
    document.getElementById("go").onclick = () => startSession();
    if (learned) document.getElementById("practice").onclick = startPractice;
    document.getElementById("m-cal").onclick = () => calendarView();
    document.getElementById("m-groups").onclick = groupsView;
    document.getElementById("m-counters").onclick = countersView;
    document.getElementById("m-list").onclick = () => listView();
    document.getElementById("m-write").onclick = writeView;
    document.getElementById("m-dialog").onclick = dialogList;
    document.getElementById("m-story").onclick = storyList;
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
      <p class="small muted">Neue Wörter kommen in der Reihenfolge der Lektionen dran. Lektion 13–18 sind zu Beginn ausgeschaltet – einfach einschalten, sobald ihr sie im Kurs habt.</p>
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
    S = { queue, done: 0, total: queue.length, right: 0, wrong: 0, finished: new Set(), err: {} };
    nextCard();
  }
  // Extra-Übung mit gelernten Wörtern – verändert den Lernplan nicht
  function startPractice() {
    const learned = WORDS.filter(w => { const p = prog(w); return p && p.s >= 5; });
    if (!learned.length) { toast("Noch keine gelernten Wörter"); return; }
    // schwächere Wörter (kleine Box, kürzlich Fehler) kommen eher dran
    const pick = learned.map(w => ({ w, k: (prog(w).b || 0) - (prog(w).h ? 2 : 0) + Math.random() * 3 }))
      .sort((a, b) => a.k - b.k).slice(0, 15).map(x => ({ w: x.w, st: "r" }));
    S = { queue: shuffle(pick), done: 0, total: pick.length, right: 0, wrong: 0, finished: new Set(), err: {}, practice: true };
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
    if (!ok) S.err[w.id] = (S.err[w.id] || 0) + 1;
    if (S.practice) {
      if (ok) S.finished.add(w.id); else { insertLater({ w, st: "r" }); S.total++; }
    } else if (task.st === "r" || task.review) {
      const p = prog(w);
      if (ok) {
        // h = Extra-Tage: nach Fehlern beim Lernen kommt das Wort zuerst täglich wieder
        if (p.h) { p.h--; p.d = Date.now() + DAY - 3600000; }
        else { p.b = Math.min(p.b + 1, INTERVALS.length - 1); p.d = Date.now() + INTERVALS[p.b] * DAY - 3600000; }
        S.finished.add(w.id);
      }
      else { p.b = 1; p.s = 2; insertLater({ w, st: 2 }); S.total++; }
    } else {
      if (ok) {
        const n = nextStage(task.st, w);
        if (n >= 5) {
          const e = S.err[w.id] || 0;
          DB.progress[w.id] = { s: 5, b: 1, d: Date.now() + DAY - 3600000 };
          if (e) DB.progress[w.id].h = e >= 3 ? 2 : 1;
          S.finished.add(w.id);
        }
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
      <div class="stage-label"><span>${S.practice ? "Extra-Übung · " : task.review ? "Wiederholung · " : ""}${STAGES[task.mode]}</span><span>${S.done}/${S.total}</span></div>
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
      <h2>${S.practice ? "Extra-Übung fertig" : "Lernrunde fertig"}</h2>
      <p>${S.right} richtig · ${S.wrong} falsch<br>${S.practice ? `${n} Wörter geübt<br><span class="small muted">Dein Wiederholungsplan bleibt unverändert.</span>` : `${n} Wörter abgeschlossen`}</p>
      <button class="btn primary" id="again">Noch eine Runde</button>
      <button class="btn" id="home">Zur Startseite</button></div>`);
    $("#again").onclick = S.practice ? startPractice : startSession; $("#home").onclick = home;
  }

  // ---------- Kalender-Lektion ----------
  const CAL_REL = {
    day: { "-2": ["おととい", "一昨日", "vorgestern"], "-1": ["きのう", "昨日", "gestern"], "0": ["きょう", "今日", "heute"], "1": ["あした", "明日", "morgen"], "2": ["あさって", "明後日", "übermorgen"] },
    week: { "-2": ["せんせんしゅう", "先々週", "vorletzte Woche"], "-1": ["せんしゅう", "先週", "letzte Woche"], "0": ["こんしゅう", "今週", "diese Woche"], "1": ["らいしゅう", "来週", "nächste Woche"], "2": ["さらいしゅう", "再来週", "übernächste Woche"] },
    month: { "-2": ["せんせんげつ", "先々月", "vorletzter Monat"], "-1": ["せんげつ", "先月", "letzter Monat"], "0": ["こんげつ", "今月", "dieser Monat"], "1": ["らいげつ", "来月", "nächster Monat"], "2": ["さらいげつ", "再来月", "übernächster Monat"] },
    year: { "-2": ["おととし", "一昨年", "vorletztes Jahr"], "-1": ["きょねん", "去年", "letztes Jahr"], "0": ["ことし", "今年", "dieses Jahr"], "1": ["らいねん", "来年", "nächstes Jahr"], "2": ["さらいねん", "再来年", "übernächstes Jahr"] },
  };
  const CAL_EVERY = [["まいにち", "毎日", "jeden Tag"], ["まいしゅう", "毎週", "jede Woche"], ["まいつき", "毎月", "jeden Monat"], ["まいとし", "毎年", "jedes Jahr (auch: まいねん)"], ["まいあさ", "毎朝", "jeden Morgen"], ["まいばん", "毎晩", "jeden Abend"]];
  const ent = (kana, kanji, de) => ({ kana, kanji, de, romaji: Kana.kanaToRomaji(kana) });
  const relEnt = (t, off) => { const r = CAL_REL[t][off]; return r ? ent(...r) : null; };
  const day0 = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dkey = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const parseKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const monday = d => { const x = day0(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };
  const dayDiff = (a, b) => Math.round((day0(a) - day0(b)) / DAY);
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const rndi = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const MON = () => Counters.MONTHS_DE;
  function yearKana(y) { const r = Counters.numReading(y); return (r.endsWith("よん") ? r.slice(0, -1) : r) + "ねん"; }
  const dowEnt = i => ent(...Counters.YOUBI[i]);
  const dateEnt = d => ent(Counters.GATSU[d.getMonth() + 1] + " " + Counters.HI[d.getDate()], `${d.getMonth() + 1}月${d.getDate()}日`, `${d.getDate()}. ${MON()[d.getMonth() + 1]}`);

  function dayInfo(d) {
    const today = day0(new Date()), diff = dayDiff(d, today), dow = (d.getDay() + 6) % 7;
    const wk = Math.round((monday(d) - monday(today)) / (7 * DAY));
    const items = [], r = relEnt("day", diff);
    if (r) items.push(r);
    else if (Math.abs(diff) <= 10) { const n = Math.abs(diff); items.push(ent(Counters.HI[n] + (diff < 0 ? "まえ" : "ご"), `${n}日${diff < 0 ? "前" : "後"}`, diff < 0 ? `vor ${n} Tagen` : `in ${n} Tagen`)); }
    const w = relEnt("week", wk), y = Counters.YOUBI[dow];
    if (w && diff !== 0) items.push(ent(w.kana + "の " + y[0], w.kanji + "の" + y[1], `${w.de}, ${y[2]}`));
    items.push(dateEnt(d), dowEnt(dow));
    return { title: `${y[2]}, ${d.getDate()}. ${MON()[d.getMonth() + 1]} ${d.getFullYear()}`, items };
  }
  function weekInfo(m0) {
    const wk = Math.round((m0 - monday(new Date())) / (7 * DAY)), su = addDays(m0, 6), r = relEnt("week", wk);
    return { title: `Woche vom ${m0.getDate()}. ${MON()[m0.getMonth() + 1]} bis ${su.getDate()}. ${MON()[su.getMonth() + 1]}`, items: r ? [r] : [],
      note: r ? "" : "Eigene Wörter gibt es nur für ±2 Wochen: せんせんしゅう · せんしゅう · こんしゅう · らいしゅう · さらいしゅう." };
  }
  function monthInfo(y, m) {
    const now = new Date(), r = relEnt("month", (y - now.getFullYear()) * 12 + m - now.getMonth());
    const items = r ? [r] : [];
    items.push(ent(Counters.GATSU[m + 1], `${m + 1}月`, MON()[m + 1]), ent(yearKana(y) + " " + Counters.GATSU[m + 1], `${y}年${m + 1}月`, `${MON()[m + 1]} ${y}`));
    return { title: `${MON()[m + 1]} ${y}`, items };
  }
  function yearInfo(y) {
    const r = relEnt("year", y - new Date().getFullYear()), items = r ? [r] : [];
    items.push(ent(yearKana(y), `${y}年`, `das Jahr ${y}`));
    return { title: `Jahr ${y}`, items, note: "年 (ねん) = Jahr. Achtung: 4年 = よねん." };
  }
  function calInfoHTML(info) {
    return `<div class="cal-info-t">${esc(info.title)}</div>` + info.items.map((e, i) => `<div class="cal-line">
      <div class="cal-w">${jp(e)}<small>${esc(e.de)}</small></div><button class="speak-btn" data-say="${i}">🔊</button></div>`).join("")
      + (info.note ? `<p class="small muted" style="margin:8px 0 0">${esc(info.note)}</p>` : "");
  }
  function calGridHTML(start, weeks, month) {
    const today = day0(new Date());
    let h = `<div class="cal-grid"><span></span>` + Counters.YOUBI.map((y, i) => `<button class="cal-dow${i > 4 ? " we" : ""}" data-dow="${i}">${y[1][0]}</button>`).join("");
    for (let r = 0; r < weeks; r++) {
      const m0 = addDays(start, r * 7), wk = dkey(m0);
      h += `<button class="cal-wk" data-wk="${wk}" aria-label="Woche">週</button>`;
      for (let c = 0; c < 7; c++) {
        const d = addDays(m0, c), cls = ["cal-day"];
        if (c > 4) cls.push("we");
        if (month != null && d.getMonth() !== month) cls.push("out");
        if (dayDiff(d, today) === 0) cls.push("today");
        h += `<button class="${cls.join(" ")}" data-d="${dkey(d)}" data-row="${wk}" data-col="${c}">${d.getDate()}</button>`;
      }
    }
    return h + `</div>`;
  }
  // Zellen eines Ziels finden: {kind: day|week|date|dow|month, k}
  function calCells(t) {
    const all = [...$app.querySelectorAll(".cal-grid button")];
    if (t.kind === "day") return all.filter(b => b.dataset.d === t.k);
    if (t.kind === "week") return all.filter(b => b.dataset.wk === t.k || b.dataset.row === t.k);
    if (t.kind === "date") return all.filter(b => b.dataset.d && parseKey(b.dataset.d).getDate() === t.k);
    if (t.kind === "dow") return all.filter(b => b.dataset.dow == t.k || b.dataset.col == t.k);
    if (t.kind === "month") return all.filter(b => b.dataset.d && !b.classList.contains("out"));
    if (t.kind === "all") return all.filter(b => b.dataset.d);
    return [];
  }

  let CAL = null;
  function calendarView() {
    const now = new Date();
    if (!CAL) CAL = { y: now.getFullYear(), m: now.getMonth(), sel: { t: "day", k: dkey(now) } };
    current = { rerender: calendarView };
    const sel = CAL.sel, start = monday(new Date(CAL.y, CAL.m, 1));
    const weeks = Math.round((monday(new Date(CAL.y, CAL.m + 1, 0)) - start) / (7 * DAY)) + 1;
    const isNow = CAL.y === now.getFullYear() && CAL.m === now.getMonth();
    show("Kalender", `
      <div class="seg" id="calmode"><button class="on">Entdecken</button><button data-m="quiz">Üben</button></div>
      <div class="card cal-card">
        <div class="cal-head">
          <button class="cal-nav" id="prev" aria-label="Monat zurück">‹</button>
          <div class="cal-title"><button id="cy" class="${sel.t === "year" ? "sel" : ""}">${CAL.y}年</button><button id="cm" class="${sel.t === "month" ? "sel" : ""}">${CAL.m + 1}月</button></div>
          <button class="cal-nav" id="next" aria-label="Monat vor">›</button>
        </div>
        ${calGridHTML(start, weeks, CAL.m)}
        <div class="chip-row cal-every">${CAL_EVERY.map((e, i) => `<button class="chip ${sel.t === "every" && sel.i === i ? "on" : ""}" data-ev="${i}">${e[1]}</button>`).join("")}</div>
        ${isNow ? "" : `<button class="btn" id="today" style="margin-top:8px">Zurück zu heute</button>`}
      </div>
      <div class="card" id="calinfo"></div>
      <p class="small muted center">Tippe auf einen Tag, auf 週 (Woche), auf Monat oder Jahr oben, auf einen Wochentag oder auf 毎… (jede/r).</p>`, { back: home });

    // Auswahl markieren und Info zeigen
    let info;
    if (sel.t === "day") { calCells({ kind: "day", k: sel.k }).forEach(b => b.classList.add("sel")); info = dayInfo(parseKey(sel.k)); }
    else if (sel.t === "week") { calCells({ kind: "week", k: sel.k }).forEach(b => b.classList.add(b.dataset.wk ? "sel" : "soft")); info = weekInfo(parseKey(sel.k)); }
    else if (sel.t === "month") { calCells({ kind: "month" }).forEach(b => b.classList.add("soft")); info = monthInfo(CAL.y, CAL.m); }
    else if (sel.t === "year") info = yearInfo(CAL.y);
    else if (sel.t === "dow") {
      calCells({ kind: "dow", k: sel.i }).forEach(b => b.classList.add(b.dataset.dow ? "sel" : "soft"));
      const y = Counters.YOUBI[sel.i];
      info = { title: y[2], items: [dowEnt(sel.i), ent("まいしゅう " + y[0], "毎週" + y[1], "jeden " + y[2])], note: "曜日 (ようび) = Wochentag." };
    } else if (sel.t === "every") {
      const e = CAL_EVERY[sel.i];
      if (sel.i === 0) calCells({ kind: "all" }).forEach(b => b.classList.add("soft"));
      if (sel.i === 1) calCells({ kind: "dow", k: (now.getDay() + 6) % 7 }).forEach(b => b.dataset.d && b.classList.add("soft"));
      if (sel.i === 2) calCells({ kind: "date", k: now.getDate() }).forEach(b => b.classList.add("soft"));
      info = { title: e[2], items: [ent(...e)], note: "毎 (まい) = jede/r. Mit Wochentag: まいしゅう げつようび = jeden Montag." };
    }
    $("#calinfo").innerHTML = calInfoHTML(info);
    $("#calinfo").querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(info.items[+b.dataset.say].kana));
    if (CAL.speak && info.items.length) say(info.items[0].kana);
    CAL.speak = false;

    const pickSel = s => { CAL.sel = s; CAL.speak = true; calendarView(); };
    $app.querySelectorAll(".cal-day").forEach(b => b.onclick = () => {
      const d = parseKey(b.dataset.d); CAL.y = d.getFullYear(); CAL.m = d.getMonth(); pickSel({ t: "day", k: b.dataset.d });
    });
    $app.querySelectorAll(".cal-wk").forEach(b => b.onclick = () => pickSel({ t: "week", k: b.dataset.wk }));
    $app.querySelectorAll(".cal-dow").forEach(b => b.onclick = () => pickSel({ t: "dow", i: +b.dataset.dow }));
    $app.querySelectorAll("[data-ev]").forEach(b => b.onclick = () => pickSel({ t: "every", i: +b.dataset.ev }));
    $("#cy").onclick = () => pickSel({ t: "year" });
    $("#cm").onclick = () => pickSel({ t: "month" });
    const nav = dir => {
      CAL.m += dir; if (CAL.m < 0) { CAL.m = 11; CAL.y--; } if (CAL.m > 11) { CAL.m = 0; CAL.y++; }
      CAL.sel = CAL.sel.t === "year" ? CAL.sel : { t: "month" }; CAL.speak = true; calendarView();
    };
    $("#prev").onclick = () => nav(-1);
    $("#next").onclick = () => nav(1);
    if ($("#today")) $("#today").onclick = () => { CAL = null; calendarView(); };
    $("#calmode [data-m]").onclick = calQuizStart;
  }

  // ---------- Kalender-Übung ----------
  let CQ = null;
  function calQuizStart() { CQ = { n: 0, total: 10, right: 0, last: "" }; calQuizNext(); }
  function calQuizQuestion() {
    const today = day0(new Date()), tw = monday(today), dow = (today.getDay() + 6) % 7;
    let t; do { t = ["tapDay", "tapDay", "tapWeek", "tapDate", "tapDow", "mcDay", "mcWeek", "mcDate", "mcMonth", "mcYear"][rndi(0, 9)]; } while (t === CQ.last);
    CQ.last = t;
    const optsFrom = (type, off, n = 4) => {
      const offs = [-2, -1, 0, 1, 2].filter(o => o !== off).sort(() => Math.random() - .5).slice(0, n - 1);
      return [off, ...offs].sort(() => Math.random() - .5).map(o => relEnt(type, o));
    };
    if (t === "tapDay") { const off = rndi(-2, 2), e = relEnt("day", off); return { e, prompt: `Tippe auf:`, target: { kind: "day", k: dkey(addDays(today, off)) } }; }
    if (t === "tapWeek") { const off = rndi(-2, 2), e = relEnt("week", off); return { e, prompt: `Tippe auf (週 oder einen Tag der Woche):`, target: { kind: "week", k: dkey(addDays(tw, off * 7)) } }; }
    if (t === "tapDate") {
      const d = addDays(tw, rndi(-14, 20)), n = d.getDate();
      return { e: ent(Counters.HI[n], `${n}日`, `der ${n}.`), prompt: `Tippe auf das Datum:`, target: { kind: "date", k: n } };
    }
    if (t === "tapDow") { const i = rndi(0, 6); return { e: dowEnt(i), prompt: `Tippe auf den Wochentag:`, target: { kind: "dow", k: i } }; }
    if (t === "mcDay") { const off = rndi(-2, 2); const opts = optsFrom("day", off); return { e: relEnt("day", off), prompt: "Wie sagt man zum markierten Tag?", mark: { kind: "day", k: dkey(addDays(today, off)) }, opts }; }
    if (t === "mcWeek") { const off = rndi(-2, 2); const opts = optsFrom("week", off); return { e: relEnt("week", off), prompt: "Wie sagt man zur markierten Woche?", mark: { kind: "week", k: dkey(addDays(tw, off * 7)) }, opts }; }
    if (t === "mcDate") {
      const d = addDays(tw, rndi(-14, 20)), n = d.getDate(), H = Counters.HI;
      const e = ent(H[n], `${n}日`, `der ${n}.`);
      const wrong = [...new Set([Counters.numReading(n) + "にち", H[n === 31 ? 30 : n + 1], H[n === 1 ? 2 : n - 1], H[(n + 9) % 31 + 1]])].filter(x => x !== H[n]).slice(0, 3);
      return { e, prompt: "Welches Datum ist markiert?", mark: { kind: "day", k: dkey(d) }, opts: [ent(H[n], "", ""), ...wrong.map(x => ent(x, "", ""))].sort(() => Math.random() - .5) };
    }
    const type = t === "mcMonth" ? "month" : "year", off = rndi(-1, 1);
    return { e: relEnt(type, off), prompt: "Was ist rot markiert?", svg: Counters.calendarSVG(type, off), opts: optsFrom(type, off) };
  }
  function calQuizNext() {
    if (CQ.n >= CQ.total) return calQuizEnd();
    CQ.q = calQuizQuestion(); CQ.done = false;
    calQuizRender();
  }
  function calQuizRender() {
    const q = CQ.q, today = day0(new Date()), start = addDays(monday(today), -14);
    current = { rerender: calQuizRender };
    show("Kalender", `
      <div class="seg" id="calmode"><button data-m="explore">Entdecken</button><button class="on">Üben</button></div>
      <div class="stage-label"><span>Kalender-Übung</span><span>${CQ.n + 1}/${CQ.total}</span></div>
      <div class="card">
        <div class="prompt cal-q"><div class="sub">${esc(q.prompt)}</div>${q.opts ? "" : jp(q.e)}</div>
        ${q.svg || `<div class="cal-head"><div class="cal-title"><span>${today.getFullYear()}年 ${today.getMonth() + 1}月</span></div></div>${calGridHTML(start, 5, today.getMonth())}`}
        ${q.opts ? `<div class="options" style="margin-top:12px">${q.opts.map((o, i) => `<button class="option jp" data-i="${i}">${jp(o)}</button>`).join("")}</div>` : ""}
        <div id="after"></div>
      </div>`, { back: home });
    $("#calmode [data-m]").onclick = () => calendarView();
    if (q.mark) calCells(q.mark).forEach(b => b.classList.add(b.dataset.wk ? "sel" : "qmark"));
    if (!q.opts) {
      say(q.e.kana);
      $app.querySelectorAll(".cal-grid button").forEach(b => b.onclick = () => {
        if (CQ.done) return;
        const ok = calCells(q.target).includes(b);
        if (!ok) b.classList.add("bad");
        calCells(q.target).forEach(x => x.classList.add("ok"));
        calQuizFeedback(ok);
      });
    } else {
      $app.querySelectorAll(".option").forEach(b => b.onclick = () => {
        if (CQ.done) return;
        const ok = q.opts[+b.dataset.i].kana === q.e.kana;
        $app.querySelectorAll(".option").forEach((x, i) => { x.disabled = true; if (q.opts[i].kana === q.e.kana) x.classList.add("correct"); });
        if (!ok) b.classList.add("wrong");
        calQuizFeedback(ok);
      });
    }
  }
  function calQuizFeedback(ok) {
    const q = CQ.q; CQ.done = true; if (ok) CQ.right++;
    say(q.e.kana);
    $("#after").innerHTML = `<div class="cal-line" style="margin-top:12px"><div class="cal-w"><b>${ok ? "✓ Richtig" : "✗ Leider falsch"}</b> ${jp(q.e)}<small>${esc(q.e.de)}</small></div><button class="speak-btn" id="sayq">🔊</button></div>
      <button class="btn ${ok ? "good" : "primary"}" id="next">Weiter</button>`;
    $("#sayq").onclick = () => say(q.e.kana);
    $("#next").onclick = () => { CQ.n++; calQuizNext(); };
  }
  function calQuizEnd() {
    current = null;
    show("Kalender", `<div class="card center"><div class="big-emoji">📅</div><h2>Kalender-Übung fertig</h2>
      <p>${CQ.right} von ${CQ.total} richtig</p>
      <button class="btn primary" id="again">Nochmals üben</button><button class="btn" id="cal">Zum Kalender</button></div>`, { back: home });
    $("#again").onclick = calQuizStart; $("#cal").onclick = () => calendarView();
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
      <div class="cat-grid">${cats.map(c => `<button class="cat ${DB.counterCats.includes(c.id) ? "on" : ""}" data-c="${c.id}">${c.icon ? `<svg class="cat-ic"><use href="#${c.icon}"/></svg>` : ""}<b>${c.label}</b><small>${esc(c.title)}</small></button>`).join("")}</div>
      <h2>Reihenfolge</h2>
      <div class="seg" id="order"><button data-o="rand" class="${DB.settings.counterOrder !== "seq" ? "on" : ""}">Zufällig (10 Fragen)</button><button data-o="seq" class="${DB.settings.counterOrder === "seq" ? "on" : ""}">Der Reihe nach</button></div>
      <h2>Antwortmodus</h2>
      <div class="seg" id="mode"><button data-m="mc" class="${DB.settings.counterMode === "mc" ? "on" : ""}">Auswählen</button><button data-m="type" class="${DB.settings.counterMode === "type" ? "on" : ""}">Tippen</button><button data-m="speak" class="${DB.settings.counterMode === "speak" ? "on" : ""}">Sprechen</button></div>
      <button class="btn primary" id="start">Üben</button>
      <button class="btn" id="tables">📋 Liste: alle der Reihe nach</button>`, { back: home });
    $app.querySelectorAll("#order button").forEach(b => b.onclick = () => {
      DB.settings.counterOrder = b.dataset.o; save();
      $app.querySelectorAll("#order button").forEach(x => x.classList.toggle("on", x === b));
    });
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
    $("#tables").onclick = () => counterTables();
  }
  // Liste: alle Formen der Reihe nach (antippen = anhören)
  function counterTables(only) {
    current = { rerender: () => counterTables(only) };
    const sel = only || (DB.counterCats.length ? DB.counterCats : Counters.CATEGORIES.map(c => c.id));
    const chips = Counters.CATEGORIES.map(c => `<button class="chip ${sel.length === 1 && sel[0] === c.id ? "on" : ""}" data-only="${c.id}">${c.label}</button>`).join("");
    const html = Counters.CATEGORIES.filter(c => sel.includes(c.id)).map(c => {
      const q = Counters.makeQuestion(c.id);
      const rows = q.table.map(r => {
        const first = r[1].split(" / ")[0];
        const reading = r[1].split(" / ").map(x => readingText(x)).join(" / ");
        const pics = r[2] && c.icon ? `<span class="row-pics">${Array(r[2]).fill(`<svg><use href="#${c.icon}"/></svg>`).join("")}</span>` : "";
        return `<tr class="say-row" data-say="${esc(first)}"><td><b>${esc(r[0])}</b>${pics}</td><td>${esc(reading)}</td><td class="spk">🔊</td></tr>`;
      }).join("");
      return `<h2>${q.icon ? `<svg class="h-ic"><use href="#${q.icon}"/></svg>` : ""}${c.label} – ${esc(c.title)}</h2>
        <div class="card"><p class="small muted" style="margin-top:0">${esc(q.info)}</p><table class="tbl list-tbl">${rows}</table>
        <button class="btn" data-play="${c.id}">▶ Alle vorlesen</button></div>`;
    }).join("");
    show("Liste der Reihe nach", `<div class="chip-row"><button class="chip ${sel.length > 1 ? "on" : ""}" data-only="">Auswahl</button>${chips}</div>
      <p class="small muted">Tippe eine Zeile an, um sie zu hören.</p>${html}`, { back: countersView });
    $app.querySelectorAll("[data-only]").forEach(b => b.onclick = () => counterTables(b.dataset.only ? [b.dataset.only] : null));
    $app.querySelectorAll(".say-row").forEach(r => r.onclick = () => say(r.dataset.say));
    $app.querySelectorAll("[data-play]").forEach(b => b.onclick = () => {
      const rows = [...b.closest(".card").querySelectorAll(".say-row")];
      playSeq(rows.map(r => r.dataset.say), i => rows.forEach((r, j) => r.classList.toggle("speaking", j === i)));
    });
  }
  function counterRound() {
    const seq = DB.settings.counterOrder === "seq";
    const list = seq ? DB.counterCats.flatMap(c => Array.from({ length: Counters.seqLength(c) }, (_, k) => [c, k])) : null;
    const R = { n: 0, total: seq ? list.length : 10, right: 0 };
    const nextQ = () => {
      if (R.n >= R.total) {
        current = null;
        show("Zählwörter", `<div class="card center"><div class="big-emoji">${R.right >= R.total * 0.8 ? "🏆" : "💪"}</div><h2>${R.right} von ${R.total} richtig</h2>
          <button class="btn primary" id="again">Nochmal</button><button class="btn" id="back">Zurück</button></div>`, { back: countersView });
        $("#again").onclick = counterRound; $("#back").onclick = countersView; return;
      }
      R.n++;
      const q = seq ? Counters.makeQuestion(list[R.n - 1][0], list[R.n - 1][1])
        : Counters.makeQuestion(DB.counterCats[Math.floor(Math.random() * DB.counterCats.length)]);
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
          ${q.note ? `<p class="center" style="margin:8px 0 0"><b>${esc(q.note)}</b></p>` : ""}<p class="small muted">${esc(q.info)}</p>
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
      <h2>Hell / Dunkel</h2>
      <div class="card">${seg("mode", [["auto", "Wie Handy"], ["light", "Hell"], ["dark", "Dunkel"]])}</div>
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
  // Pinselstrich: Umriss mit wechselnder Breite (kräftiger Ansatz, voller Körper, auslaufende Spitze)
  function brushOutline(pts, W = 4.9) {
    const n = pts.length, f = p => p[0].toFixed(1) + "," + p[1].toFixed(1);
    if (n < 2 || Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]) < 1.5) {
      const [x, y] = pts[0], r = W * 0.6;
      return `M${(x - r).toFixed(1)},${y.toFixed(1)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
    }
    const L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 2)], b = pts[Math.min(n - 1, i + 2)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, t = i / (n - 1);
      let w = W * (0.8 + 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.15)));
      if (t < 0.08) w *= 1.2 - t * 1.5;                       // Ansatz mit Druck
      if (t > 0.7) w *= Math.max(0.28, 1 - (t - 0.7) / 0.3 * 0.72); // auslaufende Spitze
      L.push([pts[i][0] + nx * w / 2, pts[i][1] + ny * w / 2]);
      R.push([pts[i][0] - nx * w / 2, pts[i][1] - ny * w / 2]);
    }
    const r0 = (Math.hypot(L[0][0] - R[0][0], L[0][1] - R[0][1]) / 2).toFixed(1);
    const rn = (Math.hypot(L[n - 1][0] - R[n - 1][0], L[n - 1][1] - R[n - 1][1]) / 2).toFixed(1);
    return "M" + f(L[0]) + " L" + L.slice(1).map(f).join(" L") + ` A${rn},${rn} 0 0 1 ` + f(R[n - 1]) +
      " L" + R.slice(0, -1).reverse().map(f).join(" L") + ` A${r0},${r0} 0 0 1 ` + f(L[0]) + "Z";
  }
  const brushCache = {};
  function brushForD(d) {
    if (brushCache[d]) return brushCache[d];
    const len = sampleD(d, 2).len;
    return (brushCache[d] = brushOutline(sampleD(d, Math.max(6, Math.round(len / 1.4))).pts));
  }
  function liveBrush(pts) {
    if (pts.length < 2) return brushOutline(pts);
    const len = resample(pts, 2).len;
    return brushOutline(resample(pts, Math.max(2, Math.min(140, Math.round(len / 1.4)))).pts);
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
        <div class="draw-wrap scroll"><i class="knob tl"></i><i class="knob tr"></i><i class="knob bl"></i><i class="knob br"></i>
          <svg id="pad" class="pad parchment" viewBox="0 0 109 109">
            <g class="grid"><rect x="6" y="6" width="97" height="97"/><line x1="54.5" y1="6" x2="54.5" y2="103"/><line x1="6" y1="54.5" x2="103" y2="54.5"/></g>
            <g id="guide" class="guide"></g><g id="hint" class="hintl"></g><g id="done" class="done"></g>
            <path id="live" class="live-brush" d=""/>
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
      if (mode === "trace" || finished) strokes.forEach(d => mk("path", { d: brushForD(d), class: "brush" }, guide));
      strokes.slice(0, idx).forEach(d => mk("path", { d: brushForD(d), class: "brush" }, doneL));
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
        const p = mk("path", { d, class: "anim" }, doneL); const L = p.getTotalLength();
        p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
        await p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: Math.max(300, L * 9), fill: "forwards" }).finished;
        p.remove(); mk("path", { d: brushForD(d), class: "brush" }, doneL);
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
      live.setAttribute("d", liveBrush(pts)); live.classList.remove("bad");
    });
    pad.addEventListener("pointermove", e => {
      if (!pts) return; e.preventDefault();
      pts.push(toSvg(e)); live.setAttribute("d", liveBrush(pts));
    });
    const up = () => {
      if (!pts) return;
      const user = pts; pts = null;
      const loose = mode === "free";
      const r = judgeStroke(user, strokes[idx], loose);
      if (r === "ok") {
        live.setAttribute("d", ""); idx++; strokeErr = 0; hintL.innerHTML = "";
        const p = mk("path", { d: brushForD(strokes[idx - 1]), class: "brush just" }, doneL);
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
      setTimeout(() => { if (!pts) live.setAttribute("d", ""); }, 450);
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
  // Avatar: gezeichnet (av-…) oder Emoji
  function avHTML(v) { return String(v).startsWith("av-") ? `<svg class="av-svg"><use href="#${v}"/></svg>` : esc(v); }
  function roleName(d, who) { return tokText({ kana: d.roles[who][0], kanji: "" }); }

  // ---------- Gespräche ----------
  function dialogList() {
    current = { rerender: dialogList };
    const st = DB.dlg || {};
    const groups = [...new Set(window.DIALOGS.map(d => d.lesson))];
    void groups;
    show("Gespräche", `<div class="tiles">` + window.DIALOGS.map((d, i) => {
      const s = st[d.id];
      return `<button class="tile small-tile ${(Math.floor(i / 2) + i % 2) % 2 ? "beige" : "red"}" data-d="${d.id}">
        <span class="ico"><i class="emo">${d.emoji}</i><svg class="pic"><use href="#${d.icon}"/></svg></span>
        <b>${esc(d.title)}</b><small>${esc(d.lesson)}${s && s.gap === 100 ? " · ✓" : ""}</small></button>`;
    }).join("") + `</div><p class="small muted">Tipp: Kurz auf ein Wort tippen = anhören. Lange drücken = Übersetzung.</p>`, { back: home });
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
        <div class="avatar" title="${esc(d.roles[l.who][0])}">${avHTML(d.roles[l.who][1])}</div>
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
          <div class="row">${["A", "B"].map(w => `<button class="btn" data-me="${w}"><span class="avatar big">${avHTML(d.roles[w][1])}</span><br>${roleName(d, w)}</button>`).join("")}</div>
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
        <div class="avatar">${avHTML(d.roles[cur.who][1])}</div>
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
  // Zeichnet eine Illustration aus Hintergrund + Motiven (siehe SCENES in dialogs.js)
  function sceneHTML(sc) {
    if (!sc) return "";
    const bgs = {
      day: `<rect width="200" height="120" class="sky"/><use href="#i-cloud" x="8" y="10" width="54" height="22" class="sc-cloud"/><use href="#i-cloud" x="150" y="30" width="40" height="17" class="sc-cloud"/><rect y="96" width="200" height="24" class="ground"/>`,
      dawn: `<defs><linearGradient id="dawnG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbd2c8"/><stop offset="1" stop-color="#fff3ec"/></linearGradient></defs><rect width="200" height="120" fill="url(#dawnG)"/><rect y="96" width="200" height="24" class="ground"/>`,
      night: `<rect width="200" height="120" class="sky"/>${[[20, 14], [60, 8], [96, 22], [130, 12], [176, 40], [40, 40], [110, 44]].map(([x, y]) => `<use href="#s-star" x="${x}" y="${y}" width="6" height="6"/>`).join("")}<rect y="96" width="200" height="24" class="ground"/>`,
      rain: `<rect width="200" height="120" fill="#dfe4ef"/><g stroke="#9fb0d4" stroke-width="1.6" stroke-linecap="round">${Array.from({ length: 26 }, (_, i) => `<path d="M${(i * 37) % 200} ${(i * 23) % 90} l-3 9"/>`).join("")}</g><rect y="96" width="200" height="24" fill="#c9d1e3"/>`,
      room: `<rect width="200" height="120" class="wall"/><rect y="94" width="200" height="26" class="floor"/><path d="M0 94 H200 M50 94 L40 120 M100 94 V120 M150 94 L160 120" class="tatami"/>`,
    };
    const items = sc.items.map(([id, x, y, w, h]) => `<use href="#${id}" x="${x}" y="${y}" width="${w}" height="${h || w}"/>`).join("");
    return `<svg class="scene ${sc.bg}" viewBox="0 0 200 120" role="img" aria-hidden="true">${bgs[sc.bg] || ""}${items}</svg>`;
  }
  function storyList() {
    current = { rerender: storyList };
    TOKS = [];
    const st = DB.story || {};
    show("Lesebücher", `<div class="story-grid">${window.STORIES.map(s => `<button class="story-card" data-s="${s.id}">
        <svg class="cover-pic"><use href="#${s.icon}"/></svg><div class="cover cover-emo">${s.cover}</div><div class="jp st-title">${tokText({ kana: s.title, kanji: "" })}</div>
        <div class="small muted">${esc(s.de)}</div><div class="small muted">${esc(s.lesson)}${st[s.id] != null ? ` · ${st[s.id]}% ✓` : ""}</div></button>`).join("")}</div>
      <p class="small muted">Tippe ein Wort an, um es zu hören. Lange drücken zeigt die Übersetzung.</p>
      <button class="btn" id="tadoku">📚 Mehr Bücher zum Lesen &amp; Hören (Tadoku)</button>`, { back: home });
    $app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => storyPage(window.STORIES.find(s => s.id === b.dataset.s), 0));
    $("#tadoku").onclick = () => tadokuView();
  }
  // Linkliste zu den kostenlosen Büchern von tadoku.org (werden dort gelesen/angehört, nicht kopiert)
  function tadokuView(lv) {
    lv = lv || DB.tadokuLv || "s";
    current = { rerender: () => tadokuView(lv) };
    const done = DB.tadoku || {}, books = window.TADOKU.filter(b => b[0] === lv);
    const info = window.TADOKU_LEVELS.find(l => l[0] === lv);
    show("Tadoku-Bücher", `
      <div class="seg" id="tlv">${window.TADOKU_LEVELS.map(l => `<button data-l="${l[0]}" class="${l[0] === lv ? "on" : ""}">${l[1]}</button>`).join("")}</div>
      <p class="small muted center" style="margin:8px 0">${esc(info[2])} · ${books.filter(b => done[b[2]]).length} von ${books.length} gelesen</p>
      <div class="card tadoku-list">${books.map(b => `<div class="td-row${done[b[2]] ? " done" : ""}">
          <a class="td-link jp" href="https://tadoku.org/japanese/book/${b[2]}/" target="_blank" rel="noopener">${esc(b[1])}</a>
          <button class="td-check" data-b="${b[2]}" aria-label="gelesen">${done[b[2]] ? "✓" : ""}</button></div>`).join("")}</div>
      <p class="small muted">Die Bücher öffnen sich auf tadoku.org. Dort kannst du sie lesen und meist auch anhören (▶). Tippe danach auf den Kreis, um ein Buch als gelesen abzuhaken.<br>
      Bücher: NPO 多言語多読, Lizenz CC BY-NC-ND 4.0. <a href="https://tadoku.org/japanese/free-books/" target="_blank" rel="noopener">Alle Bücher ansehen</a></p>`, { back: storyList });
    $app.querySelectorAll("#tlv [data-l]").forEach(b => b.onclick = () => { DB.tadokuLv = b.dataset.l; save(); tadokuView(b.dataset.l); });
    $app.querySelectorAll(".td-check").forEach(b => b.onclick = () => {
      DB.tadoku = DB.tadoku || {}; const id = b.dataset.b;
      if (DB.tadoku[id]) delete DB.tadoku[id]; else DB.tadoku[id] = Date.now();
      save(); tadokuView(lv);
    });
  }
  function storyPage(s, p) {
    current = { rerender: () => storyPage(s, p) };
    TOKS = [];
    const pg = s.pages[p], lines = pg.lines.map(parseLine);
    const last = p === s.pages.length - 1;
    show(s.de, `<div class="card story-page">
        ${sceneHTML((window.SCENES[s.id] || [])[p]) || `<div class="pic">${pg.pic}</div>`}
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

  // ---------- Grammatik ----------
  const maxLesson = () => Math.max(2, ...DB.groups.map(id => { const m = /^L\d+-(\d+)$/.exec(id); return m ? +m[1] : 0; }));
  // Beispielsatz je nach Schrift-Einstellung
  const exText = e => DB.settings.script === "romaji" ? Kana.kanaToRomaji(e[0], true) : DB.settings.script === "kanji" && e[1] ? e[1] : e[0];
  const PART_RO = { "は": "wa", "へ": "e", "を": "o" };
  const optText = o => DB.settings.script === "romaji" && /^[぀-ヿ]+$/.test(o) ? (PART_RO[o] || Kana.kanaToRomaji(o)) : o;
  function grammarList() {
    current = { rerender: grammarList };
    const done = DB.gram || {}, maxL = maxLesson();
    show("Grammatik", `
      <p class="small muted">Kurze Erklärungen zu den wichtigsten A1-Punkten, mit Beispielen zum Anhören und einer kleinen Übung. Die Lektionsnummer zeigt, wann es ungefähr im Kurs drankommt.</p>
      <div class="card gram-list">${window.GRAMMAR.map(g => `<button class="gram-row${g.l > maxL ? " later" : ""}" data-g="${g.id}">
          <span class="gram-l">L${g.l}</span>
          <span class="gram-t"><b class="jp">${esc(g.title)}</b><small>${esc(g.sub)}</small></span>
          <span class="gram-s">${done[g.id] != null ? `${done[g.id]}/4 ✓` : "›"}</span></button>`).join("")}</div>`, { back: home });
    $app.querySelectorAll("[data-g]").forEach(b => b.onclick = () => grammarPoint(window.GRAMMAR.find(g => g.id === b.dataset.g)));
  }
  function grammarPoint(g) {
    current = { rerender: () => grammarPoint(g) };
    show("Grammatik", `
      <div class="card">
        <div class="gram-head"><span class="gram-l">L${g.l}</span><h2 class="jp" style="margin:0">${esc(g.title)}</h2></div>
        <p class="muted" style="margin:4px 0 10px">${esc(g.sub)}</p>
        <div class="gram-expl">${g.expl}</div>
      </div>
      <h2>Beispiele</h2>
      <div class="card">${g.ex.map((e, i) => `<div class="cal-line"><div class="cal-w"><span class="jp gram-ex">${esc(exText(e))}</span><small>${esc(e[2])}</small></div>
        <button class="speak-btn" data-say="${i}">🔊</button></div>`).join("")}</div>
      <button class="btn primary" id="gq">Üben (4 Fragen)</button>`, { back: grammarList });
    $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(g.ex[+b.dataset.say][0]));
    $("#gq").onclick = () => grammarQuiz(g, shuffle(g.quiz), 0, 0);
  }
  function grammarQuiz(g, qs, qi, right) {
    if (qi >= qs.length) {
      DB.gram = DB.gram || {}; DB.gram[g.id] = Math.max(DB.gram[g.id] || 0, right); save();
      current = null;
      show("Grammatik", `<div class="card center"><div class="big-emoji">${right === qs.length ? "🏆" : right >= 2 ? "👍" : "💪"}</div>
        <h2>${right} von ${qs.length} richtig</h2><p class="jp">${esc(g.title)}</p>
        <button class="btn primary" id="ga">Nochmal üben</button><button class="btn" id="gb">Erklärung ansehen</button><button class="btn" id="gl">Alle Themen</button></div>`, { back: grammarList });
      $("#ga").onclick = () => grammarQuiz(g, shuffle(g.quiz), 0, 0); $("#gb").onclick = () => grammarPoint(g); $("#gl").onclick = grammarList;
      return;
    }
    const q = qs[qi], opts = shuffle(q.o.map((o, i) => ({ o, ok: i === 0 })));
    const sentence = fill => {
      const [a, b] = q.q.split("＿");
      const t = s => DB.settings.script === "romaji" ? Kana.kanaToRomaji(s, true) : s;
      return `${esc(t(a))}<span class="gap${fill ? " filled" : ""}">${fill ? esc(optText(fill === "（nichts）" ? "—" : fill)) : "　"}</span>${esc(t(b || ""))}`;
    };
    current = { rerender: () => grammarQuiz(g, qs, qi, right) };
    show("Grammatik", `<div class="progress"><i style="width:${Math.round(100 * qi / qs.length)}%"></i></div>
      <div class="stage-label"><span>${esc(g.title)}</span><span>${qi + 1}/${qs.length}</span></div>
      <div class="card"><div class="gram-q jp" id="gs">${sentence("")}</div><p class="muted center" style="margin:6px 0 14px">${esc(q.de)}</p>
        <div class="options">${opts.map((o, i) => `<button class="option jp" data-o="${i}">${esc(optText(o.o))}</button>`).join("")}</div><div id="area"></div></div>`, { back: () => grammarPoint(g) });
    $app.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
      const ok = opts[+b.dataset.o].ok;
      $app.querySelectorAll("[data-o]").forEach((x, i) => { x.disabled = true; if (opts[i].ok) x.classList.add("correct"); });
      if (!ok) b.classList.add("wrong");
      $("#gs").innerHTML = sentence(q.o[0]);
      say(q.q.replace(/（.*?）/g, "").replace("＿", q.o[0] === "（nichts）" ? "" : q.o[0]));
      $("#area").innerHTML = `<button class="btn ${ok ? "good" : "primary"}" id="gn">Weiter</button>`;
      $("#gn").onclick = () => grammarQuiz(g, qs, qi + 1, right + (ok ? 1 : 0));
    });
  }

  // ---------- Spiele ----------
  const gstore = () => DB.games || (DB.games = {});
  const gpick = a => a[Math.floor(Math.random() * a.length)];
  function gamesView() {
    current = { rerender: gamesView };
    const g = gstore();
    show("Spiele", `<div class="games-list">
      ${wideTile("g-rain", "i-sakura", "🌸", "Kana-Regen", `Zeichen oder Wörter, bevor sie landen${g.rain ? ` · Rekord ${g.rain}` : ""}`)}
      ${wideTile("g-sushi", "s-sushi", "🍣", "Sushi-Band", `Nur die passenden Teller schnappen${g.sushi ? ` · Rekord ${g.sushi}` : ""}`)}
      ${wideTile("g-puzzle", "s-bubble", "🧩", "Satz-Puzzle", `Sätze richtig zusammensetzen${g.puzzle ? ` · ${g.puzzle} gelöst` : ""}`)}
      </div>`, { back: home });
    $("#g-rain").onclick = rainStart;
    $("#g-sushi").onclick = sushiStart;
    $("#g-puzzle").onclick = puzzleStart;
  }
  const LIFE = on => `<svg class="life${on ? "" : " off"}" viewBox="-10 -10 20 20"><use href="#i-bloom"/></svg>`;
  const livesHTML = n => LIFE(1).repeat(Math.max(0, n)) + LIFE(0).repeat(Math.max(0, 3 - n));

  // --- Kana-Regen ---
  function rainStart() {
    const g = gstore(), mode = g.rainMode || "kata", words = mode === "words";
    current = null;
    show("Kana-Regen", `
      <div class="seg" id="rmode">${[["kata", "Katakana"], ["hira", "Hiragana"], ["mix", "Gemischt"], ["words", "Wörter"]].map(([v, l]) => `<button data-v="${v}" class="${v === mode ? "on" : ""}">${l}</button>`).join("")}</div>
      <div class="game-hud"><span class="lives" id="r-lives">${livesHTML(3)}</span><span id="r-score">0</span><button class="speak-btn" id="r-snd">${g.mute ? "🔇" : "🔊"}</button></div>
      <div class="rain-field" id="field"><div class="rain-start">${words
        ? `<p>Japanische Wörter fallen herunter. Tippe unten die richtige <b>Bedeutung</b> des <b>roten</b> (untersten) Wortes an, bevor es den Boden berührt.</p>
           <p class="small muted">Es kommen vor allem Wörter, die du schon gelernt hast. Schrift wie oben rechts eingestellt.</p>`
        : `<p>Blüten mit Schriftzeichen fallen herunter. Tippe unten die richtige Lesung der <b>roten</b> (untersten) Blüte an, bevor sie den Boden berührt.</p>
           <p class="small muted">Je mehr Punkte, desto schneller – und später kommen ゛゜ und ゃゅょ dazu.</p>`}
        <p class="small muted">Rekord: ${(words ? g.rainW : g.rain) || 0}</p><button class="btn primary" id="r-go">Los geht's!</button></div></div>
      <div class="rain-opts" id="opts"></div>`, { back: gamesView });
    $app.querySelectorAll("#rmode [data-v]").forEach(b => b.onclick = () => { g.rainMode = b.dataset.v; save(); rainStart(); });
    $("#r-snd").onclick = () => { g.mute = !g.mute; save(); $("#r-snd").textContent = g.mute ? "🔇" : "🔊"; };
    $("#r-go").onclick = () => rainRun(mode);
  }
  // Wörter für den Wort-Regen: zuerst gelernte/angefangene, sonst die aktiven Lektionen
  function rainWords() {
    const ok = w => !w.p && w.kana.length <= 8 && w.de.length <= 26;
    const known = WORDS.filter(w => ok(w) && prog(w));
    const pool = known.length >= 16 ? known : known.concat(activeWords().filter(w => ok(w) && !prog(w)).slice(0, 60 - known.length));
    return uniqBy(pool, w => w.de);
  }
  function rainRun(mode) {
    const g = gstore(), field = $("#field"), opts = $("#opts"), words = mode === "words";
    $("#rmode").classList.add("locked");
    field.innerHTML = "";
    const ro = ch => Kana.kanaToRomaji(ch);
    // Einheitliche „Regentropfen“: show = Anzeige, ans = richtige Antwort, say = Vorlesetext
    const kanaItem = ch => ({ key: ch, show: ch, ans: ro(ch), say: ch, label: `${ch} = ${ro(ch)}` });
    const wordItem = w => ({ key: w.id, show: DB.settings.script === "romaji" ? w.romaji : DB.settings.script === "kanji" && w.kanji ? w.kanji : w.kana, ans: w.de, say: w.kana, label: `${w.kanji || w.kana} = ${w.de}` });
    const levels = words ? [rainWords().map(wordItem)] : window.RAIN.levels(mode).map(l => l.map(kanaItem));
    let pool = levels[0].slice(), level = 0, raf = 0, last = performance.now();
    const st = { score: 0, hits: 0, lives: 3, combo: 0, drops: [], missed: [], spawnT: 0, target: null, over: false };
    const hud = () => { $("#r-score").textContent = st.score; $("#r-lives").innerHTML = livesHTML(st.lives); };
    function spawn() {
      if (st.drops.length >= (words ? 4 : 5)) return;
      let it; for (let n = 0; n < 10; n++) { it = gpick(pool); if (!st.drops.some(d => d.it.key === it.key)) break; }
      const el = document.createElement("div");
      el.className = "drop jp" + (words ? " word" : it.show.length > 1 ? " two" : ""); el.textContent = it.show;
      field.appendChild(el);
      el.style.left = (6 + Math.random() * Math.max(10, field.clientWidth - el.offsetWidth - 12)) + "px";
      el.style.transform = "translateY(-64px)"; st.drops.push({ it, el, y: -64 });
    }
    function buildOpts() {
      if (!st.target) { opts.innerHTML = ""; return; }
      const t = st.target.it, right = t.ans, set = new Set([right]), all = levels.slice(0, level + 1).flat();
      if (!words) { const conf = window.RAIN.CONFUSE[t.key]; if (conf) set.add(ro(conf)); }
      // ähnliche Antworten bevorzugen (gleiche Länge), damit es nicht zu leicht wird
      for (let n = 0; set.size < 4 && n < 200; n++) { const r = gpick(all).ans; if (words || n > 60 || r.length === right.length) set.add(r); }
      opts.innerHTML = shuffle([...set]).map(r => `<button class="opt-btn${words ? " de" : ""}" data-r="${esc(r)}">${esc(r)}</button>`).join("");
      opts.querySelectorAll("button").forEach(b => b.onclick = () => answer(b));
    }
    function pickTarget() {
      const t = st.drops.reduce((a, d) => (!a || d.y > a.y ? d : a), null);
      if (t === st.target) return;
      st.drops.forEach(d => d.el.classList.toggle("target", d === t));
      st.target = t; buildOpts();
    }
    function lose(it) {
      st.lives--; st.combo = 0;
      if (!st.missed.includes(it)) st.missed.push(it);
      field.classList.remove("hit"); void field.offsetWidth; field.classList.add("hit");
      hud(); if (st.lives <= 0) end();
    }
    function answer(b) {
      if (st.over || !st.target) return;
      const t = st.target;
      if (b.dataset.r === t.it.ans) {
        st.combo++; st.hits++; st.score += 10 + 2 * Math.min(st.combo, 10);
        t.el.classList.add("pop"); setTimeout(() => t.el.remove(), 320);
        st.drops = st.drops.filter(d => d !== t); st.target = null;
        if (!g.mute) say(t.it.say);
        hud(); pickTarget();
      } else { b.classList.add("bad"); b.disabled = true; lose(t.it); }
    }
    function frame(now) {
      if (st.over) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (level < levels.length - 1 && st.hits >= (level + 1) * 25) {
        level++; pool = pool.concat(levels[level]);
        toast(level === 1 ? "Neu: Zeichen mit ゛ und ゜ (ga, pa …)" : "Neu: Zeichen mit kleinem ゃゅょ (kya …)");
      }
      // Wörter fallen langsamer – man muss sie erst lesen
      const speed = words ? Math.min(85, 22 + st.hits * 1.1) : Math.min(140, 34 + st.hits * 1.8);
      st.spawnT -= dt;
      if (st.spawnT <= 0 || !st.drops.length) { spawn(); st.spawnT = words ? Math.max(1.8, 3.4 - st.hits * 0.03) : Math.max(0.9, 2.6 - st.hits * 0.025); }
      const H = field.clientHeight;
      for (const d of [...st.drops]) {
        d.y += speed * dt; d.el.style.transform = `translateY(${d.y}px)`;
        if (d.y >= H - d.el.offsetHeight - 4) {
          d.el.remove(); st.drops = st.drops.filter(x => x !== d);
          if (st.target === d) st.target = null;
          lose(d.it); if (st.over) return;
        }
      }
      pickTarget();
      raf = requestAnimationFrame(frame);
    }
    function end() {
      st.over = true; cancelAnimationFrame(raf);
      const key = words ? "rainW" : "rain", best = g[key] || 0, rec = st.score > best;
      if (rec) g[key] = st.score;
      save();
      field.innerHTML = `<div class="rain-start scroll"><div class="big-emoji">${rec ? "🏆" : "🌸"}</div><h2 style="margin:0">${st.score} Punkte</h2>
        <p class="small muted" style="margin:0">${rec ? "Neuer Rekord!" : `Rekord: ${best}`}</p>
        ${st.missed.length ? `<p class="small" style="margin:10px 0 2px">Nochmal anschauen (antippen = anhören):</p>
        <div class="chip-row" style="justify-content:center">${st.missed.map((it, i) => `<button class="chip jp" data-i="${i}">${esc(it.label)}</button>`).join("")}</div>` : ""}
        <button class="btn primary" id="r-again">Nochmal</button></div>`;
      opts.innerHTML = "";
      field.querySelectorAll("[data-i]").forEach(b => b.onclick = () => say(st.missed[+b.dataset.i].say));
      $("#r-again").onclick = rainStart;
      $("#rmode").classList.remove("locked");
    }
    cleanup = () => { st.over = true; cancelAnimationFrame(raf); };
    hud(); raf = requestAnimationFrame(frame);
  }

  // --- Sushi-Band ---
  function sushiStart() {
    const g = gstore(), cats = window.SUSHI_CATS.filter(c => c.id !== g.sushiLast), cat = gpick(cats);
    g.sushiLast = cat.id; save();
    current = null;
    show("Sushi-Band", `
      <div class="sushi-cat">Schnapp dir: <b>${esc(cat.title)}</b></div>
      <div class="game-hud"><span class="lives" id="s-lives">${livesHTML(3)}</span><span id="s-time">⏱ 60</span><span id="s-score">0</span></div>
      <div class="sushi-field" id="sfield"><div class="belt b1"></div><div class="belt b2"></div>
        <div class="rain-start" id="s-intro"><p>Teller mit Wörtern fahren vorbei. Tippe nur die Teller an, die zum Thema <b>${esc(cat.title)}</b> passen. Falsche Teller kosten eine Blüte ❀.</p>
          <button class="btn primary" id="s-go">Los geht's!</button></div></div>
      <div id="s-info" class="sushi-info"></div>`, { back: gamesView });
    $("#s-go").onclick = () => sushiRun(cat);
  }
  function sushiRun(cat) {
    const g = gstore(), field = $("#sfield"), info = $("#s-info");
    $("#s-intro").remove();
    const others = window.SUSHI_CATS.filter(c => c !== cat).flatMap(c => c.items);
    const RIMS = ["#d63a50", "#273560", "#c99a2e", "#4f8a6b"];
    const st = { score: 0, lives: 3, time: 60, plates: [], spawnT: 0, lane: 1, over: false, got: [], wrong: [], missed: [] };
    let raf = 0, last = performance.now();
    const hud = () => { $("#s-score").textContent = st.score; $("#s-lives").innerHTML = livesHTML(st.lives); $("#s-time").textContent = "⏱ " + Math.ceil(st.time); };
    const wordOf = it => ({ kana: it[0], kanji: it[1], de: it[2], romaji: Kana.kanaToRomaji(it[0]) });
    function spawn() {
      const ok = Math.random() < 0.45, w = wordOf(ok ? gpick(cat.items) : gpick(others));
      const lane = st.lane = 1 - st.lane, el = document.createElement("button");
      const txt = DB.settings.script === "romaji" ? w.romaji : DB.settings.script === "kanji" && w.kanji ? w.kanji : w.kana;
      el.className = "plate lane" + lane;
      el.style.setProperty("--rim", gpick(RIMS));
      // Nigiri-Sushi auf dem Teller: Lachs, Thunfisch, Ei oder Garnele – das Wort steht auf dem Belag
      const neta = gpick(["sake", "maguro", "tamago", "ebi", "sake"]);
      const fs = Math.max(11, 20 - 2 * Math.max(0, txt.length - (DB.settings.script === "romaji" ? 6 : 3)));
      el.innerHTML = `<span class="nigiri n-${neta}"><span class="jp" style="font-size:${fs}px">${esc(txt)}</span></span>`;
      const W = field.clientWidth, p = { w, ok, el, lane, x: lane === 0 ? -124 : W + 4, done: false };
      el.style.transform = `translateX(${p.x}px)`; el.onclick = () => tap(p);
      field.appendChild(el); st.plates.push(p);
    }
    function tap(p) {
      if (st.over || p.done) return;
      p.done = true;
      if (p.ok) {
        st.score += 10; st.got.push(p.w); p.el.classList.add("eaten");
        info.innerHTML = `<span class="good-t">✓ ${esc(p.w.kana)} = ${esc(p.w.de)}</span>`;
        if (!g.mute) say(p.w.kana);
      } else {
        st.lives--; st.wrong.push(p.w); p.el.classList.add("wrongp");
        info.innerHTML = `<span class="bad-t">✗ ${esc(p.w.kana)} = ${esc(p.w.de)}</span> – passt nicht`;
        field.classList.remove("hit"); void field.offsetWidth; field.classList.add("hit");
        if (st.lives <= 0) { hud(); return end(); }
      }
      hud();
    }
    function frame(now) {
      if (st.over) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.time -= dt;
      if (st.time <= 0) { st.time = 0; hud(); return end(); }
      const speed = 55 + (60 - st.time) * 1.1, W = field.clientWidth;
      st.spawnT -= dt;
      if (st.spawnT <= 0) { spawn(); st.spawnT = Math.max(0.8, 1.6 - (60 - st.time) / 70); }
      for (const p of [...st.plates]) {
        p.x += (p.lane === 0 ? 1 : -1) * speed * dt;
        p.el.style.transform = `translateX(${p.x}px)`;
        if (p.x > W + 10 || p.x < -130) {
          p.el.remove(); st.plates = st.plates.filter(x => x !== p);
          if (p.ok && !p.done) st.missed.push(p.w);
        }
      }
      hud();
      raf = requestAnimationFrame(frame);
    }
    function end() {
      st.over = true; cancelAnimationFrame(raf);
      const best = g.sushi || 0, rec = st.score > best;
      if (rec) g.sushi = st.score;
      save();
      const chips = arr => `<div class="chip-row" style="justify-content:center">${uniqBy(arr, w => w.kana).map(w => `<button class="chip jp" data-k="${esc(w.kana)}">${esc(w.kana)} = ${esc(w.de)}</button>`).join("")}</div>`;
      field.innerHTML = `<div class="rain-start scroll"><div class="big-emoji">${rec ? "🏆" : "🍣"}</div><h2 style="margin:0">${st.score} Punkte</h2>
        <p class="small muted" style="margin:0">${rec ? "Neuer Rekord!" : `Rekord: ${best}`} · ${st.got.length} richtige Teller</p>
        ${st.wrong.length ? `<p class="small" style="margin:8px 0 2px">Passte nicht zu „${esc(cat.title)}“:</p>${chips(st.wrong)}` : ""}
        ${st.missed.length ? `<p class="small" style="margin:8px 0 2px">Verpasst:</p>${chips(st.missed)}` : ""}
        <button class="btn primary" id="s-again">Nochmal (neues Thema)</button></div>`;
      info.innerHTML = "";
      field.querySelectorAll("[data-k]").forEach(b => b.onclick = () => say(b.dataset.k));
      $("#s-again").onclick = sushiStart;
    }
    cleanup = () => { st.over = true; cancelAnimationFrame(raf); };
    hud(); raf = requestAnimationFrame(frame);
  }

  // --- Satz-Puzzle ---
  let PZ = null;
  function puzzleStart() {
    const lessons = DB.groups.map(id => { const m = /^L\d+-(\d+)$/.exec(id); return m ? +m[1] : 0; });
    const maxL = Math.max(2, ...lessons);
    const pool = window.PUZZLES.filter(p => p.l <= maxL);
    PZ = { round: shuffle(pool).slice(0, Math.min(8, pool.length)), i: 0, right: 0, maxL, cur: null };
    puzzleCard();
  }
  function pzTok(p, i) {
    const sc = DB.settings.script, k = p.k[i];
    if (sc === "kanji") return p.j[i];
    if (sc === "romaji") return ({ "は": "wa", "へ": "e", "を": "o" })[k] || Kana.kanaToRomaji(k);
    return k;
  }
  function puzzleCard() {
    const P = PZ;
    if (P.i >= P.round.length) return puzzleEnd();
    const p = P.round[P.i];
    if (!P.cur || P.cur.p !== p) {
      let order; do { order = shuffle(p.k.map((_, i) => i)); } while (p.k.length > 1 && order.map(i => p.k[i]).join("|") === p.k.join("|"));
      P.cur = { p, order, picked: [], tries: 0, solved: false, bad: [], shown: false };
    }
    const c = P.cur;
    current = { rerender: puzzleCard };
    const roman = DB.settings.script === "romaji" ? " roman" : "";
    show("Satz-Puzzle", `
      <div class="stage-label"><span>Satz-Puzzle · bis Lektion ${P.maxL}</span><span>${P.i + 1}/${P.round.length}</span></div>
      <div class="card">
        <div class="pz-de">${esc(p.de)}</div>
        <div class="pz-line${c.solved ? " ok" : ""}${roman}">${c.picked.length ? c.picked.map((ti, n) => `<button class="pz-chip in${c.bad.includes(n) ? " bad" : ""}" data-n="${n}">${esc(pzTok(p, ti))}</button>`).join("") : `<span class="muted small">Tippe die Teile in der richtigen Reihenfolge an</span>`}</div>
        <div class="pz-pool${roman}">${c.order.map(ti => `<button class="pz-chip" data-t="${ti}" ${c.picked.includes(ti) || c.solved ? "disabled" : ""}>${esc(pzTok(p, ti))}</button>`).join("")}</div>
        <div id="after">${c.solved ? `<div class="pz-ok">${c.shown ? "So wäre es richtig:" : "✓ Richtig!"}</div>
            <div class="center jp" style="font-size:20px">${esc(p.j.join(""))}</div><div class="center small muted">${esc(Kana.kanaToRomaji(p.k.join(" "), true))}</div>
            <div class="row"><button class="btn" id="pz-say">🔊 Anhören</button><button class="btn primary" id="pz-next">Weiter</button></div>`
          : c.bad.length ? `<p class="small center" style="color:var(--bad)">Noch nicht ganz – tippe die roten Teile an, um sie zurückzulegen.</p>${c.tries >= 2 ? `<button class="btn" id="pz-show">Lösung zeigen</button>` : ""}` : ""}</div>
      </div>`, { back: gamesView });
    $app.querySelectorAll(".pz-pool [data-t]").forEach(b => b.onclick = () => {
      c.picked.push(+b.dataset.t); c.bad = [];
      if (c.picked.length === p.k.length) pzCheck(); else puzzleCard();
    });
    if (!c.solved) $app.querySelectorAll(".pz-line [data-n]").forEach(b => b.onclick = () => { c.picked.splice(+b.dataset.n, 1); c.bad = []; puzzleCard(); });
    if ($("#pz-say")) $("#pz-say").onclick = () => say(p.k.join(""));
    if ($("#pz-next")) $("#pz-next").onclick = () => { P.i++; puzzleCard(); };
    if ($("#pz-show")) $("#pz-show").onclick = () => { c.picked = p.k.map((_, i) => i); c.solved = true; c.shown = true; c.bad = []; puzzleCard(); say(p.k.join("")); };
  }
  function pzCheck() {
    const P = PZ, c = P.cur, p = c.p, txt = c.picked.map(i => p.k[i]);
    const goods = [p.k, ...p.alt.map(a => a.map(i => p.k[i]))];
    if (goods.some(gd => gd.join("|") === txt.join("|"))) {
      c.solved = true; if (c.tries === 0) P.right++;
      const g = gstore(); g.puzzle = (g.puzzle || 0) + 1; save();
      puzzleCard(); say(p.k.join(""));
    } else {
      c.tries++;
      c.bad = txt.map((t, n) => (t !== p.k[n] ? n : -1)).filter(n => n >= 0);
      puzzleCard();
    }
  }
  function puzzleEnd() {
    const P = PZ;
    current = null;
    show("Satz-Puzzle", `<div class="card center"><div class="big-emoji">${P.right === P.round.length ? "🏆" : "🧩"}</div>
      <h2>${P.right} von ${P.round.length} Sätzen beim ersten Versuch</h2>
      <p class="small muted">Es kommen Sätze bis Lektion ${P.maxL} – je mehr Lektionen du einschaltest, desto mehr Sätze.</p>
      <button class="btn primary" id="pz-again">Nochmal</button><button class="btn" id="pz-games">Zu den Spielen</button></div>`, { back: gamesView });
    $("#pz-again").onclick = puzzleStart; $("#pz-games").onclick = gamesView;
  }

  // ---------- Start ----------
  buildWords(); save(); updateScriptBtn(); applyTheme(); home();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
})();
