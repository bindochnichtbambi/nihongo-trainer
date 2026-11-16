// Daten für die Spiele (alles selbst zusammengestellt, A1-Niveau)
(function () {
  // ---------- Kana-Regen ----------
  const H_BASIC = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
  const H_DAKU = "がぎぐげござじずぜぞだでどばびぶべぼぱぴぷぺぽ";
  const H_YOUON = ["きゃ", "きゅ", "きょ", "しゃ", "しゅ", "しょ", "ちゃ", "ちゅ", "ちょ", "にゃ", "にゅ", "にょ", "ひゃ", "ひゅ", "ひょ", "みゃ", "みゅ", "みょ", "りゃ", "りゅ", "りょ", "ぎゃ", "ぎゅ", "ぎょ", "じゃ", "じゅ", "じょ", "びゃ", "びゅ", "びょ"];
  const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  // leicht verwechselbare Zeichen – kommen gern als falsche Antwort
  const CONFUSE = {
    "シ": "ツ", "ツ": "シ", "ソ": "ン", "ン": "ソ", "ク": "タ", "タ": "ク", "ワ": "ウ", "ウ": "ワ", "ヌ": "ス", "ス": "ヌ",
    "チ": "テ", "テ": "チ", "コ": "ユ", "ユ": "コ", "マ": "ア", "ア": "マ", "ナ": "メ", "メ": "ナ", "ロ": "コ", "ケ": "ク",
    "ぬ": "め", "め": "ぬ", "ね": "れ", "れ": "わ", "わ": "ね", "る": "ろ", "ろ": "る", "さ": "き", "き": "さ", "い": "り", "り": "い",
    "は": "ほ", "ほ": "は", "あ": "お", "お": "あ",
  };
  window.RAIN = {
    levels(script) {          // je Stufe kommen mehr Zeichen dazu
      const conv = script === "kata" ? toKata : (s => s);
      const split = s => [...s];
      const base = split(H_BASIC), daku = split(H_DAKU);
      const mk = arr => arr.map(conv);
      if (script === "mix") return [[...base, ...base.map(toKata)], [...daku, ...daku.map(toKata)], [...H_YOUON, ...H_YOUON.map(toKata)]];
      return [mk(base), mk(daku), mk(H_YOUON)];
    },
    CONFUSE,
  };

  // ---------- Sushi-Band ----------
  // [kana, kanji, deutsch]
  window.SUSHI_CATS = [
    { id: "essen", title: "Essen & Trinken", items: [["すし", "寿司", "Sushi"], ["ごはん", "ご飯", "Reis, Mahlzeit"], ["パン", "", "Brot"], ["ラーメン", "", "Ramen"], ["てんぷら", "天ぷら", "Tempura"], ["さかな", "魚", "Fisch"], ["にく", "肉", "Fleisch"], ["やさい", "野菜", "Gemüse"], ["くだもの", "果物", "Obst"], ["りんご", "", "Apfel"], ["たまご", "卵", "Ei"], ["みず", "水", "Wasser"], ["おちゃ", "お茶", "Tee"], ["コーヒー", "", "Kaffee"], ["ぎゅうにゅう", "牛乳", "Milch"], ["ジュース", "", "Saft"], ["ビール", "", "Bier"], ["ケーキ", "", "Kuchen"], ["うどん", "", "Udon"], ["カレー", "", "Curry"]] },
    { id: "tiere", title: "Tiere", items: [["いぬ", "犬", "Hund"], ["ねこ", "猫", "Katze"], ["とり", "鳥", "Vogel"], ["うま", "馬", "Pferd"], ["うし", "牛", "Kuh"], ["ぶた", "豚", "Schwein"], ["さる", "猿", "Affe"], ["くま", "熊", "Bär"], ["ぞう", "象", "Elefant"], ["パンダ", "", "Panda"], ["うさぎ", "", "Hase"], ["ねずみ", "", "Maus"], ["かえる", "", "Frosch"]] },
    { id: "verben", title: "Tätigkeiten (Verben)", items: [["たべます", "食べます", "essen"], ["のみます", "飲みます", "trinken"], ["みます", "見ます", "sehen"], ["ききます", "聞きます", "hören"], ["よみます", "読みます", "lesen"], ["かきます", "書きます", "schreiben"], ["いきます", "行きます", "gehen"], ["きます", "来ます", "kommen"], ["かえります", "帰ります", "heimgehen"], ["ねます", "寝ます", "schlafen"], ["おきます", "起きます", "aufstehen"], ["はたらきます", "働きます", "arbeiten"], ["およぎます", "泳ぎます", "schwimmen"], ["かいます", "買います", "kaufen"]] },
    { id: "orte", title: "Orte in der Stadt", items: [["えき", "駅", "Bahnhof"], ["ぎんこう", "銀行", "Bank"], ["びょういん", "病院", "Spital"], ["がっこう", "学校", "Schule"], ["こうえん", "公園", "Park"], ["スーパー", "", "Supermarkt"], ["コンビニ", "", "Konbini"], ["レストラン", "", "Restaurant"], ["としょかん", "図書館", "Bibliothek"], ["ゆうびんきょく", "郵便局", "Post"], ["ホテル", "", "Hotel"], ["くうこう", "空港", "Flughafen"]] },
    { id: "familie", title: "Familie", items: [["ちち", "父", "(mein) Vater"], ["はは", "母", "(meine) Mutter"], ["あに", "兄", "älterer Bruder"], ["あね", "姉", "ältere Schwester"], ["おとうと", "弟", "jüngerer Bruder"], ["いもうと", "妹", "jüngere Schwester"], ["おっと", "夫", "Ehemann"], ["つま", "妻", "Ehefrau"], ["むすこ", "息子", "Sohn"], ["むすめ", "娘", "Tochter"], ["そふ", "祖父", "Grossvater"], ["そぼ", "祖母", "Grossmutter"]] },
    { id: "kleider", title: "Kleidung", items: [["シャツ", "", "Hemd"], ["ズボン", "", "Hose"], ["スカート", "", "Rock"], ["くつ", "靴", "Schuhe"], ["ぼうし", "帽子", "Hut"], ["セーター", "", "Pullover"], ["コート", "", "Mantel"], ["くつした", "靴下", "Socken"], ["てぶくろ", "手袋", "Handschuhe"], ["マフラー", "", "Schal"], ["ネクタイ", "", "Krawatte"], ["ゆかた", "浴衣", "Yukata"]] },
    { id: "farben", title: "Farben", items: [["あか", "赤", "Rot"], ["あお", "青", "Blau"], ["しろ", "白", "Weiss"], ["くろ", "黒", "Schwarz"], ["きいろ", "黄色", "Gelb"], ["みどり", "緑", "Grün"], ["ちゃいろ", "茶色", "Braun"], ["ピンク", "", "Rosa"], ["オレンジ", "", "Orange"], ["グレー", "", "Grau"], ["むらさき", "紫", "Violett"]] },
    { id: "adj", title: "Eigenschaften (Adjektive)", items: [["おおきい", "大きい", "gross"], ["ちいさい", "小さい", "klein"], ["たかい", "高い", "teuer, hoch"], ["やすい", "安い", "billig"], ["あたらしい", "新しい", "neu"], ["ふるい", "古い", "alt"], ["おいしい", "", "lecker"], ["たのしい", "楽しい", "lustig"], ["さむい", "寒い", "kalt"], ["あつい", "暑い", "heiss"], ["しずか", "静か", "ruhig"], ["きれい", "", "schön, sauber"], ["げんき", "元気", "munter"], ["ゆうめい", "有名", "berühmt"]] },
    { id: "zeit", title: "Zeitwörter", items: [["きょう", "今日", "heute"], ["あした", "明日", "morgen"], ["きのう", "昨日", "gestern"], ["あさ", "朝", "Morgen"], ["ひる", "昼", "Mittag"], ["よる", "夜", "Abend, Nacht"], ["まいにち", "毎日", "jeden Tag"], ["らいしゅう", "来週", "nächste Woche"], ["せんしゅう", "先週", "letzte Woche"], ["ことし", "今年", "dieses Jahr"], ["らいねん", "来年", "nächstes Jahr"], ["しゅうまつ", "週末", "Wochenende"], ["ごご", "午後", "Nachmittag"]] },
    { id: "natur", title: "Natur & Wetter", items: [["あめ", "雨", "Regen"], ["ゆき", "雪", "Schnee"], ["はれ", "晴れ", "sonnig"], ["くもり", "曇り", "bewölkt"], ["かぜ", "風", "Wind"], ["やま", "山", "Berg"], ["うみ", "海", "Meer"], ["かわ", "川", "Fluss"], ["はな", "花", "Blume"], ["き", "木", "Baum"], ["そら", "空", "Himmel"], ["ほし", "星", "Stern"]] },
  ];

  // ---------- Satz-Puzzle ----------
  // { l: Lektion, k: Kana-Teile, j: Kanji-Teile (gleich viele), de, alt: weitere richtige Reihenfolgen (Indexlisten) }
  const S = (l, k, j, de, alt) => ({ l, k: k.split("/"), j: (j || k).split("/"), de, alt: alt || [] });
  window.PUZZLES = [
    S(1, "わたし/は/スイスじん/です", "私/は/スイス人/です", "Ich bin Schweizer/in."),
    S(1, "これ/は/なん/です/か", "これ/は/何/です/か", "Was ist das?"),
    S(2, "たなかさん/は/にほんじん/です/か", "田中さん/は/日本人/です/か", "Ist Herr/Frau Tanaka Japaner/in?"),
    S(2, "わたし/の/なまえ/は/ゆき/です", "私/の/名前/は/ゆき/です", "Mein Name ist Yuki."),
    S(3, "かぞく/は/よにん/です", "家族/は/4人/です", "Meine Familie hat vier Personen."),
    S(3, "あに/が/ふたり/います", "兄/が/2人/います", "Ich habe zwei ältere Brüder."),
    S(4, "えいご/が/すこし/わかります", "英語/が/少し/分かります", "Ich verstehe ein bisschen Englisch."),
    S(4, "ねこ/が/すき/です", "猫/が/好き/です", "Ich mag Katzen."),
    S(5, "わたし/は/すし/を/たべます", "私/は/寿司/を/食べます", "Ich esse Sushi."),
    S(5, "あさ/コーヒー/を/のみます", "朝/コーヒー/を/飲みます", "Morgens trinke ich Kaffee."),
    S(6, "にく/は/あまり/たべません", "肉/は/あまり/食べません", "Fleisch esse ich nicht so oft."),
    S(6, "なに/が/すき/です/か", "何/が/好き/です/か", "Was magst du (gern)?"),
    S(6, "ラーメン/を/ください", "", "Ramen, bitte."),
    S(7, "へや/に/ベッド/が/あります", "部屋/に/ベッド/が/あります", "Im Zimmer gibt es ein Bett."),
    S(7, "いぬ/は/にわ/に/います", "犬/は/庭/に/います", "Der Hund ist im Garten."),
    S(8, "わたし/の/いえ/は/ふるい/です", "私/の/家/は/古い/です", "Mein Haus ist alt."),
    S(8, "つくえ/の/うえ/に/ほん/が/あります", "机/の/上/に/本/が/あります", "Auf dem Tisch liegt ein Buch."),
    S(9, "まいあさ/ろくじ/に/おきます", "毎朝/6時/に/起きます", "Ich stehe jeden Morgen um 6 Uhr auf."),
    S(9, "でんしゃ/で/かいしゃ/に/いきます", "電車/で/会社/に/行きます", "Ich fahre mit dem Zug zur Firma.", [[2, 3, 0, 1, 4]]),
    S(10, "よる/テレビ/を/みます", "夜/テレビ/を/見ます", "Abends schaue ich fern."),
    S(10, "きのう/としょかん/で/べんきょう/しました", "昨日/図書館/で/勉強/しました", "Gestern habe ich in der Bibliothek gelernt."),
    S(10, "にちようび/は/やすみ/です", "日曜日/は/休み/です", "Am Sonntag habe ich frei."),
    S(11, "わたし/の/しゅみ/は/りょこう/です", "私/の/趣味/は/旅行/です", "Mein Hobby ist Reisen."),
    S(11, "いっしょに/えいが/を/みません/か", "一緒に/映画/を/見ません/か", "Wollen wir zusammen einen Film schauen?"),
    S(12, "しゅうまつ/に/テニス/を/しました", "週末/に/テニス/を/しました", "Am Wochenende habe ich Tennis gespielt."),
    S(12, "コンサート/は/たのしかった/です", "コンサート/は/楽しかった/です", "Das Konzert hat Spass gemacht."),
    S(12, "どようび/に/ともだち/と/カラオケ/に/いきます", "土曜日/に/友達/と/カラオケ/に/行きます", "Am Samstag gehe ich mit Freunden zum Karaoke.", [[2, 3, 0, 1, 4, 5, 6]]),
    S(13, "えき/は/どこ/です/か", "駅/は/どこ/です/か", "Wo ist der Bahnhof?"),
    S(13, "バス/で/びょういん/に/いきます", "バス/で/病院/に/行きます", "Ich fahre mit dem Bus ins Spital.", [[2, 3, 0, 1, 4]]),
    S(14, "つぎ/の/しんごう/を/みぎ/に/まがって/ください", "次/の/信号/を/右/に/曲がって/ください", "Biegen Sie an der nächsten Ampel rechts ab."),
    S(15, "この/かばん/は/いくら/です/か", "この/かばん/は/いくら/です/か", "Wie viel kostet diese Tasche?"),
    S(16, "あかい/セーター/が/ほしい/です", "赤い/セーター/が/欲しい/です", "Ich möchte einen roten Pullover."),
    S(17, "なつやすみ/に/きょうと/に/いきました", "夏休み/に/京都/に/行きました", "In den Sommerferien bin ich nach Kyoto gefahren."),
    S(18, "ふじさん/に/のぼりたい/です", "富士山/に/登りたい/です", "Ich möchte den Fuji besteigen."),
    S(18, "やすみ/は/どう/でした/か", "休み/は/どう/でした/か", "Wie waren die Ferien?"),
  ];
})();
