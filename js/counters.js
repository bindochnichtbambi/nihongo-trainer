// Zählwörter (助数詞) und Zahlen
(function () {
  const D = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];
  const H = ["", "ひゃく", "にひゃく", "さんびゃく", "よんひゃく", "ごひゃく", "ろっぴゃく", "ななひゃく", "はっぴゃく", "きゅうひゃく"];
  const S = ["", "せん", "にせん", "さんぜん", "よんせん", "ごせん", "ろくせん", "ななせん", "はっせん", "きゅうせん"];
  function under10k(n) {
    let s = S[Math.floor(n / 1000)] + H[Math.floor(n / 100) % 10];
    const t = Math.floor(n / 10) % 10;
    if (t) s += (t === 1 ? "" : D[t]) + "じゅう";
    return s + D[n % 10];
  }
  function numReading(n) {
    if (n === 0) return "ゼロ";
    const man = Math.floor(n / 10000), r = n % 10000;
    return (man ? under10k(man) + "まん" : "") + under10k(r);
  }
  function numAlts(n) {
    const base = numReading(n), alts = [base];
    // 7 = しち, 9 = く, 4 = し sind auch möglich
    if (n % 10 === 7) alts.push(base.replace(/なな$/, "しち"));
    if (n % 10 === 4 && n > 10) alts.push(base.replace(/よん$/, "し"));
    if (n % 10 === 9) alts.push(base.replace(/きゅう$/, "く"));
    return alts;
  }
  function yen(n) { const r = numReading(n); return r.endsWith("よん") ? r.slice(0, -1) + "えん" : r + "えん"; }

  const FUN = ["", "いっぷん", "にふん", "さんぷん", "よんぷん", "ごふん", "ろっぷん", "ななふん", "はっぷん", "きゅうふん"];
  function fun(n) {
    const t = Math.floor(n / 10), o = n % 10;
    const tens = t ? (t === 1 ? "" : D[t]) : "";
    if (o === 0) return [tens + "じゅっぷん", tens + "じっぷん"];
    const r = (t ? tens + "じゅう" : "") + FUN[o];
    const alts = [r];
    if (o === 7) alts.push((t ? tens + "じゅう" : "") + "しちふん");
    if (o === 8) alts.push((t ? tens + "じゅう" : "") + "はちふん");
    return alts;
  }
  const JI = ["", "いちじ", "にじ", "さんじ", "よじ", "ごじ", "ろくじ", "しちじ", "はちじ", "くじ", "じゅうじ", "じゅういちじ", "じゅうにじ"];
  const GATSU = ["", "いちがつ", "にがつ", "さんがつ", "しがつ", "ごがつ", "ろくがつ", "しちがつ", "はちがつ", "くがつ", "じゅうがつ", "じゅういちがつ", "じゅうにがつ"];
  const MONTHS_DE = ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const HI = ["", "ついたち", "ふつか", "みっか", "よっか", "いつか", "むいか", "なのか", "ようか", "ここのか", "とおか",
    "じゅういちにち", "じゅうににち", "じゅうさんにち", "じゅうよっか", "じゅうごにち", "じゅうろくにち", "じゅうしちにち", "じゅうはちにち", "じゅうくにち", "はつか",
    "にじゅういちにち", "にじゅうににち", "にじゅうさんにち", "にじゅうよっか", "にじゅうごにち", "にじゅうろくにち", "にじゅうしちにち", "にじゅうはちにち", "にじゅうくにち", "さんじゅうにち", "さんじゅういちにち"];
  const YOUBI = [["げつようび", "月曜日", "Montag"], ["かようび", "火曜日", "Dienstag"], ["すいようび", "水曜日", "Mittwoch"], ["もくようび", "木曜日", "Donnerstag"], ["きんようび", "金曜日", "Freitag"], ["どようび", "土曜日", "Samstag"], ["にちようび", "日曜日", "Sonntag"]];

  // Objekt-Zählwörter: forms[n-1] = Lesung für n (Array = mehrere richtige Lesungen)
  const C = {
    tsu: { label: "つ", title: "Allgemein (ひとつ, ふたつ …)", base: "つ",
      info: "Japanische Zählweise für fast alles ohne eigenes Zählwort – praktisch beim Bestellen: „これを ふたつ ください“. Nur bis 10, danach normale Zahlen.",
      forms: ["ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ", "とお"],
      items: [["🍎", "りんご", "Äpfel"], ["🍊", "みかん", "Mandarinen"], ["🍙", "おにぎり", "Reisbällchen"], ["🍰", "ケーキ", "Kuchen"], ["🎁", "プレゼント", "Geschenke"]] },
    nin: { label: "人", title: "Personen (〜にん)", base: "にん",
      info: "Personen: 1 = ひとり, 2 = ふたり sind unregelmäßig, ab 3 regelmäßig mit 〜にん. Achtung: 4 = よにん.",
      forms: ["ひとり", "ふたり", "さんにん", "よにん", "ごにん", "ろくにん", ["しちにん", "ななにん"], "はちにん", ["きゅうにん", "くにん"], "じゅうにん"],
      items: [["🧑", "ひと", "Personen"], ["👧", "おんなのこ", "Mädchen"], ["👦", "おとこのこ", "Jungen"], ["🧑‍🎓", "がくせい", "Studierende"]] },
    hiki: { label: "匹", title: "Kleine Tiere (〜ひき)", base: "ひき",
      info: "Kleine Tiere wie Katzen, Hunde, Fische, Insekten. Lautänderungen: 1 いっぴき, 3 さんびき, 6 ろっぴき, 8 はっぴき, 10 じゅっぴき.",
      forms: ["いっぴき", "にひき", "さんびき", "よんひき", "ごひき", "ろっぴき", "ななひき", ["はっぴき", "はちひき"], "きゅうひき", ["じゅっぴき", "じっぴき"]],
      items: [["🐱", "ねこ", "Katzen"], ["🐶", "いぬ", "Hunde"], ["🐟", "さかな", "Fische"], ["🐸", "かえる", "Frösche"], ["🐭", "ねずみ", "Mäuse"]] },
    hon: { label: "本", title: "Lange, dünne Dinge (〜ほん)", base: "ほん",
      info: "Stifte, Flaschen, Regenschirme, Bananen … Lautänderungen wie bei 匹: 1 いっぽん, 3 さんぼん, 6 ろっぽん, 8 はっぽん, 10 じゅっぽん.",
      forms: ["いっぽん", "にほん", "さんぼん", "よんほん", "ごほん", "ろっぽん", "ななほん", ["はっぽん", "はちほん"], "きゅうほん", ["じゅっぽん", "じっぽん"]],
      items: [["✏️", "えんぴつ", "Bleistifte"], ["🖊️", "ペン", "Stifte"], ["🍾", "ワイン", "Flaschen Wein"], ["🌂", "かさ", "Regenschirme"], ["🍌", "バナナ", "Bananen"]] },
    mai: { label: "枚", title: "Flache Dinge (〜まい)", base: "まい",
      info: "Papier, Fotos, T-Shirts, Tickets, Teller. Ganz regelmäßig – nur 4 = よんまい, 7 = ななまい.",
      forms: ["いちまい", "にまい", "さんまい", "よんまい", "ごまい", "ろくまい", ["ななまい", "しちまい"], "はちまい", "きゅうまい", "じゅうまい"],
      items: [["📄", "かみ", "Blätter Papier"], ["👕", "Tシャツ", "T-Shirts"], ["🎫", "チケット", "Tickets"], ["🖼️", "しゃしん", "Fotos"], ["🍽️", "さら", "Teller"]] },
    hai: { label: "杯", title: "Getränke / Schüsseln (〜はい)", base: "はい",
      info: "Tassen, Gläser, Schüsseln – also Kaffee, Bier, Reis, Ramen. Lautänderungen: 1 いっぱい, 3 さんばい, 6 ろっぱい, 8 はっぱい, 10 じゅっぱい.",
      forms: ["いっぱい", "にはい", "さんばい", "よんはい", "ごはい", "ろっぱい", "ななはい", ["はっぱい", "はちはい"], "きゅうはい", ["じゅっぱい", "じっぱい"]],
      items: [["☕", "コーヒー", "Tassen Kaffee"], ["🍵", "おちゃ", "Tassen Tee"], ["🍺", "ビール", "Gläser Bier"], ["🍚", "ごはん", "Schüsseln Reis"], ["🍜", "ラーメン", "Schüsseln Ramen"]] },
    ko: { label: "個", title: "Kleine, runde Dinge (〜こ)", base: "こ",
      info: "Kleine, kompakte Dinge: Eier, Äpfel, Bonbons, Stücke. Lautänderungen: 1 いっこ, 6 ろっこ, 8 はっこ, 10 じゅっこ.",
      forms: ["いっこ", "にこ", "さんこ", "よんこ", "ごこ", "ろっこ", "ななこ", ["はっこ", "はちこ"], "きゅうこ", ["じゅっこ", "じっこ"]],
      items: [["🥚", "たまご", "Eier"], ["🍬", "あめ", "Bonbons"], ["🍑", "もも", "Pfirsiche"], ["🧁", "カップケーキ", "Cupcakes"]] },
    satsu: { label: "冊", title: "Bücher, Hefte (〜さつ)", base: "さつ",
      info: "Bücher, Hefte, Mangas, Zeitschriften. Lautänderungen: 1 いっさつ, 8 はっさつ, 10 じゅっさつ.",
      forms: ["いっさつ", "にさつ", "さんさつ", "よんさつ", "ごさつ", "ろくさつ", "ななさつ", "はっさつ", "きゅうさつ", ["じゅっさつ", "じっさつ"]],
      items: [["📕", "ほん", "Bücher"], ["📓", "ノート", "Hefte"], ["📚", "マンガ", "Mangas"]] },
    dai: { label: "台", title: "Maschinen, Fahrzeuge (〜だい)", base: "だい",
      info: "Autos, Fahrräder, Fernseher, Computer. Ganz regelmäßig: いちだい, にだい, さんだい …",
      forms: ["いちだい", "にだい", "さんだい", "よんだい", "ごだい", "ろくだい", "ななだい", "はちだい", "きゅうだい", "じゅうだい"],
      items: [["🚗", "くるま", "Autos"], ["🚲", "じてんしゃ", "Fahrräder"], ["📺", "テレビ", "Fernseher"], ["💻", "パソコン", "Computer"]] },
  };

  // Spezial-Kategorien ohne Bilder
  const SPECIAL = {
    sai: { label: "歳", title: "Alter (〜さい)", info: "Alter: 1 いっさい, 8 はっさい, 10 じゅっさい. 20 Jahre = はたち (besonders!)." },
    hi: { label: "日", title: "Datum (1.–31.)", info: "Die Tage 1–10, 14, 20 und 24 sind unregelmäßig: ついたち, ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか, じゅうよっか, はつか, にじゅうよっか." },
    youbi: { label: "曜", title: "Wochentage", info: "げつ(月 Mond), か(火 Feuer), すい(水 Wasser), もく(木 Holz), きん(金 Gold), ど(土 Erde), にち(日 Sonne) + ようび." },
    gatsu: { label: "月", title: "Monate", info: "Monat = Zahl + がつ. Achtung: April = しがつ, Juli = しちがつ, September = くがつ." },
    ji: { label: "時", title: "Uhrzeit (Stunden)", info: "Stunde = Zahl + じ. Achtung: 4 = よじ, 7 = しちじ, 9 = くじ. Halb = はん (z. B. よじはん)." },
    fun: { label: "分", title: "Minuten", info: "Minuten: 1 いっぷん, 3 さんぷん, 4 よんぷん, 6 ろっぷん, 8 はっぷん, 10 じゅっぷん – sonst 〜ふん." },
    num: { label: "123", title: "Zahlen", info: "Zahlen: 100 ひゃく, 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく · 1000 せん, 3000 さんぜん, 8000 はっせん · 10.000 いちまん." },
    yen: { label: "円", title: "Preise (〜えん)", info: "Preis = Zahl + えん. Achtung: 4 Yen = よえん (nicht よんえん)." },
  };

  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function arr(x) { return Array.isArray(x) ? x : [x]; }
  const SAI = ["いっさい", "にさい", "さんさい", "よんさい", "ごさい", "ろくさい", "ななさい", "はっさい", "きゅうさい", ["じゅっさい", "じっさい"]];

  function saiReading(n) {
    if (n === 20) return ["はたち", "にじゅっさい"];
    if (n <= 10) return arr(SAI[n - 1]);
    const t = Math.floor(n / 10), o = n % 10;
    const tens = t === 1 ? "" : D[t];
    if (o === 0) return [tens + "じゅっさい", tens + "じっさい"];
    return [(tens + "じゅう") + arr(SAI[o - 1])[0]];
  }

  // Erzeugt eine Frage: {prompt (HTML), sub, answers[], naive[], info, cat}
  function makeQuestion(cat) {
    if (C[cat]) {
      const c = C[cat], n = rnd(1, 10), item = pick(c.items);
      const answers = arr(c.forms[n - 1]);
      const style = Math.random() < 0.65 ? "pic" : "num";
      const prompt = style === "pic"
        ? `<div class="emoji-grid">${Array(n).fill(`<span>${item[0]}</span>`).join("")}</div>`
        : `<div class="big-num">${n}${c.label}</div>`;
      const sub = style === "pic" ? `${item[1]}（${item[2]}） – wie viele?` : `Wie liest man das?`;
      const wrong = [];
      if (n <= 9 || cat !== "tsu") wrong.push((n === 10 ? "じゅう" : D[n]) + c.base);
      for (const k of [n - 1, n + 1]) if (k >= 1 && k <= 10) wrong.push(arr(c.forms[k - 1])[0]);
      const other = C[pick(Object.keys(C).filter(k => k !== cat))];
      wrong.push(arr(other.forms[n - 1])[0]);
      return { cat, prompt, sub, answers, wrong, info: c.info, table: c.forms.map((f, i) => [(i + 1) + c.label, arr(f).join(" / ")]) };
    }
    if (cat === "sai") {
      const n = Math.random() < 0.6 ? rnd(1, 10) : pick([18, 20, 20, 25, 30, 38, 40, 41, 48, 60]);
      const answers = saiReading(n);
      return { cat, prompt: `<div class="emoji-row">🎂</div><div class="big-num">${n}歳</div>`, sub: "Wie alt?", answers,
        wrong: [numReading(n) + "さい", ...(n > 1 ? saiReading(n - 1) : []).slice(0, 1), ...saiReading(n + 1).slice(0, 1)], info: SPECIAL.sai.info,
        table: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20].map(i => [i + "歳", saiReading(i).join(" / ")]) };
    }
    if (cat === "hi") {
      const n = Math.random() < 0.6 ? rnd(1, 10) : pick([14, 20, 24, rnd(11, 31)]);
      return { cat, prompt: `<div class="emoji-row">📅</div><div class="big-num">${n}日</div>`, sub: `der ${n}. (Datum)`, answers: [HI[n]],
        wrong: [numReading(n) + "にち", HI[n === 31 ? 30 : n + 1], HI[n === 1 ? 2 : n - 1]], info: SPECIAL.hi.info,
        table: HI.slice(1).map((h, i) => [(i + 1) + "日", h]) };
    }
    if (cat === "youbi") {
      const i = rnd(0, 6), y = YOUBI[i];
      return { cat, prompt: `<div class="big-num small">${y[2]}</div>`, sub: `${y[1]} – wie heißt der Tag?`, answers: [y[0]],
        wrong: YOUBI.filter((_, k) => k !== i).map(x => x[0]), info: SPECIAL.youbi.info, table: YOUBI.map(x => [x[2] + " " + x[1], x[0]]) };
    }
    if (cat === "gatsu") {
      const n = rnd(1, 12);
      return { cat, prompt: `<div class="big-num">${n}月</div>`, sub: MONTHS_DE[n], answers: [GATSU[n]],
        wrong: [numReading(n) + "がつ", GATSU[n === 12 ? 11 : n + 1], GATSU[n === 1 ? 2 : n - 1]], info: SPECIAL.gatsu.info,
        table: GATSU.slice(1).map((g, i) => [(i + 1) + "月 " + MONTHS_DE[i + 1], g]) };
    }
    if (cat === "ji") {
      const n = rnd(1, 12), half = Math.random() < 0.3;
      return { cat, prompt: `<div class="emoji-row">🕐</div><div class="big-num">${n}時${half ? "半" : ""}</div>`, sub: half ? `halb ${n === 12 ? 1 : n + 1} (${n}:30)` : `${n} Uhr`,
        answers: [JI[n] + (half ? "はん" : "")], wrong: [numReading(n) + "じ" + (half ? "はん" : ""), JI[n === 12 ? 11 : n + 1] + (half ? "はん" : ""), JI[n === 1 ? 2 : n - 1] + (half ? "はん" : "")],
        info: SPECIAL.ji.info, table: JI.slice(1).map((j, i) => [(i + 1) + "時", j]) };
    }
    if (cat === "fun") {
      const n = Math.random() < 0.5 ? rnd(1, 10) : rnd(11, 59);
      const n2 = n === 59 ? 58 : n + 1;
      return { cat, prompt: `<div class="emoji-row">⏱️</div><div class="big-num">${n}分</div>`, sub: `${n} Minuten`, answers: fun(n),
        wrong: [numReading(n) + "ふん", numReading(n) + "ぷん", fun(n2)[0]], info: SPECIAL.fun.info,
        table: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30].map(i => [i + "分", fun(i).join(" / ")]) };
    }
    if (cat === "num") {
      const n = pick([rnd(11, 99), rnd(100, 999), rnd(100, 999), rnd(1000, 9999), rnd(10000, 99999), pick([300, 600, 800, 3000, 8000, 1000, 10000])]);
      const ans = numAlts(n);
      const wrong = [ans[0].replace("びゃく", "ひゃく").replace("ぴゃく", "ひゃく").replace("ぜん", "せん").replace("っせん", "ちせん"), numReading(n + 1), numReading(n + 10), numReading(n + 100)];
      return { cat, prompt: `<div class="big-num">${n.toLocaleString("de-DE")}</div>`, sub: "Wie liest man die Zahl?", answers: ans, wrong, info: SPECIAL.num.info,
        table: [[100, 0], [300, 0], [600, 0], [800, 0], [1000, 0], [3000, 0], [8000, 0], [10000, 0]].map(([v]) => [v.toLocaleString("de-DE"), numReading(v)]) };
    }
    if (cat === "yen") {
      const n = pick([rnd(1, 9) * 100, rnd(1, 9) * 1000 + rnd(0, 9) * 100, rnd(100, 999), 4, 14, 104, rnd(1, 9) * 10000, 350, 1500, 2800]);
      return { cat, prompt: `<div class="emoji-row">💴</div><div class="big-num">¥${n.toLocaleString("de-DE")}</div>`, sub: "Wie viel kostet es?", answers: [yen(n)],
        wrong: [numReading(n) + "えん", yen(n + 100), yen(n > 100 ? n - 100 : n + 10)], info: SPECIAL.yen.info,
        table: [4, 100, 300, 600, 800, 1000, 3000, 8000, 10000].map(v => ["¥" + v.toLocaleString("de-DE"), yen(v)]) };
    }
  }

  const CATEGORIES = [
    ...Object.entries(C).map(([k, c]) => ({ id: k, label: c.label, title: c.title })),
    ...Object.entries(SPECIAL).map(([k, c]) => ({ id: k, label: c.label, title: c.title })),
  ];
  window.Counters = { CATEGORIES, makeQuestion, numReading };
})();
