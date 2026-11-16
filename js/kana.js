// Kana <-> Romaji Hilfsfunktionen und Antwortvergleich.
(function () {
  const MONO = {
    あ:"a",い:"i",う:"u",え:"e",お:"o",
    か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",
    さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",
    た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",
    な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",
    は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",
    ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",
    や:"ya",ゆ:"yu",よ:"yo",
    ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",
    わ:"wa",ゐ:"i",ゑ:"e",を:" o",ん:"n",
    が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",
    ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",
    だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",
    ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",
    ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",
    ゔ:"vu",ぁ:"a",ぃ:"i",ぅ:"u",ぇ:"e",ぉ:"o",ゃ:"ya",ゅ:"yu",ょ:"yo",ゎ:"wa",
    "":" wa","":" e",
    "。":". ","、":", ","？":"? ","！":"! ","「":"\"","」":"\"","・":" ","～":"~","　":" ",
  };
  const DI = {
    きゃ:"kya",きゅ:"kyu",きょ:"kyo",しゃ:"sha",しゅ:"shu",しょ:"sho",
    ちゃ:"cha",ちゅ:"chu",ちょ:"cho",にゃ:"nya",にゅ:"nyu",にょ:"nyo",
    ひゃ:"hya",ひゅ:"hyu",ひょ:"hyo",みゃ:"mya",みゅ:"myu",みょ:"myo",
    りゃ:"rya",りゅ:"ryu",りょ:"ryo",ぎゃ:"gya",ぎゅ:"gyu",ぎょ:"gyo",
    じゃ:"ja",じゅ:"ju",じょ:"jo",びゃ:"bya",びゅ:"byu",びょ:"byo",
    ぴゃ:"pya",ぴゅ:"pyu",ぴょ:"pyo",
    しぇ:"she",ちぇ:"che",じぇ:"je",てぃ:"ti",でぃ:"di",とぅ:"tu",
    ふぁ:"fa",ふぃ:"fi",ふぇ:"fe",ふぉ:"fo",うぃ:"wi",うぇ:"we",うぉ:"wo",
    ゔぁ:"va",ゔぃ:"vi",ゔぇ:"ve",ゔぉ:"vo",
  };

  function toHira(s) {
    return s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }
  function hasKana(s) { return /[ぁ-ゖァ-ヺー]/.test(s); }
  function hasKanji(s) { return /[一-鿿々]/.test(s); }

  // Partikel は / へ am Ende eines Wortblocks markieren (wa / e)
  function markParticles(s) {
    // Ausnahme: Grussformeln, in denen は zum Wort gehört (こんにちは / こんばんは)
    return s.replace(/([ぁ-ゖァ-ヺー一-鿿～])は(?=[\s　。、？！?!,.]|$)/g, "$1")
            .replace(/([ぁ-ゖァ-ヺー一-鿿～])へ(?=[\s　。、？！?!,.]|$)/g, "$1")
            .replace(/(こんにち|こんばん)/g, "$1わ");
  }

  // particles = true nur bei Sätzen: dort wird は/へ am Wortende als Partikel (wa/e) gelesen.
  // Bei einzelnen Wörtern (はは = haha) bleibt は immer "ha".
  function kanaToRomaji(input, particles = false) {
    let s = toHira(particles ? markParticles(input) : input).replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
    let out = "", dbl = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "っ") { dbl = true; continue; }
      if (c === "ー") { const m = out.match(/[aeiou](?=[^aeiou]*$)/); out += m ? m[0] : ""; continue; }
      let r = DI[c + (s[i + 1] || "")];
      if (r) i++; else r = MONO[c];
      if (r === undefined) r = c;
      if (dbl) {
        if (/^[a-z]/.test(r)) r = (r.startsWith("ch") ? "t" : r[0]) + r;
        dbl = false;
      }
      if (c === "ん" && /^[aiueoy]/.test(romajiAt(s, i + 1))) r = "n'";
      out += r;
    }
    return out.replace(/ +/g, " ").trim();
  }
  function romajiAt(s, i) { const c = s[i]; if (!c) return ""; return DI[c + (s[i + 1] || "")] || MONO[c] || ""; }

  // Für den Antwortvergleich: Romaji vereinheitlichen
  // loose = true nur bei Sätzen: dort darf die Partikel は als "ha" oder "wa" getippt werden
  function normRomaji(s, loose = false) {
    let r = s.toLowerCase()
      .replace(/ā/g, "aa").replace(/ī/g, "ii").replace(/ū/g, "uu").replace(/ē/g, "ee").replace(/ō/g, "oo").replace(/ô/g, "oo").replace(/û/g, "uu")
      .replace(/[^a-z]/g, "");
    r = r.replace(/sy/g, "sh").replace(/ty/g, "ch").replace(/zy|jy/g, "j").replace(/dy/g, "j")
      .replace(/si/g, "shi").replace(/ti/g, "chi").replace(/tu/g, "tsu").replace(/hu/g, "fu").replace(/zi/g, "ji")
      .replace(/shhi/g, "shi").replace(/tch/g, "cch").replace(/m(?=[bpm])/g, "n").replace(/nn(?![aiueoy])/g, "n");
    r = r.replace(/ou/g, "oo").replace(/ei/g, "ee").replace(/wo/g, "o");
    if (loose) r = r.replace(/ha/g, "wa").replace(/he/g, "e");
    return r;
  }
  function stripJP(s) {
    return toHira(s).replace(/[\s　。、？！?!,.「」『』・～~\-]/g, "").replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0));
  }
  function toComparable(input, loose = false) {
    const t = input.trim();
    if (hasKana(t) || hasKanji(t)) return normRomaji(kanaToRomaji(t, loose), loose);
    return normRomaji(t, loose);
  }
  // Prüft eine getippte Antwort gegen ein Wort {kana, kanji}; isPhrase = Satz/Ausdruck
  function matches(input, kana, kanji, isPhrase = false) {
    if (!input || !input.trim()) return false;
    const t = input.trim();
    if (hasKanji(t)) {
      const a = stripJP(t);
      return a === stripJP(kanji || kana) || a === stripJP(kana);
    }
    if (hasKana(t)) return stripJP(t) === stripJP(kana) || toComparable(t, isPhrase) === toComparable(kana, isPhrase);
    return toComparable(t, isPhrase) === toComparable(kana, isPhrase);
  }
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  function similarity(a, b) { const L = Math.max(a.length, b.length); return L ? 1 - lev(a, b) / L : 1; }

  // Spracherkennung: mehrere Alternativen gegen Kana- und Kanji-Form prüfen
  function speechScore(heardList, kana, kanji) {
    let best = 0;
    const targets = [stripJP(kana)]; if (kanji) targets.push(stripJP(kanji));
    const targetR = toComparable(kana);
    for (const h of heardList) {
      const hs = stripJP(h);
      for (const t of targets) best = Math.max(best, similarity(hs, t));
      if (!hasKanji(h)) best = Math.max(best, similarity(toComparable(h), targetR));
    }
    return best;
  }

  window.Kana = { toHira, kanaToRomaji, normRomaji, matches, speechScore, hasKanji, toComparable, stripJP };
})();
