// Zeichen zum Schreibenüben.
// Kanji: [Zeichen, kun-Lesung (hiragana), on-Lesung (katakana), Deutsch]
(function () {
  const H = "あ a,い i,う u,え e,お o,か ka,き ki,く ku,け ke,こ ko,さ sa,し shi,す su,せ se,そ so,た ta,ち chi,つ tsu,て te,と to,な na,に ni,ぬ nu,ね ne,の no,は ha,ひ hi,ふ fu,へ he,ほ ho,ま ma,み mi,む mu,め me,も mo,や ya,ゆ yu,よ yo,ら ra,り ri,る ru,れ re,ろ ro,わ wa,を wo (o),ん n";
  const hira = H.split(",").map(x => x.split(" "));
  const kata = hira.map(([c, r]) => [String.fromCharCode(c.charCodeAt(0) + 0x60), r]);
  const rows = { a: "あいうえお", ka: "かきくけこ", sa: "さしすせそ", ta: "たちつてと", na: "なにぬねの", ha: "はひふへほ", ma: "まみむめも", ya: "やゆよ", ra: "らりるれろ", wa: "わをん" };

  const K = [
    // Zahlen
    ["一", "ひと(つ)", "イチ", "eins", "zahl"], ["二", "ふた(つ)", "ニ", "zwei", "zahl"], ["三", "みっ(つ)", "サン", "drei", "zahl"],
    ["四", "よ(ん)・よっ(つ)", "シ", "vier", "zahl"], ["五", "いつ(つ)", "ゴ", "fünf", "zahl"], ["六", "むっ(つ)", "ロク", "sechs", "zahl"],
    ["七", "なな(つ)", "シチ", "sieben", "zahl"], ["八", "やっ(つ)", "ハチ", "acht", "zahl"], ["九", "ここの(つ)", "キュウ・ク", "neun", "zahl"],
    ["十", "とお", "ジュウ", "zehn", "zahl"], ["百", "", "ヒャク", "hundert", "zahl"], ["千", "", "セン", "tausend", "zahl"],
    ["万", "", "マン", "zehntausend", "zahl"], ["円", "", "エン", "Yen, Kreis", "zahl"],
    // Zeit & Tage
    ["日", "ひ・か", "ニチ・ジツ", "Tag, Sonne", "zeit"], ["月", "つき", "ゲツ・ガツ", "Mond, Monat", "zeit"], ["火", "ひ", "カ", "Feuer", "zeit"],
    ["水", "みず", "スイ", "Wasser", "zeit"], ["木", "き", "モク", "Baum", "zeit"], ["金", "かね", "キン", "Gold, Geld", "zeit"],
    ["土", "つち", "ド", "Erde", "zeit"], ["曜", "", "ヨウ", "Wochentag", "zeit"], ["時", "とき", "ジ", "Zeit, Uhr", "zeit"],
    ["分", "わ(かる)", "フン・ブン", "Minute, teilen", "zeit"], ["半", "なか(ば)", "ハン", "halb", "zeit"], ["午", "", "ゴ", "Mittag", "zeit"],
    ["前", "まえ", "ゼン", "vor, früher", "zeit"], ["後", "あと・うし(ろ)", "ゴ・コウ", "nach, hinter", "zeit"], ["今", "いま", "コン", "jetzt", "zeit"],
    ["年", "とし", "ネン", "Jahr", "zeit"], ["週", "", "シュウ", "Woche", "zeit"], ["毎", "", "マイ", "jeder", "zeit"],
    ["何", "なに・なん", "カ", "was", "zeit"],
    // Menschen
    ["人", "ひと", "ジン・ニン", "Mensch", "mensch"], ["父", "ちち", "フ", "Vater", "mensch"], ["母", "はは", "ボ", "Mutter", "mensch"],
    ["子", "こ", "シ", "Kind", "mensch"], ["男", "おとこ", "ダン", "Mann", "mensch"], ["女", "おんな", "ジョ", "Frau", "mensch"],
    ["友", "とも", "ユウ", "Freund", "mensch"], ["家", "いえ・うち", "カ", "Haus, Familie", "mensch"], ["族", "", "ゾク", "Familie, Stamm", "mensch"],
    ["名", "な", "メイ", "Name", "mensch"], ["国", "くに", "コク", "Land", "mensch"], ["語", "", "ゴ", "Sprache", "mensch"],
    ["学", "まな(ぶ)", "ガク", "lernen", "mensch"], ["生", "い(きる)", "セイ", "Leben, geboren", "mensch"], ["先", "さき", "セン", "voraus", "mensch"],
    ["本", "もと", "ホン", "Buch, Ursprung", "mensch"],
    // Orte & Richtungen
    ["山", "やま", "サン", "Berg", "ort"], ["川", "かわ", "セン", "Fluss", "ort"], ["田", "た", "デン", "Reisfeld", "ort"],
    ["中", "なか", "チュウ", "Mitte, innen", "ort"], ["上", "うえ", "ジョウ", "oben", "ort"], ["下", "した", "カ", "unten", "ort"],
    ["右", "みぎ", "ウ", "rechts", "ort"], ["左", "ひだり", "サ", "links", "ort"], ["外", "そと", "ガイ", "draussen", "ort"],
    ["東", "ひがし", "トウ", "Osten", "ort"], ["西", "にし", "セイ", "Westen", "ort"], ["南", "みなみ", "ナン", "Süden", "ort"],
    ["北", "きた", "ホク", "Norden", "ort"], ["駅", "", "エキ", "Bahnhof", "ort"], ["店", "みせ", "テン", "Laden", "ort"],
    ["屋", "や", "オク", "Laden, Dach", "ort"], ["会", "あ(う)", "カイ", "treffen", "ort"], ["社", "", "シャ", "Firma, Schrein", "ort"],
    ["電", "", "デン", "Elektrizität", "ort"], ["車", "くるま", "シャ", "Auto, Wagen", "ort"],
    // Verben
    ["行", "い(く)", "コウ", "gehen", "verb"], ["来", "く(る)・き(ます)", "ライ", "kommen", "verb"], ["見", "み(る)", "ケン", "sehen", "verb"],
    ["聞", "き(く)", "ブン", "hören", "verb"], ["読", "よ(む)", "ドク", "lesen", "verb"], ["書", "か(く)", "ショ", "schreiben", "verb"],
    ["話", "はな(す)", "ワ", "sprechen", "verb"], ["言", "い(う)", "ゲン", "sagen", "verb"], ["食", "た(べる)", "ショク", "essen", "verb"],
    ["飲", "の(む)", "イン", "trinken", "verb"], ["買", "か(う)", "バイ", "kaufen", "verb"], ["休", "やす(む)", "キュウ", "ausruhen", "verb"],
    ["入", "はい(る)", "ニュウ", "hineingehen", "verb"], ["出", "で(る)", "シュツ", "hinausgehen", "verb"], ["起", "お(きる)", "キ", "aufstehen", "verb"],
    ["寝", "ね(る)", "シン", "schlafen", "verb"], ["好", "す(き)", "コウ", "mögen", "verb"],
    // Eigenschaften & Farben
    ["大", "おお(きい)", "ダイ", "gross", "adj"], ["小", "ちい(さい)", "ショウ", "klein", "adj"], ["高", "たか(い)", "コウ", "hoch, teuer", "adj"],
    ["安", "やす(い)", "アン", "billig", "adj"], ["新", "あたら(しい)", "シン", "neu", "adj"], ["古", "ふる(い)", "コ", "alt", "adj"],
    ["白", "しろ", "ハク", "weiss", "adj"], ["赤", "あか", "セキ", "rot", "adj"], ["青", "あお", "セイ", "blau", "adj"],
    ["黒", "くろ", "コク", "schwarz", "adj"], ["楽", "たの(しい)", "ガク・ラク", "Freude, Musik", "adj"],
    // Dinge & Natur
    ["天", "", "テン", "Himmel", "ding"], ["気", "", "キ", "Geist, Energie", "ding"], ["雨", "あめ", "ウ", "Regen", "ding"],
    ["花", "はな", "カ", "Blume", "ding"], ["犬", "いぬ", "ケン", "Hund", "ding"], ["猫", "ねこ", "ビョウ", "Katze", "ding"],
    ["魚", "さかな", "ギョ", "Fisch", "ding"], ["肉", "", "ニク", "Fleisch", "ding"], ["茶", "", "チャ", "Tee", "ding"],
    ["写", "うつ(す)", "シャ", "abbilden", "ding"], ["真", "ま", "シン", "wahr, echt", "ding"], ["映", "うつ(る)", "エイ", "spiegeln", "ding"],
    ["画", "", "ガ", "Bild", "ding"], ["音", "おと", "オン", "Ton, Klang", "ding"],
    // ergänzt aus der JLPT-N5-Liste
    ["長", "なが(い)", "チョウ", "lang; Chef", "adj"], ["校", "", "コウ", "Schule", "mensch"], ["間", "あいだ・ま", "カン・ケン", "Zwischenraum, Zeitspanne", "zeit"],
  ];

  const SETS = [
    { id: "hira", name: "Hiragana", kind: "kana", chars: hira.map(([c, r]) => ({ c, r })) },
    { id: "kata", name: "Katakana", kind: "kana", chars: kata.map(([c, r]) => ({ c, r })) },
    ...[["zahl", "Kanji: Zahlen & Geld"], ["zeit", "Kanji: Zeit & Wochentage"], ["mensch", "Kanji: Menschen & Lernen"],
      ["ort", "Kanji: Orte & Richtungen"], ["verb", "Kanji: Verben"], ["adj", "Kanji: Eigenschaften & Farben"], ["ding", "Kanji: Dinge & Natur"]]
      .map(([id, name]) => ({ id, name, kind: "kanji", chars: K.filter(k => k[4] === id).map(([c, kun, on, de]) => ({ c, kun, on, de })) })),
    // alle 79 Kanji der JLPT-Stufe N5 in einer Gruppe
    { id: "n5", name: "Kanji: alle JLPT N5 (79)", kind: "kanji", chars: [..."一二三四五六七八九十百千万円人入上下大女子山川土小中今天木火水父午日月友白出半生左右外本北母先名年行西毎休気何男車見来国学金長東雨後前食南書時校高間話電語読聞"].map(c => K.find(k => k[0] === c)).filter(Boolean).map(([c, kun, on, de]) => ({ c, kun, on, de })) },
  ];
  window.KanjiData = { SETS, rows };
})();
