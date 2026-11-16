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
      items: [["c-apple", "りんご", "Äpfel"], ["c-mandarin", "みかん", "Mandarinen"], ["c-onigiri", "おにぎり", "Reisbällchen"], ["c-cake", "ケーキ", "Kuchen"], ["c-gift", "プレゼント", "Geschenke"]] },
    nin: { label: "人", title: "Personen (〜にん)", base: "にん",
      info: "Personen: 1 = ひとり, 2 = ふたり sind unregelmässig, ab 3 regelmässig mit 〜にん. Achtung: 4 = よにん.",
      forms: ["ひとり", "ふたり", "さんにん", "よにん", "ごにん", "ろくにん", ["しちにん", "ななにん"], "はちにん", ["きゅうにん", "くにん"], "じゅうにん"],
      items: [["s-woman", "ひと", "Personen"], ["s-girl", "おんなのこ", "Mädchen"], ["c-boy", "おとこのこ", "Jungen"], ["c-student", "がくせい", "Studierende"]] },
    hiki: { label: "匹", title: "Kleine Tiere (〜ひき)", base: "ひき",
      info: "Kleine Tiere wie Katzen, Hunde, Fische, Insekten. Lautänderungen: 1 いっぴき, 3 さんびき, 6 ろっぴき, 8 はっぴき, 10 じゅっぴき.",
      forms: ["いっぴき", "にひき", "さんびき", "よんひき", "ごひき", "ろっぴき", "ななひき", ["はっぴき", "はちひき"], "きゅうひき", ["じゅっぴき", "じっぴき"]],
      items: [["i-cat", "ねこ", "Katzen"], ["c-dog", "いぬ", "Hunde"], ["c-fish", "さかな", "Fische"], ["c-frog", "かえる", "Frösche"], ["c-mouse", "ねずみ", "Mäuse"]] },
    hon: { label: "本", title: "Lange, dünne Dinge (〜ほん)", base: "ほん",
      info: "Stifte, Flaschen, Regenschirme, Bananen … Lautänderungen wie bei 匹: 1 いっぽん, 3 さんぼん, 6 ろっぽん, 8 はっぽん, 10 じゅっぽん.",
      forms: ["いっぽん", "にほん", "さんぼん", "よんほん", "ごほん", "ろっぽん", "ななほん", ["はっぽん", "はちほん"], "きゅうほん", ["じゅっぽん", "じっぽん"]],
      items: [["c-pencil", "えんぴつ", "Bleistifte"], ["c-pen", "ペン", "Stifte"], ["c-bottle", "ワイン", "Flaschen Wein"], ["c-umbrella", "かさ", "Regenschirme"], ["c-banana", "バナナ", "Bananen"]] },
    mai: { label: "枚", title: "Flache Dinge (〜まい)", base: "まい",
      info: "Papier, Fotos, T-Shirts, Tickets, Teller. Ganz regelmässig – nur 4 = よんまい, 7 = ななまい.",
      forms: ["いちまい", "にまい", "さんまい", "よんまい", "ごまい", "ろくまい", ["ななまい", "しちまい"], "はちまい", "きゅうまい", "じゅうまい"],
      items: [["c-paper", "かみ", "Blätter Papier"], ["c-tshirt", "Tシャツ", "T-Shirts"], ["c-ticket", "チケット", "Tickets"], ["c-photo", "しゃしん", "Fotos"], ["c-plate", "さら", "Teller"]] },
    hai: { label: "杯", title: "Getränke / Schüsseln (〜はい)", base: "はい",
      info: "Tassen, Gläser, Schüsseln – also Kaffee, Bier, Reis, Ramen. Lautänderungen: 1 いっぱい, 3 さんばい, 6 ろっぱい, 8 はっぱい, 10 じゅっぱい.",
      forms: ["いっぱい", "にはい", "さんばい", "よんはい", "ごはい", "ろっぱい", "ななはい", ["はっぱい", "はちはい"], "きゅうはい", ["じゅっぱい", "じっぱい"]],
      items: [["s-coffee", "コーヒー", "Tassen Kaffee"], ["c-greentea", "おちゃ", "Tassen Tee"], ["c-beer", "ビール", "Gläser Bier"], ["c-rice", "ごはん", "Schüsseln Reis"], ["i-tea", "ラーメン", "Schüsseln Ramen"]] },
    ko: { label: "個", title: "Kleine, runde Dinge (〜こ)", base: "こ",
      info: "Kleine, kompakte Dinge: Eier, Äpfel, Bonbons, Stücke. Lautänderungen: 1 いっこ, 6 ろっこ, 8 はっこ, 10 じゅっこ.",
      forms: ["いっこ", "にこ", "さんこ", "よんこ", "ごこ", "ろっこ", "ななこ", ["はっこ", "はちこ"], "きゅうこ", ["じゅっこ", "じっこ"]],
      items: [["c-egg", "たまご", "Eier"], ["c-candy", "あめ", "Bonbons"], ["c-peach", "もも", "Pfirsiche"], ["c-cupcake", "カップケーキ", "Cupcakes"]] },
    satsu: { label: "冊", title: "Bücher, Hefte (〜さつ)", base: "さつ",
      info: "Bücher, Hefte, Mangas, Zeitschriften. Lautänderungen: 1 いっさつ, 8 はっさつ, 10 じゅっさつ.",
      forms: ["いっさつ", "にさつ", "さんさつ", "よんさつ", "ごさつ", "ろくさつ", "ななさつ", "はっさつ", "きゅうさつ", ["じゅっさつ", "じっさつ"]],
      items: [["c-book", "ほん", "Bücher"], ["c-notebook", "ノート", "Hefte"], ["c-manga", "マンガ", "Mangas"]] },
    dai: { label: "台", title: "Maschinen, Fahrzeuge (〜だい)", base: "だい",
      info: "Autos, Fahrräder, Fernseher, Computer. Ganz regelmässig: いちだい, にだい, さんだい …",
      forms: ["いちだい", "にだい", "さんだい", "よんだい", "ごだい", "ろくだい", "ななだい", "はちだい", "きゅうだい", "じゅうだい"],
      items: [["c-car", "くるま", "Autos"], ["c-bike", "じてんしゃ", "Fahrräder"], ["s-tv", "テレビ", "Fernseher"], ["c-laptop", "パソコン", "Computer"]] },
  };

  // Spezial-Kategorien ohne Bilder
  const SPECIAL = {
    sai: { label: "歳", title: "Alter (〜さい)", info: "Alter: 1 いっさい, 8 はっさい, 10 じゅっさい. 20 Jahre = はたち (besonders!)." },
    hi: { label: "日", title: "Datum (1.–31.)", info: "Die Tage 1–10, 14, 20 und 24 sind unregelmässig: ついたち, ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか, じゅうよっか, はつか, にじゅうよっか." },
    youbi: { label: "曜", title: "Wochentage", info: "げつ(月 Mond), か(火 Feuer), すい(水 Wasser), もく(木 Holz), きん(金 Gold), ど(土 Erde), にち(日 Sonne) + ようび." },
    gatsu: { label: "月", title: "Monate", info: "Monat = Zahl + がつ. Achtung: April = しがつ, Juli = しちがつ, September = くがつ." },
    ji: { label: "時", title: "Uhrzeit (Stunden)", info: "Stunde = Zahl + じ. Achtung: 4 = よじ, 7 = しちじ, 9 = くじ. Halb = はん (z. B. よじはん)." },
    fun: { label: "分", title: "Minuten", info: "Minuten: 1 いっぷん, 3 さんぷん, 4 よんぷん, 6 ろっぷん, 8 はっぷん, 10 じゅっぷん – sonst 〜ふん." },
    num: { label: "123", title: "Zahlen", info: "Zahlen: 100 ひゃく, 300 さんびゃく, 600 ろっぴゃく, 800 はっぴゃく · 1000 せん, 3000 さんぜん, 8000 はっせん · 10.000 いちまん." },
    yen: { label: "円", title: "Preise (〜えん)", info: "Preis = Zahl + えん. Achtung: 4 Yen = よえん (nicht よんえん)." },
    kal: { label: "暦", title: "Kalender: heute, morgen …", info: "先 (せん) = letzte · 今 (こん) = diese · 来 (らい) = nächste. Besondere Wörter: おととい, きのう, きょう, あした, あさって und きょねん, ことし, らいねん. 毎 (まい) = jede/r." },
  };

  // Zeitangaben für die Kalender-Kategorie: [kana, kanji, deutsch, typ, versatz]
  const KAL = [
    ["おととい", "一昨日", "vorgestern", "day", -2], ["きのう", "昨日", "gestern", "day", -1], ["きょう", "今日", "heute", "day", 0],
    ["あした", "明日", "morgen", "day", 1], ["あさって", "明後日", "übermorgen", "day", 2],
    ["せんしゅう", "先週", "letzte Woche", "week", -1], ["こんしゅう", "今週", "diese Woche", "week", 0], ["らいしゅう", "来週", "nächste Woche", "week", 1],
    ["せんげつ", "先月", "letzten Monat", "month", -1], ["こんげつ", "今月", "diesen Monat", "month", 0], ["らいげつ", "来月", "nächsten Monat", "month", 1],
    ["きょねん", "去年", "letztes Jahr", "year", -1], ["ことし", "今年", "dieses Jahr", "year", 0], ["らいねん", "来年", "nächstes Jahr", "year", 1],
    ["まいにち", "毎日", "jeden Tag", "every-day"], ["まいしゅう", "毎週", "jede Woche", "every-week"],
    ["まいつき", "毎月", "jeden Monat", "every-month"], ["まいとし", "毎年", "jedes Jahr", "every-year"],
  ];
  const KAL_ALT = { "まいとし": ["まいとし", "まいねん"], "あした": ["あした", "あす"] };
  const WD = ["月", "火", "水", "木", "金", "土", "日"];

  // Zeichnet einen Kalender und markiert den gesuchten Zeitraum (rot); heute = blauer Ring
  function calendarSVG(type, off) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const R = "#d63a50", P = "#f8d3cd", N = "#273560", W = "#ffffff", G = "#8a90a6";
    let s = `<svg class="cal-svg" viewBox="0 0 168 138">`;
    if (type === "day" || type === "week" || type === "every-day" || type === "every-week") {
      const dow = (today.getDay() + 6) % 7;               // Montag = 0
      const start = new Date(today); start.setDate(today.getDate() - dow - 14);   // 2 Wochen vorher
      s += `<rect x="1" y="1" width="166" height="136" rx="8" fill="${W}" stroke="${N}" stroke-width="2"/>`;
      s += `<rect x="1" y="1" width="166" height="22" rx="8" fill="${R}"/><rect x="1" y="14" width="166" height="9" fill="${R}"/>`;
      s += `<text x="84" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="${W}">${today.getFullYear()}年 ${today.getMonth() + 1}月</text>`;
      WD.forEach((w, i) => { s += `<text x="${16 + i * 22.5}" y="36" text-anchor="middle" font-size="9" fill="${i > 4 ? R : G}">${w}</text>`; });
      for (let r = 0; r < 5; r++) {
        const y = 42 + r * 19;
        if ((type === "week" && r === 2 + off)) s += `<rect x="4" y="${y}" width="160" height="17" rx="4" fill="${P}"/>`;
        for (let c = 0; c < 7; c++) {
          const d = new Date(start); d.setDate(start.getDate() + r * 7 + c);
          const x = 16 + c * 22.5, diff = Math.round((d - today) / 86400000);
          const hit = (type === "day" && diff === off) || type === "every-day" || (type === "every-week" && c === 0);
          if (hit) s += `<circle cx="${x}" cy="${y + 8.5}" r="8.5" fill="${type === "day" ? R : P}"/>`;
          if (diff === 0) s += `<circle cx="${x}" cy="${y + 8.5}" r="8.5" fill="none" stroke="${N}" stroke-width="2"/>`;
          const col = hit && type === "day" ? W : (d.getMonth() === today.getMonth() ? N : G);
          s += `<text x="${x}" y="${y + 12}" text-anchor="middle" font-size="9" font-weight="${diff === 0 ? 700 : 400}" fill="${col}">${d.getDate()}</text>`;
        }
      }
    } else {
      const isYear = type === "year" || type === "every-year";
      for (let i = -1; i <= 1; i++) {
        const x = 8 + (i + 1) * 54, hit = (type === "month" || type === "year") ? i === off : true;
        const d = new Date(today); if (!isYear) d.setMonth(today.getMonth() + i);
        const label = isYear ? (today.getFullYear() + i) + "年" : (d.getMonth() + 1) + "月";
        s += `<rect x="${x}" y="24" width="46" height="90" rx="6" fill="${hit ? P : W}" stroke="${hit ? R : N}" stroke-width="${hit ? 3 : 1.6}"/>`;
        s += `<rect x="${x}" y="24" width="46" height="18" rx="6" fill="${hit ? R : N}"/><rect x="${x}" y="34" width="46" height="8" fill="${hit ? R : N}"/>`;
        s += `<text x="${x + 23}" y="37" text-anchor="middle" font-size="${isYear ? 10 : 11}" font-weight="700" fill="${W}">${label}</text>`;
        if (isYear) for (let m = 0; m < 12; m++) s += `<rect x="${x + 6 + (m % 3) * 12}" y="${50 + Math.floor(m / 3) * 15}" width="10" height="11" rx="2" fill="${hit ? W : "#eef0f6"}"/>`;
        else for (let k = 0; k < 20; k++) s += `<circle cx="${x + 9 + (k % 4) * 9.5}" cy="${52 + Math.floor(k / 4) * 13}" r="2.6" fill="${hit ? W : "#e3e6ef"}"/>`;
        if (i === 0) s += `<circle cx="${x + 23}" cy="126" r="5" fill="none" stroke="${N}" stroke-width="2"/>`;
      }
      s += `<text x="84" y="14" text-anchor="middle" font-size="10" fill="${G}">${isYear ? "Jahre" : "Monate"}</text>`;
    }
    return s + `</svg><div class="cal-legend"><span class="ring"></span> = heute / jetzt <span class="mark"></span> = gesucht</div>`;
  }

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
  const pic = id => `<svg class="cnt-ic"><use href="#${id}"/></svg>`;
  const head = id => `<div class="cnt-head">${pic(id)}</div>`;

  // Folgen für „der Reihe nach“
  const SEQ = {
    sai: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20], hi: Array.from({ length: 31 }, (_, i) => i + 1), youbi: [0, 1, 2, 3, 4, 5, 6],
    gatsu: Array.from({ length: 12 }, (_, i) => i + 1), ji: Array.from({ length: 12 }, (_, i) => i + 1),
    fun: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30], num: [10, 11, 20, 100, 300, 600, 800, 1000, 3000, 8000, 10000],
    yen: [4, 10, 100, 300, 600, 800, 1000, 3000, 8000, 10000], kal: KAL.map((_, i) => i),
  };
  function seqLength(cat) { return C[cat] ? 10 : (SEQ[cat] || []).length; }

  // Erzeugt eine Frage. k = Position in der Reihenfolge (oder undefined = zufällig)
  function makeQuestion(cat, k) {
    const ordered = k !== undefined && k !== null;
    if (C[cat]) {
      const c = C[cat], n = ordered ? k + 1 : rnd(1, 10), item = ordered ? c.items[k % c.items.length] : pick(c.items);
      const answers = arr(c.forms[n - 1]);
      const style = ordered || Math.random() < 0.65 ? "pic" : "num";
      const prompt = style === "pic" ? `<div class="cnt-grid">${Array(n).fill(pic(item[0])).join("")}</div>` : `<div class="big-num">${n}${c.label}</div>`;
      const sub = style === "pic" ? `${item[1]}（${item[2]}） – wie viele?` : `Wie liest man das?`;
      const wrong = [];
      if (n <= 9 || cat !== "tsu") wrong.push((n === 10 ? "じゅう" : D[n]) + c.base);
      for (const j of [n - 1, n + 1]) if (j >= 1 && j <= 10) wrong.push(arr(c.forms[j - 1])[0]);
      const other = C[pick(Object.keys(C).filter(x => x !== cat))];
      wrong.push(arr(other.forms[n - 1])[0]);
      return { cat, prompt, sub, answers, wrong, info: c.info, icon: c.items[0][0], table: c.forms.map((f, i) => [(i + 1) + c.label, arr(f).join(" / "), i + 1]) };
    }
    if (cat === "sai") {
      const n = ordered ? SEQ.sai[k] : (Math.random() < 0.6 ? rnd(1, 10) : pick([18, 20, 20, 25, 30, 38, 40, 41, 48, 60]));
      return { cat, prompt: head("c-cakebday") + `<div class="big-num">${n}歳</div>`, sub: "Wie alt?", answers: saiReading(n),
        wrong: [numReading(n) + "さい", ...(n > 1 ? saiReading(n - 1) : []).slice(0, 1), ...saiReading(n + 1).slice(0, 1)], info: SPECIAL.sai.info, icon: "c-cakebday",
        table: SEQ.sai.map(i => [i + "歳", saiReading(i).join(" / ")]) };
    }
    if (cat === "hi") {
      const n = ordered ? SEQ.hi[k] : (Math.random() < 0.6 ? rnd(1, 10) : pick([14, 20, 24, rnd(11, 31)]));
      return { cat, prompt: head("s-calendar") + `<div class="big-num">${n}日</div>`, sub: `der ${n}. (Datum)`, answers: [HI[n]],
        wrong: [numReading(n) + "にち", HI[n === 31 ? 30 : n + 1], HI[n === 1 ? 2 : n - 1]], info: SPECIAL.hi.info, icon: "s-calendar",
        table: HI.slice(1).map((h, i) => [(i + 1) + "日", h]) };
    }
    if (cat === "youbi") {
      const i = ordered ? k : rnd(0, 6), y = YOUBI[i];
      return { cat, prompt: head("c-daynight") + `<div class="big-num small">${y[2]}</div>`, sub: `${y[1]} – wie heisst der Tag?`, answers: [y[0]],
        wrong: YOUBI.filter((_, j) => j !== i).map(x => x[0]), info: SPECIAL.youbi.info, icon: "c-daynight", table: YOUBI.map(x => [x[2] + " " + x[1], x[0]]) };
    }
    if (cat === "gatsu") {
      const n = ordered ? k + 1 : rnd(1, 12);
      return { cat, prompt: head("c-twelve") + `<div class="big-num">${n}月</div>`, sub: MONTHS_DE[n], answers: [GATSU[n]],
        wrong: [numReading(n) + "がつ", GATSU[n === 12 ? 11 : n + 1], GATSU[n === 1 ? 2 : n - 1]], info: SPECIAL.gatsu.info, icon: "c-twelve",
        table: GATSU.slice(1).map((g, i) => [(i + 1) + "月 " + MONTHS_DE[i + 1], g]) };
    }
    if (cat === "ji") {
      const n = ordered ? k + 1 : rnd(1, 12), half = !ordered && Math.random() < 0.3;
      return { cat, prompt: head("i-clock") + `<div class="big-num">${n}時${half ? "半" : ""}</div>`, sub: half ? `halb ${n === 12 ? 1 : n + 1} (${n}:30)` : `${n} Uhr`,
        answers: [JI[n] + (half ? "はん" : "")], wrong: [numReading(n) + "じ" + (half ? "はん" : ""), JI[n === 12 ? 11 : n + 1] + (half ? "はん" : ""), JI[n === 1 ? 2 : n - 1] + (half ? "はん" : "")],
        info: SPECIAL.ji.info, icon: "i-clock", table: JI.slice(1).map((j, i) => [(i + 1) + "時", j]) };
    }
    if (cat === "fun") {
      const n = ordered ? SEQ.fun[k] : (Math.random() < 0.5 ? rnd(1, 10) : rnd(11, 59));
      const n2 = n === 59 ? 58 : n + 1;
      return { cat, prompt: head("c-stopwatch") + `<div class="big-num">${n}分</div>`, sub: `${n} Minuten`, answers: fun(n),
        wrong: [numReading(n) + "ふん", numReading(n) + "ぷん", fun(n2)[0]], info: SPECIAL.fun.info, icon: "c-stopwatch",
        table: SEQ.fun.map(i => [i + "分", fun(i).join(" / ")]) };
    }
    if (cat === "num") {
      const n = ordered ? SEQ.num[k] : pick([rnd(11, 99), rnd(100, 999), rnd(100, 999), rnd(1000, 9999), rnd(10000, 99999), pick([300, 600, 800, 3000, 8000, 1000, 10000])]);
      const ans = numAlts(n);
      const wrong = [ans[0].replace("びゃく", "ひゃく").replace("ぴゃく", "ひゃく").replace("ぜん", "せん").replace("っせん", "ちせん"), numReading(n + 1), numReading(n + 10), numReading(n + 100)];
      return { cat, prompt: `<div class="big-num">${n.toLocaleString("de-DE")}</div>`, sub: "Wie liest man die Zahl?", answers: ans, wrong, info: SPECIAL.num.info, icon: "c-zero",
        table: SEQ.num.map(v => [v.toLocaleString("de-DE"), numReading(v)]) };
    }
    if (cat === "yen") {
      const n = ordered ? SEQ.yen[k] : pick([rnd(1, 9) * 100, rnd(1, 9) * 1000 + rnd(0, 9) * 100, rnd(100, 999), 4, 14, 104, rnd(1, 9) * 10000, 350, 1500, 2800]);
      return { cat, prompt: head("c-banknote") + `<div class="big-num">¥${n.toLocaleString("de-DE")}</div>`, sub: "Wie viel kostet es?", answers: [yen(n)],
        wrong: [numReading(n) + "えん", yen(n + 100), yen(n > 100 ? n - 100 : n + 10)], info: SPECIAL.yen.info, icon: "c-banknote",
        table: SEQ.yen.map(v => ["¥" + v.toLocaleString("de-DE"), yen(v)]) };
    }
    if (cat === "kal") {
      const i = ordered ? k : rnd(0, KAL.length - 1), e = KAL[i];
      const same = KAL.filter((x, j) => j !== i && (x[3] === e[3] || x[3].split("-")[0] === e[3].split("-")[0] || x[3].includes(e[3]) || e[3].includes(x[3])));
      const wrong = [...same, ...KAL.filter((_, j) => j !== i)].map(x => x[0]);
      return { cat, prompt: calendarSVG(e[3], e[4]), sub: "Was ist rot markiert?", answers: KAL_ALT[e[0]] || [e[0]], wrong: [...new Set(wrong)].slice(0, 6),
        info: SPECIAL.kal.info, note: `${e[1]} – ${e[2]}`, icon: "s-calendar", table: KAL.map(x => [x[2] + " · " + x[1], (KAL_ALT[x[0]] || [x[0]]).join(" / ")]) };
    }
  }

  // Bilder für die Kategorien ohne Zählgegenstand
  const SPECIAL_ICON = { sai: "c-cakebday", hi: "s-calendar", youbi: "c-daynight", gatsu: "c-twelve", ji: "i-clock", fun: "c-stopwatch", num: "c-zero", yen: "c-banknote" };
  const CATEGORIES = [
    ...Object.entries(C).map(([k, c]) => ({ id: k, label: c.label, title: c.title, icon: c.items[0][0] })),
    ...Object.entries(SPECIAL).filter(([k]) => k !== "kal").map(([k, c]) => ({ id: k, label: c.label, title: c.title, icon: SPECIAL_ICON[k] })),
  ];
  window.Counters = { CATEGORIES, makeQuestion, numReading, seqLength, calendarSVG, HI, GATSU, YOUBI, MONTHS_DE };
})();
