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
      settings: { script: "kana", furigana: true, newPerSession: 8, recallSec: 5, speak: true, write: true, phrases: true, ttsRate: 0.85, counterMode: "mc", theme: "stamp", mode: "auto", decoAnim: true },
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
  // umbenannte Wörter: Lernstand mitnehmen
  // v41: Wörter, die im Kurs schon in Lektion 3 kommen, von L11-12 nach L3-4 verschoben
  [["L3-4|パートナー", "L3-4|かれし"], ...["えいご", "ドイツご", "フランスご", "スペインご", "できます", "すこし", "すごい"].map(w => ["L11-12|" + w, "L3-4|" + w])].forEach(([a, b]) => { if (DB.progress && DB.progress[a] && !DB.progress[b]) { DB.progress[b] = DB.progress[a]; delete DB.progress[a]; } });
  // v37: Lektion 13–14 ist jetzt in zwei Gruppen geteilt (L13-13, L14-14) – Auswahl und Lernstand übernehmen
  (function splitL1314() {
    const find = id => (window.VOCAB_GROUPS.find(g => g.id === id) || { items: [] }).items.map(it => it[0]);
    const l13 = find("L13-13"), l14 = find("L14-14");
    if (DB.groups && DB.groups.includes("L13-14")) DB.groups = [...new Set(DB.groups.filter(g => g !== "L13-14").concat(["L13-13", "L14-14"]))];
    Object.keys(DB.progress || {}).filter(k => k.startsWith("L13-14|")).forEach(k => {
      const kana = k.slice(7), to = l13.includes(kana) ? "L13-13" : l14.includes(kana) ? "L14-14" : null;
      if (!to) return;                                   // Wort gibt es nicht mehr: Lernstand liegen lassen
      if (!DB.progress[to + "|" + kana]) DB.progress[to + "|" + kana] = DB.progress[k];
      delete DB.progress[k];
    });
  })();
  // v42: Doppel-Lektionen (L1-2, L3-4 …) in einzelne Lektionen (L1-1, L2-2 …) geteilt – Auswahl und Lernstand übernehmen
  (function splitPairs() {
    const items = id => (window.VOCAB_GROUPS.find(g => g.id === id) || { items: [] }).items.map(it => it[0]);
    let changed = false;
    [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [15, 16], [17, 18]].forEach(([a, b]) => {
      const old = `L${a}-${b}`, ga = `L${a}-${a}`, gb = `L${b}-${b}`, ka = items(ga), kb = items(gb);
      if (DB.groups && DB.groups.includes(old)) { DB.groups = [...new Set(DB.groups.filter(g => g !== old).concat([ga, gb]))]; changed = true; }
      Object.keys(DB.progress || {}).filter(k => k.startsWith(old + "|")).forEach(k => {
        const kana = k.slice(old.length + 1);
        const to = [ga, gb].find(g => (g === ga ? ka : kb).includes(kana) && !DB.progress[g + "|" + kana]);
        if (to) DB.progress[to + "|" + kana] = DB.progress[k];
        if (to || [ga, gb].some(g => DB.progress[g + "|" + kana])) delete DB.progress[k];
        changed = true;
      });
    });
    if (changed) try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { }
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast("Speichern nicht möglich"); } }
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { }

  // ---------- Wörter ----------
  let WORDS = [], GROUPS = [];
  function buildWords() {
    GROUPS = window.VOCAB_GROUPS.map(g => ({ id: g.id, name: g.name, kind: g.kind, off: !!g.off, topic: g.topic }));
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
    // Wolken & Blüten bewegen sich nur auf der Startseite (abschaltbar in den Einstellungen)
    document.body.classList.toggle("on-home", title === "日本語 Trainer" && DB.settings.decoAnim !== false);
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
  let jaVoice = null, jaVoices = [];
  const MALE_V = /male(?!.*female)|男|otoya|ichiro|keita|kenji|takumi|daichi|naoki|hiroshi|-jab-|-jad-/i;
  const FEMALE_V = /female|女|kyoko|haruka|ayumi|nanami|sayaka|mizuki|kaori|-htm-|-jac-/i;
  function pickVoice() {
    const vs = speechSynthesis.getVoices();
    jaVoices = vs.filter(v => v.lang && v.lang.replace("_", "-").startsWith("ja"));
    jaVoice = jaVoices.find(v => /google/i.test(v.name)) || jaVoices[0] || null;
  }
  if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  // Stimme je Figur: Mann, Frau, Kind, älterer Mann. Gibt es mehrere japanische Stimmen, wird eine passende gewählt,
  // sonst wird die Tonhöhe angepasst.
  const VOICE_KIND = { "av-man": "m", "av-chef": "m", "av-police": "m", "av-staff": "m", "av-traveler": "m", "av-woman": "f", "av-girl": "g", "av-boy": "b", "av-oldman": "o" };
  const VOICE_SET = { m: { pitch: 0.75, rate: 1 }, o: { pitch: 0.6, rate: 0.9 }, f: { pitch: 1.2, rate: 1 }, g: { pitch: 1.55, rate: 1.05 }, b: { pitch: 1.4, rate: 1.05 } };
  function voiceFor(kind) {
    const v = VOICE_SET[kind]; if (!v) return null;
    const male = kind === "m" || kind === "o";
    const match = jaVoices.find(x => (male ? MALE_V : FEMALE_V).test(x.name + " " + (x.voiceURI || "")));
    return { ...v, voice: match || null };
  }
  // Liest japanischen Text vor; das Promise wird erfüllt, wenn das Vorlesen fertig ist
  function say(text, vo) {
    if (!("speechSynthesis" in window)) { toast("Sprachausgabe nicht verfügbar"); return Promise.resolve(); }
    speechSynthesis.cancel();
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(text.replace(/～/g, "なになに"));
      u.lang = "ja-JP"; u.rate = DB.settings.ttsRate * (vo && vo.rate || 1);
      const voice = (vo && vo.voice) || jaVoice; if (voice) u.voice = voice;
      if (vo && vo.pitch) u.pitch = vo.voice ? 1 + (vo.pitch - 1) * 0.4 : vo.pitch;
      u.onend = res; u.onerror = res;
      setTimeout(res, 15000);
      speechSynthesis.speak(u);
    });
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function listen(onResult, onEnd, opts = {}) {
    if (!SR) { onEnd && onEnd("unsupported"); return null; }
    if (opts.long) return listenLong(onResult, onEnd, opts);
    const r = new SR();
    r.lang = "ja-JP"; r.interimResults = false; r.maxAlternatives = 5; r.continuous = false;
    let got = false;
    r.onresult = e => { got = true; const alts = []; for (const a of e.results[0]) alts.push(a.transcript); onResult(alts); };
    r.onerror = e => { onEnd && onEnd(e.error); };
    r.onend = () => { if (!got) onEnd && onEnd("nomatch"); };
    try { r.start(); } catch (e) { onEnd && onEnd("error"); }
    return r;
  }
  // Langes Zuhören (Rollenspiel): Pausen zum Überlegen sind erlaubt. Die Aufnahme endet erst,
  // wenn man nochmals aufs Mikrofon tippt, nach längerer Stille (pause ms) oder nach max ms.
  function listenLong(onResult, onEnd, opts) {
    const pause = opts.pause || 4500, max = opts.max || 30000;
    let parts = [], alts0 = [], live = "", stopped = false, done = false, rec = null, tPause = null;
    const t0 = Date.now();
    const finish = () => {
      if (done) return; done = true; clearTimeout(tPause); clearTimeout(tMax);
      try { rec && rec.abort(); } catch (e) { }
      const text = (parts.join("") + live).trim();
      if (!text) { onEnd && onEnd("nomatch"); return; }
      const before = parts.slice(0, -1).join("");
      const alts = [text, ...alts0.map(a => before + a)];
      onResult([...new Set(alts)]);
    };
    const bump = () => { clearTimeout(tPause); tPause = setTimeout(() => { stopped = true; finish(); }, pause); };
    const tMax = setTimeout(() => { stopped = true; finish(); }, max);
    const start = () => {
      rec = new SR();
      rec.lang = "ja-JP"; rec.interimResults = true; rec.maxAlternatives = 5; rec.continuous = true;
      const base = parts.length;
      rec.onresult = e => {
        live = "";
        const fin = [];
        for (let i = 0; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) { fin.push(res[0].transcript); if (i === e.results.length - 1) { alts0 = []; for (let k = 1; k < res.length; k++) alts0.push(res[k].transcript); } }
          else live += res[0].transcript;
        }
        // Android liefert manchmal den ganzen Satz wiederholt – nur den längsten Stand behalten
        const dedup = fin.filter((t, i) => !fin.some((u, j) => j !== i && u.length > t.length && u.startsWith(t)));
        parts = parts.slice(0, base).concat(dedup);
        bump();
      };
      rec.onerror = e => { if (e.error === "not-allowed" || e.error === "audio-capture") { done = true; clearTimeout(tPause); clearTimeout(tMax); onEnd && onEnd(e.error); } };
      // Der Browser beendet manchmal von selbst – dann weiter zuhören, solange nicht fertig
      rec.onend = () => { if (done) return; if (live) { parts.push(live); live = ""; } if (stopped || Date.now() - t0 > max) finish(); else { try { start(); } catch (e) { finish(); } } };
      try { rec.start(); } catch (e) { finish(); }
    };
    start(); tPause = setTimeout(() => { stopped = true; finish(); }, opts.startWait || 10000); // vor dem ersten Wort länger warten
    return { stop: () => { stopped = true; finish(); }, abort: () => { done = true; clearTimeout(tPause); clearTimeout(tMax); try { rec && rec.abort(); } catch (e) { } } };
  }

  // ---------- Startseite ----------
  // gut sichtbarer Hinweis-Kasten
  const tipBox = html => `<div class="tip-box"><svg class="tip-ic"><use href="#i-bulb"/></svg><div><b class="tip-h">Tipp</b><br>${html}</div></div>`;
  // breite, halb so hohe Kachel (Lektionen, Einstellungen)
  const wideTile = (id, ic, emo, t, sub, cls = "beige") => `<button class="tile wide ${cls}" id="${id}">
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
        <div class="row home-btns"><button class="btn primary" id="go">${due + learning + fresh ? "Vokabeln lernen" : "Alles erledigt 🎉"}</button>
        <button class="btn" id="practice">Gelernte üben</button></div>
        <p class="small muted center" style="margin:8px 0 0">${fresh} neue Wörter verfügbar · heute ${todayCount} Karten</p>
      </div>
      ${wideTile("m-groups", "torii", "📚", "Lektionen", `${DB.groups.length} von ${GROUPS.length} aktiv`)}
      <div class="tiles">${[
        // Nachschlagen → Sprechen & Lesen → Zahlen & Zeit → Schreiben & Spielen
        ["m-list", "sakura", "🔎", "Wortliste", "Suchen & ergänzen"],
        ["m-grammar", "scroll", "文", "Grammatik", "は, を, に, 〜ます …"],
        ["m-dialog", "tea", "💬", "Gespräche", "Dialoge & Rollenspiel"],
        ["m-story", "fuji", "📖", "Bücher", "Geschichten & Fragen"],
        ["m-counters", "soroban", "三", "Zählwörter", "ひとつ, さんぼん …"],
        ["m-cal", "s-calendar", "📅", "Kalender", "きょう, らいしゅう …"],
        ["m-family", "sakuratree", "👪", "Familie", "Stammbaum & Anrede"],
        ["m-kanji", "kanji", "漢", "Kanji", "Eselsbrücken & Lesungen"],
        ["m-write", "brush", "✍️", "Schreiben", "Kanji & Kana zeichnen"],
        ["m-games", "daruma", "🎮", "Spiele", "Kana-Regen, Sushi, Puzzle"],
      ].map(([id, ic, emo, t, sub], i) => `<button class="tile ${(Math.floor(i / 2) + i % 2) % 2 ? "beige" : "red"}" id="${id}">
          <span class="ico"><i class="emo">${emo}</i><svg class="pic"><use href="#${ic.startsWith("s-") ? ic : "i-" + ic}"/></svg></span>
          <b>${t}</b><small>${sub}</small></button>`).join("")}</div>
    `);
    document.getElementById("m-grammar").onclick = grammarList;
    document.getElementById("m-games").onclick = gamesView;
    document.getElementById("go").onclick = () => startSession();
    document.getElementById("practice").onclick = () => learned ? startPractice() : toast("Noch keine Wörter gelernt – zuerst „Vokabeln lernen“");
    document.getElementById("m-cal").onclick = () => calendarView();
    document.getElementById("m-family").onclick = () => familyView();
    document.getElementById("m-kanji").onclick = () => kanjiView();
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
    const row = g => {
      const ws = WORDS.filter(w => w.g === g.id);
      const done = ws.filter(w => { const p = prog(w); return p && p.s >= 5; }).length;
      return `<label class="check"><input type="checkbox" data-g="${g.id}" ${DB.groups.includes(g.id) ? "checked" : ""}>
        <span class="main">${esc(g.name)}<br><span class="small muted">${ws.length} Einträge · ${done} gelernt</span></span></label>`;
    };
    const block = kind => GROUPS.filter(g => g.kind === kind).map(row).join("");
    // Kurs: nach Topic gegliedert, jede Lektion einzeln wählbar
    const topics = [...new Set(GROUPS.filter(g => g.kind === "kurs").map(g => g.topic || ""))];
    const kurs = topics.map(t => {
      const [nr, jpT, deT] = t.split(" · ");
      return `<div class="topic-head"><span class="gram-l">Topic ${esc(nr)}</span><b class="jp">${esc(jpT || "")}</b><span class="muted">${esc(deT || "")}</span></div>
        ${GROUPS.filter(g => g.kind === "kurs" && (g.topic || "") === t).map(row).join("")}`;
    }).join("");
    show("Lektionen", `
      <h2>Kurs (Marugoto A1)</h2><div class="card topic-card">${kurs}</div>
      <h2>Zusatzwortschatz</h2><div class="card">${block("extra")}</div>
      <h2>Eigene</h2><div class="card">${block("custom")}</div>
      ${tipBox(`Jede Lektion lässt sich einzeln ein- und ausschalten. Neue Wörter kommen in der Reihenfolge der Lektionen dran. Lektion 13–18 sind zu Beginn ausgeschaltet – einfach einschalten, sobald ihr sie im Kurs habt.`)}
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
        <div class="prompt"><div class="de">${esc(w.de)}</div><div class="sub">Wie heisst das auf Japanisch?</div></div>
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
      // Sehr kurze Wörter (z. B. え = Bild) erkennt die Spracherkennung allein kaum. Darum darf man sie in einen kleinen Satz packen.
      const short = Kana.stripJP(w.kana).length <= 2 && !w.p;
      show(title, cardShell(task, `
        <div class="prompt"><div class="de">${esc(w.de)}</div><div class="sub">Tippe aufs Mikrofon und sprich auf Japanisch</div></div>
        ${short ? tipBox(`Kurzes Wort: Sag es am besten in einem kleinen Satz, zum Beispiel „<span class="jp">${esc(scriptText(Kana.stripJP(w.kana) + " です", "", true))}</span>“ oder „<span class="jp">${esc(scriptText("これは " + Kana.stripJP(w.kana) + " です", "", true))}</span>“. Das wird viel besser erkannt.`) : ""}
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
          // bei kurzen Wörtern einen kleinen Rahmen wie „これは … です“ wegnehmen und dann genau vergleichen
          const frame = s => Kana.stripJP(s).replace(/^(これは|それは|あれは|これ|わ)/, "").replace(/(です|でした|ですか|だ|を|が|は)$/, "");
          const targets = [Kana.stripJP(w.kana), w.kanji && Kana.stripJP(w.kanji)].filter(Boolean);
          const shortOk = short && alts.some(a => targets.includes(frame(a)) || targets.includes(Kana.stripJP(a)));
          const ok = shortOk || score >= (w.p ? 0.75 : 0.85);
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
      ${tipBox(`Tippe auf einen Tag, auf 週 (Woche), auf Monat oder Jahr oben, auf einen Wochentag oder auf 毎… (jede/r).`)}`, { back: home });

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
      <div class="card opt-card">
        <div class="opt-row"><span class="opt-l">Antwort</span><div class="seg sm" id="mode"><button data-m="mc" class="${DB.settings.counterMode === "mc" ? "on" : ""}">Auswählen</button><button data-m="type" class="${DB.settings.counterMode === "type" ? "on" : ""}">Tippen</button><button data-m="speak" class="${DB.settings.counterMode === "speak" ? "on" : ""}">Sprechen</button></div></div>
        <div class="opt-row"><span class="opt-l">Reihenfolge</span><div class="seg sm" id="order"><button data-o="rand" class="${DB.settings.counterOrder !== "seq" ? "on" : ""}">Zufällig (10)</button><button data-o="seq" class="${DB.settings.counterOrder === "seq" ? "on" : ""}">Der Reihe nach</button></div></div>
        <div class="opt-btns"><button class="btn primary" id="start">Üben</button><button class="btn" id="tables"><svg class="btn-ic"><use href="#i-scroll"/></svg>Liste</button></div>
      </div>
      <h2>Was willst du üben?</h2>
      <div class="cat-grid">${cats.map(c => `<button class="cat ${DB.counterCats.includes(c.id) ? "on" : ""}" data-c="${c.id}">${c.icon ? `<svg class="cat-ic"><use href="#${c.icon}"/></svg>` : `<span class="cat-ic"></span>`}<b>${c.label}</b><small>${esc(c.title)}</small></button>`).join("")}</div>`, { back: home });
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
      ${tipBox(`Tippe eine Zeile an, um sie zu hören.`)}${html}`, { back: countersView });
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
      <div class="card">${seg("mode", [["auto", "Wie Handy"], ["light", "Hell"], ["dark", "Dunkel"]])}
        <label class="switch-row" style="margin-top:10px"><span>Hintergrund bewegt (Wolken &amp; Blüten auf der Startseite)</span><input type="checkbox" data-bool="decoAnim" ${s.decoAnim ? "checked" : ""}></label></div>
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
        ${tipBox(`Dein Fortschritt liegt nur auf diesem Gerät. Speichere ab und zu eine Sicherung.`)}
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
    // Zeichen-Gruppen als kompakte Kacheln zum An- und Abwählen
    const sets = groupedTiles(allSets(), s => {
      const done = s.chars.filter(x => charScore(x.c) >= 2).length;
      return `<button class="wset has-badge ${W.sets.includes(s.id) ? "on" : ""}${s.course && s.l > maxLesson() ? " later" : ""}" data-s="${s.id}">${setBadge(s)}<span class="jp wset-c">${esc(s.chars.slice(0, 3).map(x => x.c).join(""))}</span>
        <span class="wset-t"><b>${esc(setName(s))}</b><small>${done}/${s.chars.length} sicher</small></span></button>`;
    });
    show("Schreiben üben", `
      <div class="card opt-card">
        <div class="opt-row"><span class="opt-l">Modus</span><div class="seg sm" id="wmode">
          <button data-m="trace" class="${W.mode === "trace" ? "on" : ""}">Nachzeichnen</button>
          <button data-m="help" class="${W.mode === "help" ? "on" : ""}">Mit Hilfe</button>
          <button data-m="free" class="${W.mode === "free" ? "on" : ""}">Aus dem Kopf</button>
        </div></div>
        <div class="opt-btns"><button class="btn primary" id="wstart">Üben (10)</button><button class="btn" id="wgrid"><svg class="btn-ic"><use href="#i-scroll"/></svg>Liste</button></div>
      </div>
      <h2>Was willst du üben?</h2>
      ${sets}
      <div class="tip-box"><svg class="tip-ic"><use href="#i-bulb"/></svg><div><b class="tip-h">Tipp</b><br><span id="wmodeinfo"></span><br>
        Beim ersten Mal braucht jedes Zeichen <b>Internet</b>, danach geht es auch offline.</div></div>
      <p class="small muted">Strichdaten: KanjiVG (CC BY-SA 3.0).</p>`, { back: home });
    const info = { trace: "Das Zeichen ist grau vorgezeichnet. Ideal zum Kennenlernen.", help: "Kein Vorbild – nur ein Punkt zeigt, wo der nächste Strich beginnt.", free: "Ganz aus dem Kopf. Nach zwei Fehlern gibt es einen Hinweis." };
    const setInfo = () => ($("#wmodeinfo").textContent = info[W.mode]); setInfo();
    $app.querySelectorAll("#wmode button").forEach(b => b.onclick = () => {
      W.mode = b.dataset.m; save(); setInfo();
      $app.querySelectorAll("#wmode button").forEach(x => x.classList.toggle("on", x === b));
    });
    $app.querySelectorAll(".wset").forEach(b => b.onclick = () => {
      const id = b.dataset.s, on = !W.sets.includes(id);
      W.sets = on ? [...new Set([...W.sets, id])] : W.sets.filter(x => x !== id); save();
      b.classList.toggle("on", on);
    });
    $("#wstart").onclick = () => {
      const pool = uniqBy(allSets().filter(s => W.sets.includes(s.id)).flatMap(s => s.chars.map(ch => ({ ...ch, set: s }))), x => x.c);
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
    show("Alle Zeichen", `${tipBox(`Tippe ein Zeichen an, um es zu üben. Grün = sicher.`)}${html}`, { back: writeView });
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
  // Vorlesen: Kanji klingen natürlicher, aber 何 liest die Sprachausgabe oft falsch („ka“) – dann die Kana nehmen
  const sayForm = t => t.kanji && !/何/.test(t.kanji) ? t.kanji : t.kana;
  const tokSay = t => PART_SAY[core(t.kana)] || core(sayForm(t)) || t.kana;
  const lineSay = toks => toks.map(sayForm).join("");
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

  async function playSeq(texts, onStep, voices) {
    const run = ++playRun;
    for (let i = 0; i < texts.length; i++) {
      if (run !== playRun) return false;
      onStep && onStep(i);
      await say(texts[i], voices && voices[i]);
      await new Promise(r => setTimeout(r, 250));
    }
    if (run === playRun) onStep && onStep(-1);
    return run === playRun;
  }
  // Avatar: gezeichnet (av-…) oder Emoji
  function avHTML(v) { return String(v).startsWith("av-") ? `<svg class="av-svg"><use href="#${v}"/></svg>` : esc(v); }
  function roleName(d, who) { return tokText({ kana: d.roles[who][0], kanji: "" }); }
  // Stimme einer Rolle: 3. Eintrag in roles (m/f/g/b/o) oder nach Avatar
  const roleVoice = (d, who) => voiceFor(d.roles[who][2] || VOICE_KIND[d.roles[who][1]]);

  // ---------- Gespräche ----------
  // rotes Lektions-Feld (wie bei der Grammatik): „L5“ oder z. B. „Reise“
  const lessonBadge = lesson => { const m = /\d+/.exec(lesson || ""); return `<span class="gram-l l-badge${m && +m[0] > maxLesson() ? " later" : ""}">${m ? "L" + m[0] : esc(lesson || "")}</span>`; };
  function dialogList() {
    current = { rerender: dialogList };
    const st = DB.dlg || {};
    show("Gespräche", wideTile("m-fill", "s-bubble", "💬", "Füllwörter & Reaktionen", "えっと, あのう, そうですか …") + `<div class="tiles">` + window.DIALOGS.map((d, i) => {
      const s = st[d.id];
      return `<button class="tile small-tile has-badge ${(Math.floor(i / 2) + i % 2) % 2 ? "beige" : "red"}" data-d="${d.id}">${lessonBadge(d.lesson)}
        <span class="ico"><i class="emo">${d.emoji}</i><svg class="pic"><use href="#${d.icon}"/></svg></span>
        <b>${esc(d.title)}</b>${s && s.gap === 100 ? "<small>✓ geschafft</small>" : ""}</button>`;
    }).join("") + `</div>${tipBox("Kurz auf ein Wort <b>tippen</b> = anhören<br><b>Lange drücken</b> = Übersetzung")}`, { back: home });
    $app.querySelectorAll("[data-d]").forEach(b => b.onclick = () => dialogView(window.DIALOGS.find(d => d.id === b.dataset.d), "read"));
    $("#m-fill").onclick = () => fillerView();
  }
  // Text in der gewählten Schrift (Romaji / Kana / Kanji)
  // sentence = true: は/へ als Partikel (wa/e) lesen – nur bei Sätzen, sonst wird はは zu „hawa“
  const scriptText = (kana, kanji, sentence) => DB.settings.script === "romaji" ? Kana.kanaToRomaji(kana, !!sentence) : DB.settings.script === "kanji" && kanji ? kanji : kana;

  // ---------- Füllwörter & Reaktionen ----------
  function fillerView() {
    current = { rerender: fillerView };
    const F = window.FILLERS;
    show("Füllwörter", `${tipBox(`Japaner zeigen beim Zuhören oft mit kleinen Wörtern, dass sie dabei sind (<span class="jp">あいづち</span>). Und beim Überlegen füllen sie Pausen mit <span class="jp">えっと</span> oder <span class="jp">あのう</span>. Das klingt sofort natürlicher!<br>Antippen = anhören.`)}
      <button class="btn primary" id="fq">Üben: Was passt?</button>
      ${F.map((f, i) => `<div class="card fill-card">
        <button class="fill-word jp" data-fw="${i}">${esc(scriptText(f[0], f[1]))} <span class="spk">🔊</span></button>
        <div class="fill-de"><b>${esc(f[2])}</b></div>
        <div class="small muted">${esc(f[3])}</div>
        <button class="fill-ex" data-fe="${i}"><span class="jp">${esc(scriptText(f[4], "", true))}</span><br><span class="small muted">${esc(f[5])}</span></button>
      </div>`).join("")}`, { back: dialogList });
    $app.querySelectorAll("[data-fw]").forEach(b => b.onclick = () => say(F[+b.dataset.fw][0].replace(/…/g, "")));
    $app.querySelectorAll("[data-fe]").forEach(b => b.onclick = () => say(F[+b.dataset.fe][4].replace(/――/g, "。")));
    $("#fq").onclick = () => fillerQuiz();
  }
  function fillerQuiz(st) {
    const F = window.FILLERS;
    if (!st) st = { qs: shuffle(F.filter(f => f[6])).slice(0, 8), i: 0, right: 0 };
    current = { rerender: () => fillerQuiz(st) };
    if (st.i >= st.qs.length) {
      show("Füllwörter", `<div class="card center"><div class="big-emoji">${st.right >= st.qs.length * 0.8 ? "🎉" : "💪"}</div><h2>${st.right} von ${st.qs.length} richtig</h2>
        <button class="btn primary" id="again">Nochmal</button><button class="btn" id="back">Zurück</button></div>`, { back: fillerView });
      $("#again").onclick = () => fillerQuiz(); $("#back").onclick = fillerView; return;
    }
    const q = st.qs[st.i];
    // Wörter, die in derselben Situation auch passen würden, nicht als falsche Antwort anbieten
    const SAME = [["えっと", "えーと", "うーん", "そうですね", "あのう"], ["そうですか", "なるほど", "へえ", "ほんとうですか", "そっか"], ["すごい", "いいですね", "へえ"], ["はい", "ええ", "うん"]];
    const clash = f => SAME.some(g => g.includes(f[0]) && g.includes(q[0]));
    const opts = shuffle([q, ...shuffle(F.filter(f => f[6] && f !== q && !clash(f))).slice(0, 3)]);
    show("Füllwörter", `<div class="progress"><i style="width:${Math.round(100 * st.i / st.qs.length)}%"></i></div>
      <div class="stage-label"><span>Was sagst du?</span><span>${st.i + 1}/${st.qs.length}</span></div>
      <div class="card"><div class="prompt" style="font-size:20px">${esc(q[6])}</div>
      <div class="options">${opts.map((o, i) => `<button class="option jp" data-i="${i}">${esc(scriptText(o[0], o[1]))}</button>`).join("")}</div><div id="area"></div></div>`, { back: fillerView });
    $app.querySelectorAll(".option").forEach(b => b.onclick = () => {
      const ok = opts[+b.dataset.i] === q; if (ok) st.right++;
      $app.querySelectorAll(".option").forEach((x, i) => { x.disabled = true; if (opts[i] === q) x.classList.add("correct"); });
      if (!ok) b.classList.add("wrong");
      say(q[0].replace(/…/g, ""));
      $("#area").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Besser passt:"} <span class="jp">${esc(scriptText(q[0], q[1]))}</span> – ${esc(q[2])}</div>
        <button class="btn primary" id="next">Weiter</button>`;
      $("#next").onclick = () => { st.i++; fillerQuiz(st); };
    });
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
        ${tipBox(`Kurz tippen = Wort anhören · lange drücken = Übersetzung`)}`, { back: dialogList });
      $("#playall").onclick = () => playSeq(lines.map(l => lineSay(l.toks)), i => {
        $app.querySelectorAll(".bubble-row").forEach(r => r.classList.toggle("speaking", +r.dataset.line === i));
      }, lines.map(l => roleVoice(d, l.who)));
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
          ${tipBox(`Die App spricht die andere Rolle. Du siehst deinen Satz auf Deutsch und sagst ihn auf Japanisch.${SR ? "" : "<br>Spracherkennung ist hier nicht verfügbar – du bewertest dich selbst."}`)}</div>`, { back: dialogList });
        $app.querySelectorAll("[data-me]").forEach(b => b.onclick = () => dialogView(d, "role", { me: b.dataset.me, i: 0, ok: 0, mine: 0 }));
      } else {
        roleplay(d, lines, state, tabs, bubble, deToggle);
      }
    }
    $app.querySelectorAll("#dmode button").forEach(b => b.onclick = () => dialogView(d, b.dataset.m, {}));
    const dt = $("#detog"); if (dt) dt.onchange = () => { DB.showDe = dt.checked; save(); $app.querySelectorAll(".de-line").forEach(x => x.hidden = !dt.checked); };
    $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(lineSay(lines[+b.dataset.say].toks), roleVoice(d, lines[+b.dataset.say].who)));
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
      $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(lineSay(lines[+b.dataset.say].toks), roleVoice(d, lines[+b.dataset.say].who)));
      scrollEnd();
      say(lineSay(cur.toks), roleVoice(d, cur.who)).then(() => setTimeout(() => { if (run === playRun) nextLine(); }, 500));
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
      $("#rp-hear").onclick = () => say(lineSay(cur.toks), roleVoice(d, cur.who));
      const ov = $("#rp-override"); if (ov) ov.onclick = () => { st.ok++; nextLine(); };
      $("#rp-next").onclick = nextLine; scrollEnd();
    };
    if (SR) {
      area.innerHTML = `<button class="mic" id="rp-mic">🎤</button><p class="center small muted" id="rp-msg">Tippe aufs Mikrofon und sprich deinen Satz</p>
        <div class="row"><button class="btn" id="rp-skip">Überspringen</button></div>`;
      let rec = null; const mic = $("#rp-mic");
      mic.onclick = () => {
        if (rec) { rec.stop(); return; }
        mic.classList.add("listening"); $("#rp-msg").innerHTML = "Ich höre zu … Lass dir Zeit.<br>Wenn du fertig bist, tippe nochmals aufs Mikrofon.";
        rec = listen(alts => {
          mic.classList.remove("listening"); rec = null;
          finish(Kana.speechScore(alts, target.kana, target.kanji) >= 0.6, alts[0]);
        }, err => { mic.classList.remove("listening"); rec = null; $("#rp-msg").textContent = err === "not-allowed" ? "Mikrofon nicht erlaubt" : "Nichts verstanden – nochmal"; }, { long: true });
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
    show("Bücher", `<div class="story-grid">${window.STORIES.map(s => `<button class="story-card has-badge" data-s="${s.id}">${lessonBadge(s.lesson)}
        <svg class="cover-pic"><use href="#${s.icon}"/></svg><div class="cover cover-emo">${s.cover}</div><div class="jp st-title">${tokText({ kana: s.title, kanji: "" })}</div>
        <div class="small muted">${esc(s.de)}</div>${st[s.id] != null ? `<div class="small muted">${st[s.id]}% ✓</div>` : ""}</button>`).join("")}</div>
      ${tipBox("Kurz auf ein Wort <b>tippen</b> = anhören<br><b>Lange drücken</b> = Übersetzung")}
      <button class="btn" id="tadoku"><svg class="btn-ic"><use href="#s-books"/></svg>Mehr Bücher zum Lesen &amp; Hören (Tadoku)</button>`, { back: home });
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
      ${tipBox(`Die Bücher öffnen sich auf tadoku.org. Dort kannst du sie lesen und meist auch <b>anhören</b> (▶). Tippe danach auf den <b>Kreis</b>, um ein Buch als gelesen abzuhaken.`)}
      <p class="small muted">Bücher: NPO 多言語多読, Lizenz CC BY-NC-ND 4.0. <a href="https://tadoku.org/japanese/free-books/" target="_blank" rel="noopener">Alle Bücher ansehen</a></p>`, { back: storyList });
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
      ${wideTile("g-satzbau", "i-scroll", "🧱", "Satzbau", "Wie ein japanischer Satz aufgebaut ist")}
      ${wideTile("g-frage", "s-question", "❓", "Fragewörter", "なに, なんじ, どこ, いつ, だれ …")}
      <div class="card gram-list">${window.GRAMMAR.map(g => `<button class="gram-row${g.l > maxL ? " later" : ""}" data-g="${g.id}">
          <span class="gram-l">L${g.l}</span>
          <span class="gram-t"><b class="jp">${esc(g.title)}</b><small>${esc(g.sub)}</small></span>
          <span class="gram-s">${done[g.id] != null ? `${done[g.id]}/4 ✓` : "›"}</span></button>`).join("")}</div>
      ${tipBox(`Kurze Erklärungen zu den wichtigsten A1-Punkten, mit Beispielen zum Anhören und einer kleinen Übung. Die Lektionsnummer zeigt, wann es ungefähr im Kurs drankommt.`)}`, { back: home });
    $app.querySelectorAll("[data-g]").forEach(b => b.onclick = () => grammarPoint(window.GRAMMAR.find(g => g.id === b.dataset.g)));
    $("#g-satzbau").onclick = () => satzbauView();
    $("#g-frage").onclick = () => questionView();
  }

  // ---------- Fragewörter ----------
  function questionView() {
    current = { rerender: questionView };
    const Q = window.QWORDS, j = (kana, kanji) => esc(scriptText(kana, kanji, true)), maxL = maxLesson();
    const known = Q.filter(q => q[9] <= maxL).length;
    show("Fragewörter", `
      <button class="btn primary" id="qq" style="margin-top:0">Üben: Welches Fragewort?</button>
      <p class="small muted center" style="margin:6px 0 0">Geübt werden die ${known} Fragewörter bis Lektion ${maxL}.</p>
      ${[...Q].sort((a, b) => a[9] - b[9]).map(q => [q, Q.indexOf(q)]).map(([q, i]) => `<div class="card fill-card${q[9] > maxL ? " later" : ""}">
        <span class="gram-l q-l">L${q[9]}</span>
        <button class="fill-word jp" data-qw="${i}">${esc(scriptText(q[0], q[1]))} <span class="spk">🔊</span></button>
        <div class="fill-de"><b>${esc(q[2])}</b></div>
        <button class="fill-ex" data-qe="${i}"><span class="jp">${j(q[3], q[4])}</span><br><span class="small muted">${esc(q[5])}</span>
          <br><span class="jp small">→ ${j(q[6], q[7])}</span> <span class="small muted">${esc(q[8])}</span></button>
      </div>`).join("")}
      ${tipBox(`<b>なに oder なん?</b> Beides heisst „was“. Vor <span class="jp">です</span>, vor の und vor Zählwörtern sagt man meist <span class="jp">なん</span> (なんですか, なんじ, なんにん). Vor を und が meist <span class="jp">なに</span> (なにを たべますか).<br>
        Das Fragewort steht im Satz genau dort, wo später die Antwort steht – und am Ende kommt <span class="jp">か</span>.<br>
        Die Lektionsnummer zeigt, wann das Wort ungefähr im Kurs drankommt. Spätere Wörter sind heller – anschauen geht trotzdem schon.`)}`, { back: grammarList });
    $app.querySelectorAll("[data-qw]").forEach(b => b.onclick = () => say(Q[+b.dataset.qw][0]));
    $app.querySelectorAll("[data-qe]").forEach(b => { const q = Q[+b.dataset.qe]; b.onclick = () => playSeq([q[3], q[6]]); });
    $("#qq").onclick = () => questionQuiz();
  }
  function questionQuiz(st) {
    // nur Fragewörter bis zur höchsten eingeschalteten Lektion (mindestens 4 Wörter, damit es Auswahl gibt)
    const maxL = maxLesson(), all = window.QWORDS;
    const Q = all.filter(q => q[9] <= maxL).length >= 4 ? all.filter(q => q[9] <= maxL) : all.slice().sort((a, b) => a[9] - b[9]).slice(0, 4);
    if (!st) st = { qs: shuffle(Q).slice(0, 10), i: 0, right: 0 };
    current = { rerender: () => questionQuiz(st) };
    if (st.i >= st.qs.length) {
      show("Fragewörter", `<div class="card center"><div class="big-emoji">${st.right >= st.qs.length * 0.8 ? "🎉" : "💪"}</div><h2>${st.right} von ${st.qs.length} richtig</h2>
        <button class="btn primary" id="again">Nochmal</button><button class="btn" id="back">Zurück</button></div>`, { back: questionView });
      $("#again").onclick = () => questionQuiz(); $("#back").onclick = questionView; return;
    }
    const q = st.qs[st.i];
    // Frage mit Lücke: das Fragewort wird durch ＿＿ ersetzt
    const gapKana = q[3].replace(q[0], "＿＿ "), gapKanji = q[4] ? q[4].replace(q[1] || q[0], "＿＿") : "";
    // Wörter, die dieselbe Frage auch stellen könnten, nicht als falsche Antwort anbieten
    const SAME = [["なに", "なん", "なにご"], ["なんさい", "いくつ"], ["どれ", "どちら", "どの"], ["どうして", "なんで", "どうやって"], ["なんぷん", "どのくらい"], ["どう", "どうやって"]];
    const clash = x => SAME.some(g => g.includes(x[0]) && g.includes(q[0]));
    const opts = shuffle([q, ...shuffle(Q.filter(x => x !== q && x[0] !== q[0] && !clash(x))).slice(0, 3)]);
    show("Fragewörter", `<div class="progress"><i style="width:${Math.round(100 * st.i / st.qs.length)}%"></i></div>
      <div class="stage-label"><span>Welches Fragewort?</span><span>${st.i + 1}/${st.qs.length}</span></div>
      <div class="card"><div class="prompt"><div class="jp" style="font-size:22px">${esc(scriptText(gapKana, gapKanji, true))}</div><div class="sub">${esc(q[5])}</div></div>
      <div class="options">${opts.map((o, i) => `<button class="option jp" data-i="${i}">${esc(scriptText(o[0], o[1]))}</button>`).join("")}</div><div id="area"></div></div>`, { back: questionView });
    $app.querySelectorAll(".option").forEach(b => b.onclick = () => {
      const ok = opts[+b.dataset.i] === q; if (ok) st.right++;
      $app.querySelectorAll(".option").forEach((x, i) => { x.disabled = true; if (opts[i] === q) x.classList.add("correct"); });
      if (!ok) b.classList.add("wrong");
      say(q[3]);
      $("#area").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Richtig wäre:"} <span class="jp">${esc(scriptText(q[0], q[1]))}</span> – ${esc(q[2])}</div>
        <button class="btn primary" id="next">Weiter</button>`;
      $("#next").onclick = () => { st.i++; questionQuiz(st); };
    });
  }

  // ---------- Satzbau: Bausteine eines japanischen Satzes ----------
  // [kana, kanji, Rolle, Frage, deutsch]
  const SB = {
    T: ["わたし|は", "私は", "thema", "Wer? (Thema)", "ich"], Z: ["あさ", "朝", "zeit", "Wann?", "am Morgen"],
    O: ["うち|で", "家で", "ort", "Wo?", "zu Hause"], M: ["ともだち|と", "友だちと", "mit", "Mit wem?", "mit einer Freundin"],
    X: ["コーヒー|を", "", "obj", "Was?", "Kaffee"], V: ["のみます", "飲みます", "verb", "Tun (Verb)", "trinke"],
  };
  function satzbauView(on) {
    on = on || { T: true, Z: true, O: true, M: false };
    current = { rerender: () => satzbauView(on) };
    // „|“ trennt die Partikel ab: in Romaji mit Leerzeichen (uchi de), sonst zusammen (うちで)
    const j = (kana, kanji) => esc(DB.settings.script === "romaji" ? Kana.kanaToRomaji(kana.replace(/\|は/g, "は").replace(/\|/g, " "), true) : scriptText(kana.replace(/\|/g, ""), kanji, true));
    const blk = (k, label = true) => `<span class="sb-b sb-${SB[k][2]}"><b class="jp">${j(SB[k][0], SB[k][1])}</b>${label ? `<small>${SB[k][3]}</small>` : ""}</span>`;
    const row = keys => `<div class="sb-row">${keys.map(k => blk(k)).join("")}<span class="sb-end">。</span></div>`;
    const order = ["T", "Z", "O", "M", "X", "V"].filter(k => !(k in on) || on[k]);
    const kanaS = order.map(k => SB[k][0]).join(" ") + "。", kanjiS = order.map(k => SB[k][1] || SB[k][0].replace("|", "")).join("") + "。";
    const deS = `${on.T ? "Ich trinke" : "(Ich) trinke"}${on.Z ? " am Morgen" : ""}${on.M ? " mit einer Freundin" : ""}${on.O ? " zu Hause" : ""} Kaffee.`;
    const ex = (kana, kanji, de) => `<button class="sb-ex" data-say="${esc(kanji || kana)}"><span class="jp">${j(kana, kanji)}</span> 🔊<small>${esc(de)}</small></button>`;
    show("Satzbau", `
      <div class="card">
        <h2 style="margin-top:0">1. Das Verb kommt ans Ende</h2>
        <p>Im Deutschen steht das Verb meist an zweiter Stelle. Im Japanischen steht es <b>immer am Schluss</b>. Alles andere kommt davor.</p>
        <div class="sb-compare"><div><small class="muted">Deutsch</small><br>Ich <b class="sb-t-verb">trinke</b> Kaffee.</div>
          <div><small class="muted">Japanisch</small><br><span class="jp">${j("わたしは", "私は")} ${j("コーヒーを", "")} <b class="sb-t-verb">${j("のみます", "飲みます")}</b>。</span><br><small class="muted">wörtlich: Ich Kaffee trinke.</small></div></div>
      </div>
      <div class="card">
        <h2 style="margin-top:0">2. Bausteine mit Etikett</h2>
        <p>Jedes Satzteil bekommt ein kleines Etikett dahinter – die <b>Partikel</b>. Sie sagt, welche Rolle das Wort hat:</p>
        <ul class="sb-list">
          <li><span class="sb-b sb-thema"><b class="jp">は</b></span><span>Thema – worum es geht (gesprochen <b>wa</b>)</span></li>
          <li><span class="sb-b sb-zeit"><b>Zeit</b></span><span>oft ohne Partikel (<span class="jp">${j("あさ", "朝")}</span>), bei Uhrzeit mit <span class="jp">に</span></span></li>
          <li><span class="sb-b sb-ort"><b class="jp">で</b></span><span>Ort, wo etwas passiert · <span class="jp">に / へ</span> = Ziel</span></li>
          <li><span class="sb-b sb-mit"><b class="jp">と</b></span><span>mit wem</span></li>
          <li><span class="sb-b sb-obj"><b class="jp">を</b></span><span>was (Objekt, gesprochen <b>o</b>)</span></li>
          <li><span class="sb-b sb-verb"><b>Verb</b></span><span>immer am Schluss</span></li>
        </ul>
      </div>
      <div class="card">
        <h2 style="margin-top:0">3. Probier es aus</h2>
        <p class="small muted" style="margin-top:0">Schalte Bausteine ein und aus. Die übliche Reihenfolge ist:<br>Thema → Wann → Wo → Mit wem → Was → Verb</p>
        <div class="chip-row">${[["T", "Thema (ich)"], ["Z", "Wann"], ["O", "Wo"], ["M", "Mit wem"]].map(([k, l]) => `<button class="chip ${on[k] ? "on" : ""}" data-sb="${k}">${l}</button>`).join("")}</div>
        ${row(order)}
        <button class="sb-ex" id="sb-say"><span class="jp">${j(kanaS, kanjiS)}</span> 🔊<small>${esc(deS)}</small></button>
        ${on.T ? "" : `<p class="small">Ohne <span class="jp">${j("わたしは", "私は")}</span> ist der Satz trotzdem richtig – wenn klar ist, wer gemeint ist, lässt man das Thema einfach weg. Das ist sogar sehr typisch!</p>`}
      </div>
      <div class="card">
        <h2 style="margin-top:0">4. Die Reihenfolge ist locker – nur das Verb nicht</h2>
        <p>Weil die Partikeln die Rolle zeigen, darf man Bausteine auch umstellen. Wichtiges kommt eher nach vorne. Nur das Verb bleibt am Ende.</p>
        ${ex("あさ わたしは コーヒーを のみます。", "朝私はコーヒーを飲みます。", "Am Morgen trinke ich Kaffee.")}
        ${ex("わたしは あさ コーヒーを のみます。", "私は朝コーヒーを飲みます。", "Ich trinke am Morgen Kaffee.")}
      </div>
      <div class="card">
        <h2 style="margin-top:0">5. Fragen: einfach か anhängen</h2>
        <p>Für eine Frage bleibt die Reihenfolge gleich. Man hängt nur <b class="jp">か</b> an. Ein Fragewort steht genau dort, wo später die Antwort steht.</p>
        ${ex("コーヒーを のみますか。", "コーヒーを飲みますか。", "Trinkst du Kaffee?")}
        ${ex("なにを のみますか。", "何を飲みますか。", "Was trinkst du?")}
        ${ex("おちゃを のみます。", "お茶を飲みます。", "Ich trinke Tee.")}
      </div>
      <div class="card">
        <h2 style="margin-top:0">6. Sätze ohne Verb: A は B です</h2>
        <p>Für „A ist B“ braucht es kein Verb. <b class="jp">です</b> steht am Schluss, wie ein Verb.</p>
        ${ex("わたしは がくせいです。", "私は学生です。", "Ich bin Studentin.")}
        ${ex("この ラーメンは おいしいです。", "このラーメンはおいしいです。", "Diese Ramen sind lecker.")}
      </div>
      <div class="card">
        <h2 style="margin-top:0">7. Beschreibung steht immer davor</h2>
        <p>Was ein Wort genauer beschreibt, steht <b>vor</b> dem Wort – wie im Deutschen bei „roter Apfel“, aber auch bei „von“:</p>
        ${ex("あかい りんご", "赤いりんご", "ein roter Apfel")}
        ${ex("わたしの ほん", "私の本", "mein Buch (wörtlich: ich-von Buch)")}
        ${ex("にほんの くるま", "日本の車", "ein Auto aus Japan")}
      </div>
      ${tipBox(`Merksatz: <b>Etiketten hinter die Wörter, das Verb ans Ende.</b> Üben kannst du das im <b>Satz-Puzzle</b> bei den Spielen.`)}
      <button class="btn primary" id="sb-puzzle">Zum Satz-Puzzle</button>`, { back: grammarList });
    $app.querySelectorAll("[data-sb]").forEach(b => b.onclick = () => { const k = b.dataset.sb, y = window.scrollY; satzbauView({ ...on, [k]: !on[k] }); window.scrollTo(0, y); });
    $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(b.dataset.say));
    $("#sb-say").onclick = () => say(kanaS.split("|").join(""));
    $("#sb-puzzle").onclick = puzzleStart;
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

  // ---------- Familie (Stammbaum & Anrede) ----------
  const FAM_G = { sofu: "m", sobo: "f", chichi: "m", haha: "f", ani: "m", ane: "f", partner: "p", otouto: "m", imouto: "f", musuko: "m", musume: "f" };
  // „älterer Bruder“ → „deinem älteren Bruder“ / „deine ältere Schwester“
  const famAdj = (de, end) => de.replace(/^(älter|jünger)er? /, `$1${end} `);
  const famDein = (id, de) => FAM_G[id] === "f" ? `deiner ${famAdj(de, "en")}` : FAM_G[id] === "p" ? `deinem Mann / deiner Frau` : `deinem ${famAdj(de, "en")}`;
  const famAkk = (id, de) => FAM_G[id] === "f" ? `deine ${famAdj(de, "e")}` : FAM_G[id] === "p" ? `deinen Mann / deine Frau` : `deinen ${famAdj(de, "en")}`;
  const famIhr = (id, de) => FAM_G[id] === "f" ? `ihrer ${famAdj(de, "en")}` : FAM_G[id] === "p" ? `ihrem Mann` : `ihrem ${famAdj(de, "en")}`;
  const famSay = s => s.split(" / ")[0].replace(/\s*\(.*\)/, "");
  function familyView(mode, sel) {
    mode = mode || "mine";
    current = { rerender: () => familyView(mode, sel) };
    const F = window.FAMILY, W = 372, cx = x => 30 + x * 60, cy = y => 38 + y * 92;
    const pos = id => { const f = F.find(f => f[0] === id); return [cx(f[8]), cy(f[9])]; };
    const [g1, g2, p1, p2, me, pa] = ["sofu", "sobo", "chichi", "haha", "me", "partner"].map(pos);
    const sib = F.filter(f => f[9] === 2 && f[0] !== "partner"), kids = F.filter(f => f[0].startsWith("musu"));
    // Linien: Grosseltern → Vater, Eltern → Geschwister, ich + Partner → Kinder
    const midP = (p1[0] + p2[0]) / 2, barY = cy(1.55), kidBar = cy(2.95), midM = (me[0] + pa[0]) / 2;
    const lines = `<path class="fam-line" d="M${g1[0]} ${g1[1]} H${g2[0]} M${(g1[0] + g2[0]) / 2} ${g1[1]} V${cy(0.55)} H${p1[0]} V${p1[1]}
      M${p1[0]} ${p1[1]} H${p2[0]} M${midP} ${p1[1]} V${barY} M${Math.min(...sib.map(f => cx(f[8])))} ${barY} H${Math.max(...sib.map(f => cx(f[8])))}
      ${sib.map(f => `M${cx(f[8])} ${barY} V${cy(2)}`).join(" ")}
      M${me[0]} ${me[1]} H${pa[0]} M${midM} ${me[1]} V${kidBar} M${Math.min(...kids.map(f => cx(f[8])))} ${kidBar} H${Math.max(...kids.map(f => cx(f[8])))}
      ${kids.map(f => `M${cx(f[8])} ${kidBar} V${cy(f[9])}`).join(" ")}"/>`;
    const lab = f => {
      if (f[0] === "me") return scriptText("わたし", "私");
      return mode === "mine" ? scriptText(f[3], f[4]) : scriptText(f[5], f[6]);
    };
    // lange Wörter (z. B. おとうとさん) auf die Breite eines Platzes zusammendrücken
    // Kinder stehen weiter auseinander und haben mehr Platz
    const fit = (t, mw) => { const w = [...t].reduce((s, ch) => s + (/[　-鿿]/.test(ch) ? 11 : 6), 0); return w > mw ? ` textLength="${mw}" lengthAdjust="spacingAndGlyphs"` : ""; };
    const tsp = (txt, x, y, mw = 56) => txt.split(" / ").map((t, i, a) => { const s = t + (i < a.length - 1 ? " /" : ""), ft = fit(s, mw); return `<tspan x="${x - (ft ? mw / 2 : 0)}" y="${y + i * 12}"${ft}${ft ? ` text-anchor="start"` : ""}>${esc(s)}</tspan>`; }).join("");
    const nodes = F.map(f => {
      const x = cx(f[8]), y = cy(f[9]), on = sel === f[0], mw = f[0].startsWith("musu") ? 76 : 56;
      const pic = f[0] === "me" ? `<circle cx="${x}" cy="${y}" r="22" class="fam-me"/><text x="${x}" y="${y + 5}" class="fam-me-t">${DB.settings.script === "romaji" ? "ich" : "私"}</text>`
        : `<circle cx="${x}" cy="${y}" r="22" class="fam-bg${on ? " on" : ""}"/><use href="#${f[2]}" x="${x - 19}" y="${y - 20}" width="38" height="38"/>`;
      return `<g class="fam-node" data-f="${f[0]}">${pic}<text class="fam-jp" text-anchor="middle">${tsp(lab(f), x, y + 36, mw)}</text>
        <text class="fam-de" text-anchor="middle">${f[1].split(/ \/ | /).map((w, i) => `<tspan x="${x}" y="${y + 36 + lab(f).split(" / ").length * 12 + i * 11}">${esc(w)}</tspan>`).join("")}</text></g>`;
    }).join("");
    const f = sel && F.find(x => x[0] === sel);
    const info = f && f[0] !== "me" ? `<div class="card fam-info">
        <h3 style="margin:0 0 6px">${esc(f[1])}</h3>
        <button class="fam-row" data-say="${esc(famSay(f[3]))}"><span class="small muted">Wenn du anderen von ${esc(famDein(f[0], f[1]))} erzählst:</span><br><b class="jp">${esc(scriptText(f[3], f[4]))}</b> 🔊</button>
        <button class="fam-row" data-say="${esc(famSay(f[5]))}"><span class="small muted">Die Familie von anderen (höflich):</span><br><b class="jp">${esc(scriptText(f[5], f[6]))}</b> 🔊</button>
        <div class="fam-row"><span class="small muted">So rufst du ${esc(famAkk(f[0], f[1]))} selbst:</span><br><b class="jp">${esc(/^[぀-ヿ]/.test(f[7]) ? scriptText(f[7], "") : f[7])}</b></div>
      </div>` : f ? `<div class="card fam-info small">Das bist du! Von dir aus wird alles benannt.</div>` : "";
    show("Familie", `
      <button class="btn primary" id="fq" style="margin-top:0">Üben: Wie sagt man?</button>
      <div class="seg" id="fmode" style="margin-top:10px"><button data-m="mine" class="${mode === "mine" ? "on" : ""}">Meine Familie</button><button data-m="other" class="${mode === "other" ? "on" : ""}">Familie von anderen</button></div>
      <div class="card fam-card"><svg class="fam-tree" viewBox="0 0 ${W} 412">${lines}${nodes}</svg></div>
      ${info || `<p class="small muted center">Tippe eine Person an.</p>`}
      <h2>Sammelwörter</h2>
      <div class="card"><table class="tbl fam-tbl"><tr><th></th><th>meine</th><th>von anderen</th></tr>
        ${window.FAMILY_WORDS.map(w => `<tr><td>${esc(w[0])}</td><td class="jp say-cell" data-say="${esc(w[1])}">${esc(scriptText(w[1], w[2]))}</td><td class="jp say-cell" data-say="${esc(w[3])}">${esc(scriptText(w[3], w[4]))}</td></tr>`).join("")}</table></div>
      ${tipBox(`<b>Zwei Wörter pro Person:</b><br>
        1. Erzählst du <b>anderen</b> von deiner eigenen Familie, nimmst du das bescheidene Wort: <span class="jp">${scriptText("はは", "母")}</span> (meine Mutter).<br>
        2. Für die Familie von <b>anderen</b> nimmst du das höfliche Wort mit <span class="jp">お〜さん</span>: <span class="jp">${scriptText("おかあさん", "お母さん")}</span>.<br>
        3. <b>Ältere</b> Familienmitglieder rufst du selbst auch mit dem höflichen Wort: „<span class="jp">${scriptText("おかあさん", "お母さん")}</span>!“ – <b>Jüngere</b> (Geschwister, Kinder) beim Vornamen.`)}`, { back: home });
    $app.querySelectorAll("#fmode button").forEach(b => b.onclick = () => familyView(b.dataset.m, sel));
    $app.querySelectorAll(".fam-node").forEach(n => n.onclick = () => {
      const id = n.dataset.f, fm = F.find(x => x[0] === id);
      if (fm[0] !== "me") say(famSay(mode === "mine" ? fm[3] : fm[5]));
      familyView(mode, id);
      const c = $(".fam-info"); if (c) c.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(b.dataset.say));
    $("#fq").onclick = () => familyQuiz();
  }
  function familyQuiz(st) {
    const F = window.FAMILY.filter(f => f[0] !== "me");
    if (!st) {
      const qs = [];
      F.forEach(f => {
        qs.push({ f, t: "mine", q: `Du erzählst einer Kollegin von ${famDein(f[0], f[1])}.`, a: [f[3], f[4]] });
        qs.push({ f, t: "other", q: `Du fragst Frau Tanaka nach ${famIhr(f[0], f[1])}.`, a: [f[5], f[6]] });
        if (/^[぀-ヿ]/.test(f[7])) qs.push({ f, t: "call", q: `Du rufst ${famAkk(f[0], f[1])} zu Hause. Was sagst du?`, a: [f[5], f[6]] });
      });
      st = { qs: shuffle(qs).slice(0, 10), i: 0, right: 0 };
    }
    current = { rerender: () => familyQuiz(st) };
    if (st.i >= st.qs.length) {
      show("Familie", `<div class="card center"><div class="big-emoji">${st.right >= st.qs.length * 0.8 ? "🎉" : "💪"}</div><h2>${st.right} von ${st.qs.length} richtig</h2>
        <button class="btn primary" id="again">Nochmal</button><button class="btn" id="back">Zum Stammbaum</button></div>`, { back: () => familyView() });
      $("#again").onclick = () => familyQuiz(); $("#back").onclick = () => familyView(); return;
    }
    const q = st.qs[st.i];
    const other = q.t === "mine" ? [q.f[5], q.f[6]] : [q.f[3], q.f[4]];
    const pool = F.filter(f => f !== q.f).map(f => q.t === "mine" ? [f[3], f[4]] : [f[5], f[6]]);
    const opts = shuffle(uniqBy([q.a, other, ...shuffle(pool)], o => o[0]).slice(0, 4));
    show("Familie", `<div class="progress"><i style="width:${Math.round(100 * st.i / st.qs.length)}%"></i></div>
      <div class="stage-label"><span>Wie sagt man?</span><span>${st.i + 1}/${st.qs.length}</span></div>
      <div class="card"><div class="prompt" style="font-size:19px">${esc(q.q)}</div>
      <div class="options">${opts.map((o, i) => `<button class="option jp" data-i="${i}">${esc(scriptText(o[0], o[1]))}</button>`).join("")}</div><div id="area"></div></div>`, { back: () => familyView() });
    $app.querySelectorAll(".option").forEach(b => b.onclick = () => {
      const ok = opts[+b.dataset.i][0] === q.a[0]; if (ok) st.right++;
      $app.querySelectorAll(".option").forEach((x, i) => { x.disabled = true; if (opts[i][0] === q.a[0]) x.classList.add("correct"); });
      if (!ok) b.classList.add("wrong");
      say(famSay(q.a[0]));
      const why = q.t === "mine" ? "Über die eigene Familie spricht man bescheiden." : q.t === "other" ? "Für die Familie von anderen nimmt man das höfliche Wort." : "Ältere in der Familie ruft man mit dem höflichen Wort.";
      $("#area").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Richtig wäre:"} <span class="jp">${esc(scriptText(q.a[0], q.a[1]))}</span><div class="small">${why}</div></div>
        <button class="btn primary" id="next">Weiter</button>`;
      $("#next").onclick = () => { st.i++; familyQuiz(st); };
    });
  }

  // ---------- Kanji (Lernkarten, Üben, Liste) & Kana-Tabelle ----------
  // Kacheln in Abschnitte teilen: Kana · Kanji nach Kurs-Lektion · Kanji nach Thema
  // Kanji-Gruppen nach Kurs-Lektion: rotes L-Feld und als Name das Thema der Lektion (aus dem Wortschatz)
  const setBadge = s => s.course ? lessonBadge("Lektion " + s.l) : "";
  const setName = s => {
    if (!s.course) return s.name.replace("Kanji: ", "");
    const g = GROUPS.find(x => x.id === `L${s.l}-${s.l}`);
    return g ? g.name.replace(/^Lektion \d+ · /, "") : "Lektion " + s.l;
  };
  function groupedTiles(sets, tile) {
    const part = (title, list) => list.length ? `<h3 class="tile-sec">${title}</h3><div class="wset-grid">${list.map(tile).join("")}</div>` : "";
    return part("Kana", sets.filter(s => s.kind === "kana"))
      + part("Kanji nach Kurs-Lektion", sets.filter(s => s.course))
      + part("Kanji nach Thema", sets.filter(s => s.kind === "kanji" && !s.course));
  }
  const kanjiAll = () => uniqBy(window.KanjiData.SETS.filter(s => s.kind === "kanji" && s.id !== "n5" && !s.course).flatMap(s => s.chars.map(c => ({ ...c, set: s }))), x => x.c);
  const kinfo = c => (window.KANJI_INFO || {})[c] || ["", "", "", ""];
  const kex = c => (kinfo(c)[2] || "").split(";").map(s => s.trim()).filter(Boolean).map(s => { const [kana, kanji, de] = s.split("|"); return { kana, kanji, de }; });
  const ksent = c => { const s = kinfo(c)[3]; if (!s) return null; const [kana, kanji, de] = s.split("|"); return { kana, kanji, de }; };
  const kstore = () => DB.kanji || (DB.kanji = {});
  const readList = s => (s || "").split("・").filter(Boolean);
  const readSay = s => s.replace(/[()]/g, "");
  const readShow = s => DB.settings.script === "romaji" ? Kana.kanaToRomaji(Kana.toHira(s.replace(/[()]/g, ""))) : s;
  // Merkbild zeichnen
  function kanjiPic(pic, cls = "kpic") {
    if (!pic) return "";
    const box = inner => `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
    const [t, v] = pic.includes(":") ? pic.split(/:(.*)/s) : ["use", pic];
    if (t === "use") return box(`<use href="#${pic}" x="0" y="0" width="64" height="64"/>`);
    if (t === "n") {
      const n = +v;
      if (n > 10) return box(`<text x="32" y="40" text-anchor="middle" class="kpic-num" style="font-size:${n >= 10000 ? 15 : n >= 1000 ? 18 : 24}px">${n.toLocaleString("de-CH")}</text>`);
      const dots = Array.from({ length: n }, (_, i) => { const r = Math.floor(i / 5), c = i % 5, cnt = Math.min(5, n - r * 5); return `<circle cx="${32 + (c - (cnt - 1) / 2) * 11}" cy="${n > 5 ? 24 + r * 16 : 32}" r="4.6" style="fill:var(--b)"/>`; }).join("");
      return box(dots);
    }
    if (t === "col") return box(`<circle cx="32" cy="32" r="24" style="fill:${v};stroke:var(--a)" stroke-width="2.5"/>`);
    if (t === "dir") {
      const a = { N: 0, E: 90, S: 180, W: 270 }[v];
      return box(`<circle cx="32" cy="32" r="27" style="fill:var(--c);stroke:var(--a)" stroke-width="2"/>
        <g class="kpic-dir"><text x="32" y="12">N</text><text x="55" y="36">O</text><text x="32" y="60">S</text><text x="9" y="36">W</text></g>
        <path d="M32 14 L38 32 H26Z" transform="rotate(${a} 32 32)" style="fill:var(--b)"/><circle cx="32" cy="32" r="3" style="fill:var(--a)"/>`);
    }
    if (t === "pos") {
      const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" style="stroke:var(--b);fill:none" stroke-width="5" stroke-linecap="round" marker-end="url(#kArr)"/>`;
      const defs = `<defs><marker id="kArr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" style="fill:var(--b)"/></marker></defs>`;
      const ground = `<path d="M6 34 H58" style="stroke:var(--a)" stroke-width="4" stroke-linecap="round"/>`;
      const boxR = `<rect x="16" y="16" width="32" height="32" rx="3" style="fill:var(--surface-2,#f3c3bd);stroke:var(--a)" stroke-width="3"/>`;
      const m = {
        up: ground + arrow(32, 28, 32, 8), down: ground + arrow(32, 40, 32, 58),
        mid: boxR + `<circle cx="32" cy="32" r="6" style="fill:var(--b)"/>`,
        left: arrow(50, 32, 12, 32), right: arrow(14, 32, 52, 32),
        in: boxR + arrow(2, 32, 30, 32), out: boxR + arrow(32, 32, 60, 32),
        front: `<use href="#k-person" x="2" y="12" width="40" height="40"/>` + arrow(34, 40, 60, 40),
        back: `<use href="#k-person" x="24" y="12" width="40" height="40"/>` + arrow(28, 40, 4, 40),
      };
      return box(defs + (m[v] || ""));
    }
    return "";
  }
  function kanjiView(tab) {
    tab = tab || DB.kanjiTab || "learn";
    DB.kanjiTab = tab; save();
    current = { rerender: () => kanjiView(tab) };
    const all = kanjiAll(), K = kstore(), now = Date.now();
    const learned = all.filter(k => K[k.c]).length, due = all.filter(k => K[k.c] && K[k.c].d <= now).length;
    const tabs = `<div class="seg sm page-tabs" id="ktab">${[["learn", "Lernen"], ["list", "Alle Kanji"], ["kana", "Kana-Tabelle"]].map(([t, l]) => `<button data-t="${t}" class="${t === tab ? "on" : ""}">${l}</button>`).join("")}</div>`;
    let body = "";
    const sets = window.KanjiData.SETS.filter(s => s.kind === "kanji");
    const setSel = DB.kanjiSet || "n5";
    if (tab === "learn") {
      // gleicher Aufbau wie Zählwörter und Schreiben: Auswahl-Karte oben, Kacheln darunter, Tipp unten
      body = `<div class="card opt-card">
          <div class="opt-row"><span class="opt-l">Stand</span><span class="opt-v"><b>${due}</b> fällig · <b>${learned}</b> von ${all.length} gelernt</span></div>
          <div class="opt-btns"><button class="btn primary" id="klearn">${due ? "Wiederholen" : "Lernen (5 neue)"}</button><button class="btn" id="kmem"><svg class="btn-ic"><use href="#i-daruma"/></svg>Memory</button></div>
        </div>
        <h2>Was willst du üben?</h2>
        ${groupedTiles(sets, s => { const n = s.chars.filter(c => K[c.c]).length; return `<button class="wset has-badge ${s.id === setSel ? "on" : ""}${s.course && s.l > maxLesson() ? " later" : ""}" data-set="${s.id}">${setBadge(s)}<span class="jp wset-c">${esc(s.chars.slice(0, 3).map(x => x.c).join(""))}</span>
          <span class="wset-t"><b>${esc(setName(s))}</b><small>${n}/${s.chars.length} gelernt</small></span></button>`; })}
        ${tipBox(`Pro Runde lernst du 5 neue Kanji mit Bild und Eselsbrücke. Danach fragt die App Bedeutung, Zeichen und Lesung ab. Was sitzt, kommt nach und nach in grösseren Abständen wieder.<br>Mit <b>Memory</b> kannst du die Kanji spielerisch wiederholen.`)}`;
    } else if (tab === "list") {
      body = `${tipBox("Tippe ein Kanji an, um die Lernkarte zu sehen. Grün = schon gelernt.")}
        ${sets.filter(s => s.id !== "n5" && !s.course).map(s => `<h2>${esc(s.name.replace("Kanji: ", ""))}</h2><div class="kgrid">${s.chars.map(c => `<button class="kcell jp ${K[c.c] ? "done" : ""}" data-k="${c.c}"><b>${c.c}</b><small>${esc(c.de.split(",")[0])}</small></button>`).join("")}</div>`).join("")}`;
    } else {
      body = kanaTableHTML(DB.kanaTab || "hira");
    }
    show("Kanji", tabs + body, { back: home });
    $app.querySelectorAll("#ktab button").forEach(b => b.onclick = () => kanjiView(b.dataset.t));
    $app.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { DB.kanjiSet = b.dataset.set; save(); kanjiView("learn"); });
    $app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => kanjiCard(b.dataset.k, () => kanjiView("list")));
    const kl = $("#klearn"); if (kl) kl.onclick = () => kanjiLearn();
    const km = $("#kmem"); if (km) km.onclick = () => memoryStart();
    $app.querySelectorAll("[data-kt]").forEach(b => b.onclick = () => { DB.kanaTab = b.dataset.kt; save(); kanjiView("kana"); });
    $app.querySelectorAll("[data-kana]").forEach(b => b.onclick = () => say(b.dataset.kana));
  }
  // Lernkarte eines Kanji
  function kanjiCard(c, onBack, nav) {
    const k = kanjiAll().find(x => x.c === c); if (!k) return;
    current = { rerender: () => kanjiCard(c, onBack, nav) };
    const [pic, memo] = kinfo(c), ex = kex(c), s = ksent(c);
    // Blättern: vorheriges / nächstes Kanji (Reihenfolge wie in „Alle Kanji“)
    const ALL = kanjiAll(), idx = ALL.findIndex(x => x.c === c);
    const prevK = ALL[(idx - 1 + ALL.length) % ALL.length].c, nextK = ALL[(idx + 1) % ALL.length].c;
    const pager = nav ? "" : `<div class="k-nav"><button class="k-arrow" id="kprev" aria-label="Vorheriges Kanji">‹ <span class="jp">${prevK}</span></button>
      <button class="k-write" id="kwrite"><svg class="btn-ic"><use href="#i-brush"/></svg>Schreiben üben<small>${idx + 1} / ${ALL.length}</small></button><button class="k-arrow" id="knextk" aria-label="Nächstes Kanji"><span class="jp">${nextK}</span> ›</button></div>`;
    const rd = (list, label) => list.length ? `<div class="k-read"><span class="small muted">${label}</span>${list.map(r => `<button class="chip jp" data-say="${esc(readSay(r))}">${esc(readShow(r))}</button>`).join("")}</div>` : "";
    show("Kanji", `${nav ? nav.head : pager}<div class="card k-card">
        <div class="k-top"><div class="k-big jp">${c}</div>${kanjiPic(pic, "kpic big")}</div>
        <div class="k-de">${esc(k.de)}</div>
        ${memo ? `<div class="k-memo"><svg class="tip-ic"><use href="#i-bulb"/></svg><div><b class="tip-h">Eselsbrücke</b><br>${esc(memo)}</div></div>` : ""}
        ${rd(readList(k.kun), "japanische Lesung (kun)")}${rd(readList(k.on), "chinesische Lesung (on)")}
        ${ex.length ? `<h3>Wörter</h3>${ex.map(e => `<button class="k-ex" data-say="${esc(e.kana)}"><span class="jp k-ex-j">${esc(e.kanji)}</span><span class="jp small">${esc(readingText(e.kana))}</span><span class="small muted">${esc(e.de)}</span></button>`).join("")}` : ""}
        ${s ? `<h3>Satz</h3><button class="k-ex k-sent" data-say="${esc(s.kana)}"><span class="jp">${esc(scriptText(s.kana, s.kanji, true))}</span><span class="small muted">${esc(s.de)}</span></button>` : ""}
      </div>${nav ? nav.foot : ""}`, { back: onBack });
    $app.querySelectorAll("[data-say]").forEach(b => b.onclick = () => say(b.dataset.say));
    const kw = $("#kwrite"); if (kw) kw.onclick = () => writeSession([{ ...k }], () => kanjiCard(c, onBack));
    if (nav && nav.bind) nav.bind();
    if (!nav) {
      $("#kprev").onclick = () => kanjiCard(prevK, onBack);
      $("#knextk").onclick = () => kanjiCard(nextK, onBack);
      // Pfeiltasten (Tastatur) und Wischen nach links/rechts
      const key = e => { if (e.key === "ArrowLeft") kanjiCard(prevK, onBack); else if (e.key === "ArrowRight") kanjiCard(nextK, onBack); };
      let sx = null, sy = 0;
      const ts = e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
      const te = e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null;
        if (Math.abs(dx) > 70 && Math.abs(dx) > 2 * Math.abs(dy)) kanjiCard(dx < 0 ? nextK : prevK, onBack); };
      document.addEventListener("keydown", key); $app.addEventListener("touchstart", ts, { passive: true }); $app.addEventListener("touchend", te);
      cleanup = () => { document.removeEventListener("keydown", key); $app.removeEventListener("touchstart", ts); $app.removeEventListener("touchend", te); };
    }
  }
  // Lernrunde: neue Kanji kennenlernen, dann abfragen (Bedeutung, Zeichen, Lesung)
  function kanjiLearn() {
    const K = kstore(), now = Date.now();
    const set = window.KanjiData.SETS.find(s => s.id === (DB.kanjiSet || "n5")) || window.KanjiData.SETS.find(s => s.id === "n5");
    const all = kanjiAll(), inSet = c => set.chars.some(x => x.c === c.c);
    const due = shuffle(all.filter(k => K[k.c] && K[k.c].d <= now)).slice(0, 10);
    const fresh = set.chars.map(x => all.find(k => k.c === x.c)).filter(k => k && !K[k.c]).slice(0, 5);
    void inSet;
    if (!due.length && !fresh.length) {
      show("Kanji", `<div class="card center"><div class="big-emoji">🎉</div><h2>Alles erledigt!</h2><p>In dieser Gruppe hast du alle Kanji gelernt und nichts ist fällig. Wähle eine andere Gruppe oder spiel Kanji-Memory.</p>
        <button class="btn primary" id="back">Zurück</button></div>`, { back: () => kanjiView("learn") });
      $("#back").onclick = () => kanjiView("learn"); return;
    }
    const L = { intro: fresh.slice(), items: [...fresh, ...due], fail: new Set(), queue: [], n: 0 };
    const types = ["mean", "kanji", "read"];
    L.items.forEach(k => shuffle(types).slice(0, 2).forEach(t => L.queue.push({ k, t })));
    L.queue = shuffle(L.queue); L.total = L.queue.length;
    const introNext = i => {
      if (i >= L.intro.length) return quiz();
      kanjiCard(L.intro[i].c, () => kanjiView("learn"), {
        head: `<div class="progress"><i style="width:${Math.round(100 * i / L.intro.length)}%"></i></div><div class="stage-label"><span>Neues Kanji</span><span>${i + 1}/${L.intro.length}</span></div>`,
        foot: `<button class="btn primary" id="knext">${i + 1 < L.intro.length ? "Nächstes Kanji" : "Jetzt üben"}</button>`,
        bind: () => { say((kex(L.intro[i].c)[0] || {}).kana || readSay(readList(L.intro[i].kun)[0] || L.intro[i].on)); $("#knext").onclick = () => introNext(i + 1); },
      });
    };
    const quiz = () => {
      if (!L.queue.length) return end();
      const task = L.queue.shift(), k = task.k; L.n++;
      current = null;
      const others = shuffle(all.filter(x => x.c !== k.c));
      let prompt, opts, right;
      const ex = kex(k.c).filter(e => e.kanji && e.kanji.includes(k.c));
      let t = task.t; if (t === "read" && !ex.length) t = "mean";
      if (t === "mean") {
        prompt = `<div class="k-q jp">${k.c}</div><div class="sub">Was bedeutet das?</div>`;
        right = k.de; opts = shuffle(uniqBy([k.de, ...others.map(x => x.de)], x => x).slice(0, 4)).map(x => [x, esc(x)]);
      } else if (t === "kanji") {
        prompt = `<div class="de">${esc(k.de)}</div><div class="sub">Welches Kanji ist das?</div>`;
        right = k.c; opts = shuffle([k.c, ...others.slice(0, 3).map(x => x.c)]).map(x => [x, `<span class="k-opt">${x}</span>`]);
      } else {
        const e = gpick(ex);
        prompt = `<div class="k-q jp" style="font-size:44px">${esc(e.kanji)}</div><div class="sub">Wie liest man das? (${esc(e.de)})</div>`;
        const pool = all.flatMap(x => kex(x.c)).filter(x => x.kana !== e.kana && x.kanji !== e.kanji);
        right = e.kana; opts = shuffle(uniqBy([e.kana, ...shuffle(pool).map(x => x.kana)], x => x).slice(0, 4)).map(x => [x, esc(readingText(x))]);
        task.say = e.kana;
      }
      show("Kanji", `<div class="progress"><i style="width:${Math.round(100 * (L.n - 1) / L.total)}%"></i></div>
        <div class="stage-label"><span>Kanji üben</span><span>${L.n}/${L.total}</span></div>
        <div class="card"><div class="prompt">${prompt}</div><div class="options">${opts.map(([v, h], i) => `<button class="option jp" data-i="${i}">${h}</button>`).join("")}</div><div id="area"></div></div>`, { back: () => { if (confirm("Runde beenden?")) kanjiView("learn"); } });
      $app.querySelectorAll(".option").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i][0] === right;
        $app.querySelectorAll(".option").forEach((x, i) => { x.disabled = true; if (opts[i][0] === right) x.classList.add("correct"); });
        if (!ok) { b.classList.add("wrong"); L.fail.add(k.c); if ((task.retry || 0) < 2) { L.queue.splice(Math.min(L.queue.length, 3), 0, { k, t: task.t, retry: (task.retry || 0) + 1 }); L.total++; } }
        say(task.say || (kex(k.c)[0] || {}).kana || readSay(readList(k.kun)[0] || k.on));
        const [pic, memo] = kinfo(k.c);
        $("#area").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Nicht ganz."}
            <div class="k-fb">${kanjiPic(pic, "kpic")}<div><b class="jp" style="font-size:28px">${k.c}</b> = ${esc(k.de)}${!ok && memo ? `<div class="small">${esc(memo)}</div>` : ""}</div></div></div>
          <button class="btn primary" id="next">Weiter</button>`;
        $("#next").onclick = quiz;
      });
    };
    const end = () => {
      const K2 = kstore(), t = Date.now();
      L.items.forEach(k => {
        const p = K2[k.c] || { b: 0 };
        p.b = L.fail.has(k.c) ? Math.max(1, p.b - 1) : Math.min(INTERVALS.length - 1, p.b + 1);
        p.d = t + INTERVALS[p.b] * DAY - 3600000; K2[k.c] = p;
      });
      save(); current = null;
      const ok = L.items.length - L.fail.size;
      show("Kanji", `<div class="card center"><div class="big-emoji">${ok === L.items.length ? "🏆" : "💪"}</div>
        <h2>${ok} von ${L.items.length} Kanji ohne Fehler</h2>
        <div class="k-done jp">${L.items.map(k => `<span class="${L.fail.has(k.c) ? "bad" : ""}">${k.c}</span>`).join("")}</div>
        <button class="btn primary" id="more">Weiter lernen</button><button class="btn" id="back">Zurück</button></div>`, { back: () => kanjiView("learn") });
      $("#more").onclick = kanjiLearn; $("#back").onclick = () => kanjiView("learn");
    };
    if (L.intro.length) introNext(0); else quiz();
  }
  // Hiragana / Katakana als Tabelle (antippen = anhören)
  const KANA_ROWS = ["あいうえお", "かきくけこ", "さしすせそ", "たちつてと", "なにぬねの", "はひふへほ", "まみむめも", "や・ゆ・よ", "らりるれろ", "わ・・・を", "ん"];
  const KANA_DAK = ["がぎぐげご", "ざじずぜぞ", "だぢづでど", "ばびぶべぼ", "ぱぴぷぺぽ"];
  const KANA_YOON = "きしちにひみりぎじびぴ";
  function kanaTableHTML(kt) {
    const conv = s => kt === "kata" ? s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60)) : s;
    const cell = k => k && k !== "・" ? `<button class="kana-cell" data-kana="${conv(k)}"><b class="jp">${conv(k)}</b><small>${k === "を" ? "o (wo)" : Kana.kanaToRomaji(k)}</small></button>` : `<span class="kana-cell empty"></span>`;
    const grid = (rows, cols) => `<div class="kana-grid" style="grid-template-columns:repeat(${cols},1fr)">${rows.map(r => { const a = [...r]; while (a.length < cols) a.push(""); return a.map(cell).join(""); }).join("")}</div>`;
    return `<div class="seg" style="margin-top:10px">${[["hira", "Hiragana"], ["kata", "Katakana"]].map(([t, l]) => `<button data-kt="${t}" class="${t === kt ? "on" : ""}">${l}</button>`).join("")}</div>
      ${tipBox("Tippe ein Zeichen an, um es zu hören.")}
      <h2>Grundzeichen</h2>${grid(KANA_ROWS, 5)}
      <h2>Mit ゛ und ゜ (Dakuten)</h2>${grid(KANA_DAK, 5)}
      <h2>Zusammengesetzt (ゃ ゅ ょ)</h2>${grid([...KANA_YOON].map(c => c + "ゃ・" + c + "ゅ・" + c + "ょ").map(s => s.split("・")), 3)}
      ${kt === "kata" ? tipBox(`Langer Vokal in Katakana: <span class="jp">ー</span> (z. B. <span class="jp">コーヒー</span> = koohii).`) : ""}`;
  }

  // ---------- Spiele ----------
  const gstore = () => DB.games || (DB.games = {});
  const gpick = a => a[Math.floor(Math.random() * a.length)];
  function gamesView() {
    current = { rerender: gamesView };
    const g = gstore();
    show("Spiele", `<div class="games-list">
      ${wideTile("g-rain", "i-sakura", "🌸", "Kana-Regen", `Zeichen oder Wörter, bevor sie landen${g.rain ? ` · Rekord ${g.rain}` : ""}`, "red")}
      ${wideTile("g-sushi", "s-sushi", "🍣", "Sushi-Band", `Nur die passenden Teller schnappen${g.sushi ? ` · Rekord ${g.sushi}` : ""}`)}
      ${wideTile("g-puzzle", "s-bubble", "🧩", "Satz-Puzzle", `Sätze richtig zusammensetzen${g.puzzle ? ` · ${g.puzzle} gelöst` : ""}`, "red")}
      ${wideTile("g-memory", "i-kanji", "🀄", "Kanji-Memory", `Kanji und Bedeutung finden${g.mem && g.mem.best && g.mem.best[g.mem.mode || "mean"] ? ` · Rekord ${g.mem.best[g.mem.mode || "mean"]} Züge` : ""}`)}
      </div>`, { back: home });
    $("#g-memory").onclick = memoryStart;
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
      field.classList.add("ended"); field.innerHTML = `<div class="rain-start scroll"><div class="big-emoji">${rec ? "🏆" : "🌸"}</div><h2 style="margin:0">${st.score} Punkte</h2>
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
      field.classList.add("ended"); field.innerHTML = `<div class="rain-start scroll"><div class="big-emoji">${rec ? "🏆" : "🍣"}</div><h2 style="margin:0">${st.score} Punkte</h2>
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
      ${tipBox(`Es kommen Sätze bis Lektion ${P.maxL} – je mehr Lektionen du einschaltest, desto mehr Sätze.`)}
      <button class="btn primary" id="pz-again">Nochmal</button><button class="btn" id="pz-games">Zu den Spielen</button></div>`, { back: gamesView });
    $("#pz-again").onclick = puzzleStart; $("#pz-games").onclick = gamesView;
  }

  // --- Kanji-Memory ---
  const MEM_MODES = [["mean", "Bedeutung"], ["read", "Lesung"]];
  function memoryStart() {
    const g = gstore(), M = g.mem = g.mem || { mode: "mean", set: "learned", best: {} };
    if (!MEM_MODES.some(m => m[0] === M.mode)) M.mode = "mean";
    current = { rerender: memoryStart };
    const sets = window.KanjiData.SETS.filter(s => s.kind === "kanji");
    const learnedN = kanjiAll().filter(k => kstore()[k.c]).length;
    if (M.set === "learned" && learnedN < 6) M.set = "n5";
    show("Kanji-Memory", `<div class="card">
        <h2 style="margin-top:0">Paare</h2>
        <div class="seg" id="mmode">${MEM_MODES.map(([m, l]) => `<button data-m="${m}" class="${M.mode === m ? "on" : ""}">Kanji ↔ ${l}</button>`).join("")}</div>
        <h2>Welche Kanji?</h2>
        <div class="chip-row">${learnedN >= 6 ? `<button class="chip ${M.set === "learned" ? "on" : ""}" data-set="learned">Meine gelernten (${learnedN})</button>` : ""}${sets.map(s => `<button class="chip ${M.set === s.id ? "on" : ""}" data-set="${s.id}">${esc(s.name.replace("Kanji: ", ""))}</button>`).join("")}</div>
        <button class="btn primary" id="mgo">Spielen</button>
        ${M.best[M.mode] ? `<p class="center small muted">Rekord: ${M.best[M.mode]} Züge</p>` : ""}</div>
        ${tipBox(`Decke zwei Karten auf. Passen Kanji und ${MEM_MODES.find(m => m[0] === M.mode)[1]} zusammen, bleiben sie offen. Schaffst du es mit wenigen Zügen?${learnedN < 6 ? "<br>Sobald du 6 Kanji gelernt hast, kannst du auch nur mit deinen gelernten spielen." : ""}`)}`, { back: gamesView });
    $app.querySelectorAll("#mmode button").forEach(b => b.onclick = () => { M.mode = b.dataset.m; save(); memoryStart(); });
    $app.querySelectorAll("[data-set]").forEach(b => b.onclick = () => { M.set = b.dataset.set; save(); memoryStart(); });
    $("#mgo").onclick = () => memoryRun();
  }
  function memoryRun() {
    const g = gstore(), M = g.mem, all = kanjiAll();
    const set = window.KanjiData.SETS.find(s => s.id === M.set);
    let pool = M.set === "learned" ? all.filter(k => kstore()[k.c]) : all.filter(k => set && set.chars.some(x => x.c === k.c));
    const mainRead = k => readSay(readList(k.kun)[0] || Kana.toHira(readList(k.on)[0] || ""));
    if (M.mode === "pic") pool = pool.filter(k => kinfo(k.c)[0]);
    if (pool.length < 6) pool = all.filter(k => M.mode !== "pic" || kinfo(k.c)[0]);
    const pick = shuffle(uniqBy(shuffle(pool), k => M.mode === "mean" ? k.de : M.mode === "read" ? mainRead(k) : kinfo(k.c)[0])).slice(0, 6);
    const face = k => M.mode === "mean" ? `<span class="mem-de">${esc(k.de.split(",")[0])}</span>` : M.mode === "pic" ? kanjiPic(kinfo(k.c)[0], "kpic mem-pic") : `<span class="jp mem-rd">${esc(readingText(mainRead(k)))}</span>`;
    const cards = shuffle(pick.flatMap(k => [{ c: k.c, html: `<span class="jp mem-k">${k.c}</span>` }, { c: k.c, html: face(k) }]));
    const S = { open: [], done: 0, moves: 0, lock: false };
    current = null;
    show("Kanji-Memory", `<div class="game-hud"><span>Züge: <b id="mmoves">0</b></span><span>Paare: <b id="mpairs">0</b>/6</span></div>
      <div class="mem-grid">${cards.map((c, i) => `<button class="mem-card" data-i="${i}"><span class="mem-back"></span><span class="mem-front">${c.html}</span></button>`).join("")}</div>`, { back: memoryStart });
    const els = [...$app.querySelectorAll(".mem-card")];
    cleanup = () => { S.dead = true; };
    els.forEach(el => el.onclick = () => {
      const i = +el.dataset.i;
      if (S.lock || S.dead || el.classList.contains("up")) return;
      el.classList.add("up"); S.open.push(i);
      if (S.open.length < 2) return;
      S.moves++; $("#mmoves").textContent = S.moves;
      const [a, b] = S.open; S.open = [];
      if (cards[a].c === cards[b].c) {
        S.done++; $("#mpairs").textContent = S.done;
        [a, b].forEach(j => els[j].classList.add("match"));
        const k = all.find(x => x.c === cards[a].c); say(mainRead(k));
        if (S.done === 6) setTimeout(() => {
          if (S.dead) return;
          const best = M.best[M.mode], rec = !best || S.moves < best;
          if (rec) { M.best[M.mode] = S.moves; save(); }
          show("Kanji-Memory", `<div class="card center"><div class="big-emoji">${rec ? "🏆" : "🀄"}</div>
            <h2>Geschafft in ${S.moves} Zügen</h2>${rec ? `<p><b>Neuer Rekord!</b></p>` : `<p class="muted">Rekord: ${best} Züge</p>`}
            <div class="k-done jp">${pick.map(k => `<button class="chip jp" data-k="${k.c}">${k.c} <small>${esc(k.de.split(",")[0])}</small></button>`).join("")}</div>
            <button class="btn primary" id="again">Nochmal</button><button class="btn" id="back">Zu den Spielen</button></div>`, { back: memoryStart });
          $("#again").onclick = memoryRun; $("#back").onclick = gamesView;
          $app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => kanjiCard(b.dataset.k, memoryStart));
        }, 700);
      } else {
        S.lock = true;
        setTimeout(() => { [a, b].forEach(j => els[j].classList.remove("up")); S.lock = false; }, 1000);
      }
    });
  }

  // ---------- Start ----------
  buildWords(); save(); updateScriptBtn(); applyTheme(); home();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
  }
})();
